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
  MODEL_CALL_ACTIONS,
  PLANNING_ACTION_LABELS,
  arrayValue,
  deliveryRiskRepairPayload,
  firstText,
  normalizePlanningActionKey,
  opsAction,
  planningAction,
  text,
  writingAction,
  writingReadinessIssue,
} from './helpers-basics'

export function buildCanonRunway(writing: WritingCockpitModel): AutoCreationCanonRunway {
  const staleState = writingReadinessIssue(writing, 'story_state_stale')
  const memoryUnavailable = writingReadinessIssue(writing, 'memory_unavailable')
  if (staleState) {
    return {
      status: 'block',
      label: '长线记忆',
      detail: [
        `${text(staleState.label, '故事状态可能滞后')}：${text(staleState.detail, '建议同步最近已写章节的状态机。')}`,
        memoryUnavailable ? `${text(memoryUnavailable.label, '记忆摘要不可用')}：${text(memoryUnavailable.detail, '缺少可引用的记忆事实。')}` : '',
      ].filter(Boolean).join('；'),
      action: writingAction('update_canon', '先同步故事状态，确保正史、剧情线和长期设定与已写章节对齐。', '同步故事状态'),
      staleState: true,
      memoryUnavailable: Boolean(memoryUnavailable),
    }
  }
  if (memoryUnavailable) {
    return {
      status: 'warn',
      label: '长线记忆',
      detail: `${text(memoryUnavailable.label, '记忆摘要不可用')}：${text(memoryUnavailable.detail, '缺少可引用的记忆事实。')} 本轮只建议单章推进，并先修复连续性材料。`,
      action: writingAction('fix_continuity', '补齐长期记忆摘要和连续性事实后，再扩大安全连写批次。', '修复连续性'),
      staleState: false,
      memoryUnavailable: true,
    }
  }
  return {
    status: 'ok',
    label: '长线记忆',
    detail: '故事状态与长期记忆均可支撑连续生产。',
    action: writingAction('fix_continuity', '长线记忆状态正常，无需修复。', '修复连续性'),
    staleState: false,
    memoryUnavailable: false,
  }
}

export function targetChapter(writing: WritingCockpitModel): AutoCreationDirectorModel['targetChapter'] {
  const chapter = writing.nextChapter
  if (!chapter) return null
  return {
    id: chapter.id,
    chapterNo: Number(chapter.chapterNo || 0),
    title: text(chapter.title, '未命名章节'),
    wordCount: Number(chapter.wordCount || 0),
    hasProse: Boolean(chapter.hasProse),
  }
}

export function taskLabel(task: AnyRecord) {
  return text(task?.type_label || task?.run_type || task?.step_name || task?.status, '运行中任务')
}

export function hasRunningTasks(tasks: AnyRecord[]) {
  return tasks.some(task => ['queued', 'ready', 'paused', 'running'].includes(text(task?.status)))
}

export function planningBlocker(planning: PlanningWorkspaceModel) {
  const critical = arrayValue(planning.healthIssues).find(issue => issue?.severity === 'critical')
  if (critical) {
    return {
      title: text(critical.title, '长线规划需要补齐'),
      actionKey: (critical.actionKey || 'update_rolling_plan') as PlanningActionKey,
      detail: text(critical.detail, '先补齐长篇生产前置规划。'),
    }
  }
  if (planning.topStatus.longformHealth.status === 'needs_planning') {
    return {
      title: '长线规划需要补齐',
      actionKey: 'update_rolling_plan' as PlanningActionKey,
      detail: text(planning.topStatus.future10Coverage.label, '先补齐未来十章规划。'),
    }
  }
  return null
}

export function retentionNeedsAction(planning: PlanningWorkspaceModel) {
  const retention = planning.first30Retention
  return retention.status === 'missing'
    || retention.status === 'stale'
    || retention.status === 'blocked'
    || retention.status === 'needs_repair'
}

export function storylineNeedsAction(planning: PlanningWorkspaceModel) {
  return planning.storylineBoard.status === 'missing' || planning.storylineBoard.status === 'needs_attention'
}

export function characterArcNeedsAction(planning: PlanningWorkspaceModel) {
  return Boolean(planning.characterArcBoard && planning.characterArcBoard.status === 'needs_attention')
}

export function rhythmNeedsAction(planning: PlanningWorkspaceModel) {
  return Boolean(planning.longformRhythm && planning.longformRhythm.status !== 'ready')
}

export function volumeBeatNeedsAction(planning: PlanningWorkspaceModel) {
  return Boolean(planning.volumeBeatBudget && planning.volumeBeatBudget.status !== 'ready')
}

export function rhythmAction(planning: PlanningWorkspaceModel): PlanningActionKey {
  const signal = planning.longformRhythm?.signals?.find(item => item.status === 'block')
    || planning.longformRhythm?.signals?.find(item => item.status === 'warn')
  return (signal?.actionKey || 'longform_pressure') as PlanningActionKey
}

export function parsePayload(value: any, options: WorkspacePayloadParseOptions = {}) {
  return parseWorkspacePayload(value, options)
}

export function recordTime(record: AnyRecord) {
  const timestamp = Date.parse(text(record?.created_at || record?.updated_at))
  return Number.isFinite(timestamp) ? timestamp : 0
}

export const BATCH_DELIVERY_QUALITY_THRESHOLD = 78

export function proseText(chapter?: AnyRecord | null) {
  return text(chapter?.chapter_text || chapter?.chapterText)
}

export function hasDeliveredProse(chapter?: AnyRecord | null) {
  const content = proseText(chapter)
  return Boolean(content && !content.includes('【占位正文】'))
}

export function payloadChapterId(payload: AnyRecord) {
  return payload?.chapter_id ?? payload?.chapterId ?? payload?.chapter?.id ?? payload?.chapter?.chapter_id ?? null
}

export function payloadChapterNo(payload: AnyRecord) {
  return Number(payload?.chapter_no ?? payload?.chapterNo ?? payload?.chapter?.chapter_no ?? payload?.chapter?.chapterNo ?? 0)
}

export function reviewMatchesChapter(review: AnyRecord, chapter: AnyRecord, fallbackChapterNo: number) {
  const payload = parsePayload(review?.payload, { owner: review, kind: 'review', field: 'payload' }) || {}
  const reviewChapterId = review?.chapter_id ?? review?.chapterId ?? payloadChapterId(payload)
  const reviewChapterNo = Number(review?.chapter_no ?? review?.chapterNo ?? payloadChapterNo(payload))
  const chapterId = chapter?.id ?? chapter?.chapter_id ?? null
  if (chapterId !== null && chapterId !== undefined && reviewChapterId !== null && reviewChapterId !== undefined) {
    return String(reviewChapterId) === String(chapterId)
  }
  return reviewChapterNo > 0 && reviewChapterNo === fallbackChapterNo
}

export function qualityPayload(review?: AnyRecord | null) {
  const payload = parsePayload(review?.payload, { owner: review, kind: 'review', field: 'payload' }) || {}
  return payload?.review || payload?.result?.review || payload?.result || payload
}

export function latestQualityReviewForChapter(reviews: AnyRecord[], chapter: AnyRecord, chapterNo: number) {
  return reviews
    .filter(review => text(review?.review_type) === 'prose_quality')
    .filter(review => reviewMatchesChapter(review, chapter, chapterNo))
    .sort((a, b) => recordTime(b) - recordTime(a))[0] || null
}

export function latestReviewForChapter(reviews: AnyRecord[], chapter: AnyRecord, chapterNo: number, reviewType: string) {
  return reviews
    .filter(review => text(review?.review_type) === reviewType)
    .filter(review => reviewMatchesChapter(review, chapter, chapterNo))
    .sort((a, b) => recordTime(b) - recordTime(a))[0] || null
}

export function qualityReviewPassed(review?: AnyRecord | null) {
  if (!review) return false
  const quality = qualityPayload(review)
  const passed = quality?.passed
  const needsRevision = quality?.needs_revision ?? quality?.needsRevision
  const scoreValue = quality?.score ?? quality?.overall_score ?? quality?.quality_score
  const score = scoreValue === null || scoreValue === undefined || scoreValue === '' ? null : Number(scoreValue)
  if (passed === false || needsRevision === true) return false
  if (Number.isFinite(score)) return Number(score) >= BATCH_DELIVERY_QUALITY_THRESHOLD
  return passed === true
}

export function findChapter(chapters: AnyRecord[], item: { chapterId: any; chapterNo: number }) {
  return chapters.find(chapter => {
    const chapterId = chapter?.id ?? chapter?.chapter_id ?? null
    return item.chapterId !== null && item.chapterId !== undefined && chapterId !== null && chapterId !== undefined
      ? String(chapterId) === String(item.chapterId)
      : Number(chapter?.chapter_no ?? chapter?.chapterNo ?? 0) === item.chapterNo
  }) || null
}

export function batchChapterDelivered(args: {
  item: { chapterId: any; chapterNo: number; status: AutoCreationBatchReviewItemStatus }
  chapters: AnyRecord[]
  reviews: AnyRecord[]
  storyState: AnyRecord
}) {
  if (args.item.status !== 'success') return false
  const chapter = findChapter(args.chapters, args.item)
  if (!chapter || !hasDeliveredProse(chapter)) return false
  if (Number(args.storyState?.last_updated_chapter || 0) < Number(args.item.chapterNo || 0)) return false
  return qualityReviewPassed(latestQualityReviewForChapter(args.reviews, chapter, args.item.chapterNo))
}

export function numberValue(value: any) {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : null
}

export function boolValue(value: any) {
  if (value === true || value === false) return value
  const normalized = text(value).toLowerCase()
  if (['true', 'yes', 'ok', 'pass', 'passed', 'delivered', 'done'].includes(normalized)) return true
  if (['false', 'no', 'warn', 'warning', 'fail', 'failed', 'missing', 'missed'].includes(normalized)) return false
  return null
}

export function riskPayload(review: AnyRecord | null, key: string) {
  const payload = parsePayload(review?.payload, { owner: review, kind: 'review', field: 'payload' }) || {}
  return payload?.[key] || payload?.result?.[key] || payload?.result || payload
}

export function reviewPayload(review: AnyRecord | null) {
  return parsePayload(review?.payload, { owner: review, kind: 'review', field: 'payload' }) || {}
}

export function riskCountFromStatus(payload: AnyRecord, review: AnyRecord | null) {
  return text(payload?.status || review?.status).toLowerCase() === 'warn' ? 1 : 0
}

export function sceneCardReceiptCheckText(value: any) {
  if (typeof value === 'string') return text(value)
  return [
    value?.key,
    value?.label,
    value?.status,
    value?.evidence,
    value?.fix,
    value?.message,
    value?.summary,
    value?.text,
    ...arrayValue(value?.fields),
  ].map(item => text(item)).filter(Boolean).join(' ')
}

export function sceneCardReceiptCheckFailed(value: any) {
  if (typeof value === 'string') return value.toLowerCase().includes('scene_card_receipt')
  const status = text(value?.status || value?.result || value?.severity).toLowerCase()
  if (['pass', 'passed', 'ok', 'done', 'true'].includes(status)) return false
  if (['fail', 'failed', 'warn', 'warning', 'missing', 'missed', 'false', 'blocker'].includes(status)) return true
  if (value?.passed === false || value?.delivered === false || value?.ok === false) return true
  return true
}

export function sceneCardReceiptRiskChecks(payload: AnyRecord | null) {
  const source = payload || {}
  const selfCheck = source?.self_check || source?.selfCheck || source
  const review = selfCheck?.review || source?.review || {}
  return [
    ...arrayValue(review?.quality_audit_checks || review?.qualityAuditChecks),
    ...arrayValue(selfCheck?.quality_audit_checks || selfCheck?.qualityAuditChecks),
    ...arrayValue(source?.quality_audit_checks || source?.qualityAuditChecks),
    ...arrayValue(review?.issues),
    ...arrayValue(selfCheck?.issues),
    ...arrayValue(source?.issues),
  ].filter(item => sceneCardReceiptCheckText(item).toLowerCase().includes('scene_card_receipt'))
    .filter(sceneCardReceiptCheckFailed)
}

export function sceneCardReceiptRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  return sceneCardReceiptRiskChecks(reviewPayload(review)).length
}

export function sceneCardReceiptRiskTitle(risk: AnyRecord, count: number) {
  return text(risk?.scene_card_receipt?.label || risk?.sceneCardReceipt?.label, `场景回执缺口 ${count}`)
}

export function sceneCardReceiptRiskMessage(risk: AnyRecord) {
  const checks = sceneCardReceiptRiskChecks(risk)
  return checks.map(item => firstText(item?.evidence, item?.message, item?.summary, item?.text, item?.fix, sceneCardReceiptCheckText(item))).filter(Boolean).slice(0, 2).join('；')
    || '场景卡回执未能证明对应场景正文已兑现。'
}

export function qualityAuditCheckText(value: any) {
  if (typeof value === 'string') return text(value)
  return [
    value?.key,
    value?.label,
    value?.status,
    value?.evidence,
    value?.fix,
    value?.message,
    value?.summary,
    value?.text,
    value?.strategy,
  ].map(item => text(item)).filter(Boolean).join(' ')
}

export function qualityAuditCheckFailed(value: any) {
  if (typeof value === 'string') return true
  const status = text(value?.status || value?.result || value?.severity).toLowerCase()
  const score = Number(value?.score)
  if (['pass', 'passed', 'ok', 'done', 'true'].includes(status)) return false
  if (['fail', 'failed', 'warn', 'warning', 'missing', 'missed', 'false', 'blocker'].includes(status)) return true
  return Number.isFinite(score) && score < 78
}

export function qualityAuditRiskChecks(payload: AnyRecord | null) {
  const source = payload || {}
  const selfCheck = source?.self_check || source?.selfCheck || source
  const review = selfCheck?.review || source?.review || {}
  return [
    ...arrayValue(review?.quality_audit_checks || review?.qualityAuditChecks),
    ...arrayValue(selfCheck?.quality_audit_checks || selfCheck?.qualityAuditChecks),
    ...arrayValue(source?.quality_audit_checks || source?.qualityAuditChecks),
  ].filter(item => !qualityAuditCheckText(item).toLowerCase().includes('scene_card_receipt'))
    .filter(qualityAuditCheckFailed)
}

export function qualityAuditRiskMessageFromChecks(checks: AnyRecord[]) {
  return checks.map(item => firstText(item?.evidence, item?.message, item?.summary, item?.text, item?.fix, qualityAuditCheckText(item))).filter(Boolean).slice(0, 2).join('；')
    || 'quality_audit_checks 仍有 fail/warn 项未清。'
}

export function qualityAuditRiskHigh(checks: AnyRecord[]) {
  return checks.some(item => {
    const status = text(item?.status || item?.result || item?.severity).toLowerCase()
    const score = Number(item?.score)
    return ['fail', 'failed', 'blocker'].includes(status) || (Number.isFinite(score) && score < 65)
  })
}

export function uniqueObjectReferences(values: any[]) {
  const seen = new Set<any>()
  return values.filter((value) => {
    if (!value || typeof value !== 'object') return false
    if (seen.has(value)) return false
    seen.add(value)
    return true
  })
}

export function deliveryReceiptsFrom(value: AnyRecord | null | undefined) {
  if (!value || typeof value !== 'object') return {}
  const rawPayload = value.raw_payload || value.rawPayload || {}
  return value.oh_story_delivery_receipts
    || value.ohStoryDeliveryReceipts
    || rawPayload.oh_story_delivery_receipts
    || rawPayload.ohStoryDeliveryReceipts
    || {}
}

export function preDraftExecutionReceiptSections(payload: AnyRecord | null) {
  const source = payload || {}
  const selfCheck = source?.self_check || source?.selfCheck || source
  const review = selfCheck?.review || selfCheck?.initial_review || source?.review || source
  const receiptSources = uniqueObjectReferences([
    deliveryReceiptsFrom(review),
    deliveryReceiptsFrom(selfCheck),
    deliveryReceiptsFrom(source),
  ])
  return uniqueObjectReferences([
    review?.pre_draft_execution_receipts || review?.preDraftExecutionReceipts,
    selfCheck?.pre_draft_execution_receipts || selfCheck?.preDraftExecutionReceipts,
    source?.pre_draft_execution_receipts || source?.preDraftExecutionReceipts,
    ...receiptSources.map(item => item?.pre_draft_execution_receipts || item?.preDraftExecutionReceipts),
  ])
}

export function preDraftExecutionCheckNeedsRepair(value: any) {
  const status = text(value?.status || value?.result || value?.severity).toLowerCase()
  if (['pass', 'passed', 'ok', 'done', 'true'].includes(status)) return false
  if (['fail', 'failed', 'warn', 'warning', 'missing', 'missed', 'false', 'blocker'].includes(status)) return true
  if (value?.delivered === false || value?.passed === false || value?.ok === false) return true
  return Boolean(firstText(value?.remaining_risk, value?.remainingRisk))
}

export function preDraftExecutionRiskChecks(payload: AnyRecord | null, snakeKey: string, camelKey: string) {
  return preDraftExecutionReceiptSections(payload)
    .flatMap(section => arrayValue(section?.[snakeKey] || section?.[camelKey]))
    .filter(preDraftExecutionCheckNeedsRepair)
}

export function preDraftExecutionRiskMessage(checks: AnyRecord[]) {
  return checks.map(item => firstText(
    item?.remaining_risk,
    item?.remainingRisk,
    item?.evidence,
    item?.message,
    item?.summary,
    item?.text,
    item?.fix,
    item?.label,
    item?.key,
  )).filter(Boolean).slice(0, 2).join('；') || '写前执行回执仍有未兑现项。'
}

export function sourceStateCheckNeedsRepair(value: any) {
  if (typeof value === 'string') return true
  const status = text(value?.status || value?.result || value?.severity).toLowerCase()
  if (['pass', 'passed', 'ok', 'done', 'true', 'yes'].includes(status)) return false
  if (['fail', 'failed', 'warn', 'warning', 'missing', 'missed', 'blocked', 'error', 'false', 'no', '0'].includes(status)) return true
  if (value?.ready === false || value?.passed === false || value?.delivered === false || value?.ok === false) return true
  if (value?.ready === true || value?.passed === true || value?.delivered === true || value?.ok === true) return false
  return Boolean(firstText(value?.remaining_risk, value?.remainingRisk, value?.fix, value?.evidence))
}

export function sourceStateRiskChecks(payload: AnyRecord | null, snakeKey: string, camelKey: string) {
  const source = payload || {}
  const selfCheck = source?.self_check || source?.selfCheck || source
  const review = selfCheck?.review || source?.review || {}
  return [
    ...arrayValue(review?.[snakeKey] || review?.[camelKey]),
    ...arrayValue(selfCheck?.[snakeKey] || selfCheck?.[camelKey]),
    ...arrayValue(source?.[snakeKey] || source?.[camelKey]),
  ].filter(sourceStateCheckNeedsRepair)
}

export function sourceStateRiskMessage(checks: AnyRecord[]) {
  return checks.map(item => firstText(
    item?.evidence,
    item?.message,
    item?.summary,
    item?.text,
    item?.remaining_risk,
    item?.remainingRisk,
    item?.fix,
    item?.label,
    item?.key,
  )).filter(Boolean).slice(0, 2).join('；') || '来源/状态检查仍有 fail/warn 项未清。'
}

export function qualityAuditRepairReceiptRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const risk = riskPayload(review, 'quality_audit_repair_receipt_sync')
  const count = Number(risk?.missed_count ?? risk?.missedCount)
  if (Number.isFinite(count)) return Math.max(0, count)
  const missed = arrayValue(risk?.missed || risk?.gaps || risk?.issues)
  if (missed.length > 0) return missed.length
  return riskCountFromStatus(risk, review)
}

export function qualityAuditRepairReceiptRiskMessage(risk: AnyRecord) {
  return issueTexts([
    ...arrayValue(risk?.missed || risk?.gaps || risk?.issues).map((item: any) => firstText(
      item?.text,
      item?.evidence,
      item?.message,
      item?.summary,
      item?.risk,
      item?.label,
    )),
    ...arrayValue(risk?.next_actions || risk?.nextActions),
    risk?.summary,
  ], 2).join('；') || 'quality_audit_repair_receipts 没有逐条证明质量诊断修复已闭环。'
}

export function deslopRepairReceiptRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const risk = riskPayload(review, 'deslop_repair_receipt_sync')
  const count = Number(risk?.missed_count ?? risk?.missedCount)
  if (Number.isFinite(count)) return Math.max(0, count)
  const missed = arrayValue(risk?.missed || risk?.gaps || risk?.issues)
  if (missed.length > 0) return missed.length
  return riskCountFromStatus(risk, review)
}

export function deslopRepairReceiptRiskMessage(risk: AnyRecord) {
  return issueTexts([
    ...arrayValue(risk?.missed || risk?.gaps || risk?.issues).map((item: any) => firstText(
      item?.text,
      item?.evidence,
      item?.message,
      item?.summary,
      item?.risk,
      item?.label,
    )),
    ...arrayValue(risk?.next_actions || risk?.nextActions),
    risk?.summary,
  ], 2).join('；') || 'deslop_repair_receipts 没有逐条证明去AI味修复已闭环。'
}

export function revisionSyncRiskCount(review: AnyRecord | null, key: string) {
  if (!review) return 0
  const risk = riskPayload(review, key)
  const count = Number(risk?.missed_count ?? risk?.missedCount ?? risk?.risk_count ?? risk?.riskCount)
  if (Number.isFinite(count)) return Math.max(0, count)
  const missed = arrayValue(risk?.missed || risk?.gaps || risk?.issues || risk?.evidence_missing || risk?.evidenceMissing)
  if (missed.length > 0) return missed.length
  return riskCountFromStatus(risk, review)
}

export function revisionSyncRiskMessage(risk: AnyRecord, fallback: string) {
  return issueTexts([
    ...arrayValue(risk?.missed || risk?.gaps || risk?.issues || risk?.evidence_missing || risk?.evidenceMissing).map((item: any) => firstText(
      item?.text,
      item?.impact,
      item?.evidence,
      item?.message,
      item?.summary,
      item?.risk,
      item?.required_action,
      item?.requiredAction,
      item?.target,
      item?.label,
    )),
    ...arrayValue(risk?.next_actions || risk?.nextActions),
    risk?.summary,
  ], 2).join('；') || fallback
}

export function coreRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const raw = riskPayload(review, 'core_drift')
  const payload = raw?.chapter_core_drift || raw?.core_drift || raw
  const count = arrayValue(payload?.drift_risks).length + arrayValue(payload?.risks).length
  return count > 0 ? count : riskCountFromStatus(payload, review)
}

export function runwayRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'runway_sync')
  const count = numberValue(payload?.risk_count ?? payload?.riskCount)
  if (count !== null) return count
  const inferred = arrayValue(payload?.four_question_missed).length
    + arrayValue(payload?.reader_fuel_missed).length
    + arrayValue(payload?.redline_touched).length
  return inferred > 0 ? inferred : riskCountFromStatus(payload, review)
}

export function payoffDebtCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'reader_payoff_sync')
  const count = numberValue(payload?.debt_count ?? payload?.debtCount)
  if (count !== null) return count
  const inferred = arrayValue(payload?.missed).length + arrayValue(payload?.debts).length
  return inferred > 0 ? inferred : riskCountFromStatus(payload, review)
}

export function expectationRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'reader_expectation_sync')
  const count = numberValue(payload?.missed_count ?? payload?.missedCount)
  if (count !== null) return count
  const inferred = arrayValue(payload?.missed).length + arrayValue(payload?.debts).length
  return inferred > 0 ? inferred : riskCountFromStatus(payload, review)
}

export function storylineRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'storyline_sync')
  const count = arrayValue(payload?.missed).length
    + arrayValue(payload?.unplanned).length
    + arrayValue(payload?.forbidden_touched).length
  return count > 0 ? count : riskCountFromStatus(payload, review)
}

export function storyUnitRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'story_unit_sync')
  const counted = numberValue(payload?.missed_count ?? payload?.missedCount)
    || numberValue(payload?.rushed_count ?? payload?.rushedCount)
    || numberValue(payload?.forbidden_count ?? payload?.forbiddenCount)
  if (counted !== null) {
    const missed = numberValue(payload?.missed_count ?? payload?.missedCount) ?? arrayValue(payload?.missed).length
    const rushed = numberValue(payload?.rushed_count ?? payload?.rushedCount) ?? (arrayValue(payload?.rushed_ahead).length + arrayValue(payload?.rushedAhead).length)
    const forbidden = numberValue(payload?.forbidden_count ?? payload?.forbiddenCount) ?? (arrayValue(payload?.forbidden_touched).length + arrayValue(payload?.forbiddenTouched).length)
    return missed + rushed + forbidden
  }
  const count = arrayValue(payload?.missed).length
    + arrayValue(payload?.rushed_ahead).length
    + arrayValue(payload?.rushedAhead).length
    + arrayValue(payload?.forbidden_touched).length
    + arrayValue(payload?.forbiddenTouched).length
  return count > 0 ? count : riskCountFromStatus(payload, review)
}

export function storyDriveRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'story_drive_sync')
  const count = numberValue(payload?.missed_count ?? payload?.missedCount)
  if (count !== null) return count
  const inferred = arrayValue(payload?.missed).length
  return inferred > 0 ? inferred : riskCountFromStatus(payload, review)
}

export function characterArcRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'character_arc_sync')
  const count = numberValue(payload?.missed_count ?? payload?.missedCount)
  if (count !== null) return count
  const inferred = arrayValue(payload?.missed).length
  return inferred > 0 ? inferred : riskCountFromStatus(payload, review)
}

export function readabilityRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'readability_review')
  const memeSense = payload?.meme_sense || {}
  const immersionRiskCount = arrayValue(memeSense?.immersion_risks).length + arrayValue(payload?.immersion_risks).length
  const score = numberValue(payload?.readability_score ?? payload?.score)
  const lowScoreCount = score !== null && score < BATCH_DELIVERY_QUALITY_THRESHOLD ? 1 : 0
  return immersionRiskCount + lowScoreCount
}

export function styleSampleRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'style_sample_sync')
  const missed = numberValue(payload?.missed_count ?? payload?.missedCount) ?? arrayValue(payload?.missed).length
  const copied = numberValue(payload?.copy_risk_count ?? payload?.copyRiskCount) ?? (arrayValue(payload?.copied_phrases).length + arrayValue(payload?.copiedPhrases).length)
  const total = missed + copied
  return total > 0 ? total : riskCountFromStatus(payload, review)
}

export function chapterBenchmarkRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'chapter_benchmark_sync')
  const missed = numberValue(payload?.missed_count ?? payload?.missedCount) ?? arrayValue(payload?.missed).length
  return missed > 0 ? missed : riskCountFromStatus(payload, review)
}

export function contractSyncRiskCount(review: AnyRecord | null, payloadKey: string) {
  if (!review) return 0
  const payload = riskPayload(review, payloadKey)
  const missed = numberValue(payload?.missed_count ?? payload?.missedCount)
    ?? arrayValue(payload?.missed || payload?.gaps || payload?.issues).length
  return missed > 0 ? missed : riskCountFromStatus(payload, review)
}

export function chapterAttractionWeakDimensions(payload: AnyRecord) {
  const explicitWeak = arrayValue(payload?.weak_dimensions || payload?.weakDimensions)
  if (explicitWeak.length > 0) return explicitWeak
  return arrayValue(payload?.dimensions)
    .filter((item: any) => text(item?.status).toLowerCase() === 'warn')
}

export function chapterAttractionRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'chapter_attraction_review')
  const count = numberValue(payload?.weak_count ?? payload?.weakCount)
  if (count !== null) return count
  const weak = chapterAttractionWeakDimensions(payload).length
  return weak > 0 ? weak : riskCountFromStatus(payload, review)
}

export function governanceRecheckRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'governance_recheck_sync')
  const count = numberValue(payload?.missed_count ?? payload?.missedCount)
  if (count !== null) return count
  const inferred = arrayValue(payload?.failed_evidence).length
    + arrayValue(payload?.failedEvidence).length
    + arrayValue(payload?.missed).length
    + arrayValue(payload?.missed_items).length
    + arrayValue(payload?.missedItems).length
  return inferred > 0 ? inferred : riskCountFromStatus(payload, review)
}

export function readerTrialReport(review: AnyRecord | null) {
  if (!review) return null
  const payload = reviewPayload(review)
  return payload?.report || payload?.reader_trial_review || payload?.result?.report || payload?.result || payload
}

export function latestReaderTrialReview(reviews: AnyRecord[]) {
  return reviews
    .filter(review => text(review?.review_type) === 'reader_trial_review')
    .slice()
    .sort((a, b) => recordTime(b) - recordTime(a))[0] || null
}

export function chapterNosFromText(value: string) {
  const result = new Set<number>()
  const normalized = text(value)
  const patterns = [
    /第\s*(\d+)\s*章/g,
    /chapter\s*(\d+)/gi,
  ]
  for (const pattern of patterns) {
    let match: RegExpExecArray | null
    while ((match = pattern.exec(normalized))) {
      const chapterNo = Number(match[1])
      if (Number.isFinite(chapterNo) && chapterNo > 0) result.add(chapterNo)
    }
  }
  return [...result]
}

export function readerTrialAppliesToBatch(textValue: string, chapterNos: Set<number>) {
  const mentionedNos = chapterNosFromText(textValue)
  if (mentionedNos.length > 0) {
    return mentionedNos.some(chapterNo => chapterNos.has(chapterNo))
  }
  return [...chapterNos].some(chapterNo => chapterNo > 0 && chapterNo <= 30)
}

export function readerTrialBatchReview(args: {
  items: AutoCreationBatchReviewItem[]
  review: AnyRecord | null
}) {
  const report = readerTrialReport(args.review)
  const chapterNos = new Set(args.items.map(item => Number(item.chapterNo || 0)).filter(Boolean))
  const dropPoints = arrayValue(report?.drop_points || report?.dropPoints)
    .map(item => text(item))
    .filter(Boolean)
    .filter(item => readerTrialAppliesToBatch(item, chapterNos))
  const repairActions = arrayValue(report?.repair_actions || report?.repairActions)
    .map(item => text(item))
    .filter(Boolean)
    .filter(item => readerTrialAppliesToBatch(item, chapterNos) || dropPoints.length > 0)
  const score = numberValue(report?.score)
  const status = text(report?.status).toLowerCase()
  const batchInTrialWindow = [...chapterNos].some(chapterNo => chapterNo > 0 && chapterNo <= 30)
  const lowScoreRisk = batchInTrialWindow && score !== null && score < BATCH_DELIVERY_QUALITY_THRESHOLD ? 1 : 0
  const statusRisk = batchInTrialWindow && ['blocked', 'block', 'needs_repair', 'warn'].includes(status) ? 1 : 0
  const riskCount = dropPoints.length || Math.max(lowScoreRisk, statusRisk)
  return {
    status: riskCount > 0 ? 'warn' as const : 'ok' as const,
    score,
    label: riskCount > 0 ? `试读弃读点 ${riskCount}` : '试读 OK',
    summary: text(report?.summary, riskCount > 0 ? '读者试读复盘存在弃读点。' : '读者试读复盘未发现当前批次风险。'),
    quality_bar: firstText(report?.quality_bar, report?.qualityBar),
    drop_points: dropPoints,
    repair_actions: repairActions,
    personas: arrayValue(report?.personas),
    segments: arrayValue(report?.segments),
    risk_count: riskCount,
  }
}

export function retentionRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'reader_retention_sync')
  const count = numberValue(payload?.missed_count ?? payload?.missedCount)
  if (count !== null) return count
  const inferred = arrayValue(payload?.missed).length
  return inferred > 0 ? inferred : riskCountFromStatus(payload, review)
}

export function innovationRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'innovation_sync')
  const count = numberValue(payload?.missed_count ?? payload?.missedCount)
  if (count !== null) return count
  const inferred = arrayValue(payload?.missed).length
  return inferred > 0 ? inferred : riskCountFromStatus(payload, review)
}

export function signatureSceneRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'signature_scene_sync')
  const count = numberValue(payload?.missed_count ?? payload?.missedCount)
  if (count !== null) return count
  const inferred = arrayValue(payload?.missed).length
  return inferred > 0 ? inferred : riskCountFromStatus(payload, review)
}

export function payloadReviewChapterId(review: AnyRecord, payload: AnyRecord) {
  return review?.chapter_id
    ?? review?.chapterId
    ?? payload?.chapter_id
    ?? payload?.chapterId
    ?? payload?.report?.chapter_id
    ?? payload?.report?.chapterId
    ?? payload?.context_package?.chapter_target?.id
    ?? null
}

export function payloadReviewChapterNo(review: AnyRecord, payload: AnyRecord) {
  return Number(
    review?.chapter_no
    ?? review?.chapterNo
    ?? payload?.chapter_no
    ?? payload?.chapterNo
    ?? payload?.report?.chapter_no
    ?? payload?.report?.chapterNo
    ?? payload?.context_package?.chapter_target?.chapter_no
    ?? payload?.context_package?.chapter_target?.chapterNo
    ?? 0,
  )
}

export function deliveryRiskAnnotationKey(input: {
  source: string
  reviewId: any
  chapterId: any
  chapterNo: any
  kind: string
  title: string
}) {
  return [
    input.source || 'review',
    input.reviewId || 0,
    input.chapterId || 0,
    input.chapterNo || 0,
    String(input.kind || 'issue'),
    String(input.title || '').slice(0, 120),
  ].join(':')
}

export function resolvedAnnotationKeys(reviews: AnyRecord[]) {
  const map = new Map<string, AnyRecord>()
  reviews
    .filter(review => text(review?.review_type) === 'review_annotation_status')
    .slice()
    .sort((a, b) => recordTime(a) - recordTime(b))
    .forEach(review => {
      const payload = reviewPayload(review)
      const key = text(payload?.annotation_key || payload?.key)
      if (key) map.set(key, payload)
    })
  return new Set([...map.entries()]
    .filter(([, payload]) => text(payload?.status).toLowerCase() === 'resolved')
    .map(([key]) => key))
}

export function clearedDeliveryRiskChapterKeys(reviews: AnyRecord[]) {
  const cleared = new Map<string, number>()
  reviews
    .filter(review => text(review?.review_type) === 'delivery_risk_convergence')
    .forEach(review => {
      const payload = reviewPayload(review)
      const convergence = payload?.delivery_risk_convergence || payload?.result?.delivery_risk_convergence || payload?.result || payload
      const afterCount = Number(convergence?.after_count ?? convergence?.afterCount ?? convergence?.after?.total_count ?? 0)
      if (!(text(convergence?.status) === 'cleared' || afterCount === 0)) return
      const chapterId = payloadReviewChapterId(review, { ...payload, chapter_id: payload?.chapter_id || convergence?.chapter_id })
      const chapterNo = payloadReviewChapterNo(review, { ...payload, chapter_no: payload?.chapter_no || convergence?.chapter_no })
      const time = recordTime(review)
      if (chapterId !== null && chapterId !== undefined) cleared.set(`id:${chapterId}`, Math.max(cleared.get(`id:${chapterId}`) || 0, time))
      if (chapterNo > 0) cleared.set(`no:${chapterNo}`, Math.max(cleared.get(`no:${chapterNo}`) || 0, time))
    })
  return cleared
}

export const DELIVERY_RISK_CONFIG: Record<string, {
  category: AutoCreationDeliveryRiskGateCategory['key']
  label: string
  kind: string
  payloadKey: string
  issueType: string
  count: (review: AnyRecord) => number
  title: (risk: AnyRecord, count: number) => string
  message: (risk: AnyRecord) => string
  high: (risk: AnyRecord, count: number) => boolean
}> = {
  chapter_core_drift: {
    category: 'delivery_core',
    label: '核心',
    kind: 'core_drift',
    payloadKey: 'core_drift',
    issueType: 'core_drift',
    count: coreRiskCount,
    title: (risk, count) => text(risk?.label, `核心偏移 ${count}`),
    message: risk => issueTexts([...arrayValue(risk?.drift_risks), ...arrayValue(risk?.risks)], 2).join('；') || '核心偏移风险',
    high: () => true,
  },
  runway_sync: {
    category: 'runway',
    label: '航线',
    kind: 'runway_sync_risk',
    payloadKey: 'runway_sync',
    issueType: 'runway_sync_risk',
    count: runwayRiskCount,
    title: (risk, count) => text(risk?.label, `航线风险 ${count}`),
    message: risk => issueTexts([
      ...arrayValue(risk?.four_question_missed),
      ...arrayValue(risk?.reader_fuel_missed),
      ...arrayValue(risk?.redline_touched),
    ], 2).join('；') || '百万字航线、读者燃料或红线约束未闭环',
    high: (risk, count) => arrayValue(risk?.redline_touched).length > 0 || count >= 2,
  },
  reader_expectation_sync: {
    category: 'reader_expectation',
    label: '期待',
    kind: 'reader_expectation_debt',
    payloadKey: 'reader_expectation_sync',
    issueType: 'reader_expectation_debt',
    count: expectationRiskCount,
    title: (risk, count) => text(risk?.label, `期待欠账 ${count}`),
    message: risk => issueTexts(arrayValue(risk?.missed), 2).join('；') || '读者期待或上一章交接承诺没有兑现',
    high: (_risk, count) => count >= 2,
  },
  reader_retention_sync: {
    category: 'reader_retention',
    label: '追读',
    kind: 'reader_retention_missed',
    payloadKey: 'reader_retention_sync',
    issueType: 'reader_retention_missed',
    count: retentionRiskCount,
    title: (risk, count) => text(risk?.label, `漏追读 ${count}`),
    message: risk => issueTexts(arrayValue(risk?.missed), 2).join('；') || '追读承诺未兑现',
    high: (_risk, count) => count >= 2,
  },
  reader_payoff_sync: {
    category: 'reader_payoff',
    label: '回报',
    kind: 'reader_payoff_debt',
    payloadKey: 'reader_payoff_sync',
    issueType: 'reader_payoff_debt',
    count: payoffDebtCount,
    title: (risk, count) => text(risk?.label, `回报欠账 ${count}`),
    message: risk => issueTexts([...arrayValue(risk?.missed), ...arrayValue(risk?.debts)], 2).join('；') || '读者回报欠账',
    high: (_risk, count) => count >= 2,
  },
  innovation_sync: {
    category: 'innovation',
    label: '创新',
    kind: 'innovation_missed',
    payloadKey: 'innovation_sync',
    issueType: 'innovation_missed',
    count: innovationRiskCount,
    title: (risk, count) => text(risk?.label, `创新缺口 ${count}`),
    message: risk => issueTexts(arrayValue(risk?.missed), 2).join('；') || '创新执行未落地',
    high: (_risk, count) => count >= 2,
  },
  signature_scene_sync: {
    category: 'signature_scene',
    label: '强场面',
    kind: 'signature_scene_missed',
    payloadKey: 'signature_scene_sync',
    issueType: 'signature_scene_missed',
    count: signatureSceneRiskCount,
    title: (risk, count) => text(risk?.label, `强场面漏写 ${count}`),
    message: risk => issueTexts(arrayValue(risk?.missed), 2).join('；') || '开写任务书指定的标志性强场面没有充分兑现',
    high: () => true,
  },
  storyline_sync: {
    category: 'storyline',
    label: '剧情线',
    kind: 'storyline_sync_risk',
    payloadKey: 'storyline_sync',
    issueType: 'storyline_sync_risk',
    count: storylineRiskCount,
    title: (risk, count) => text(risk?.label, `剧情线风险 ${count}`),
    message: risk => issueTexts([
      ...arrayValue(risk?.missed),
      ...arrayValue(risk?.unplanned),
      ...arrayValue(risk?.forbidden_touched),
    ], 2).join('；') || '剧情线同步风险',
    high: risk => arrayValue(risk?.forbidden_touched).length > 0,
  },
  story_unit_sync: {
    category: 'story_unit',
    label: '剧情单元',
    kind: 'story_unit_sync_risk',
    payloadKey: 'story_unit_sync',
    issueType: 'story_unit_sync_risk',
    count: storyUnitRiskCount,
    title: (risk, count) => text(risk?.label, `剧情单元风险 ${count}`),
    message: risk => issueTexts([
      ...arrayValue(risk?.missed),
      ...arrayValue(risk?.rushed_ahead),
      ...arrayValue(risk?.rushedAhead),
      ...arrayValue(risk?.forbidden_touched),
      ...arrayValue(risk?.forbiddenTouched),
    ], 2).join('；') || '剧情单元兑现风险',
    high: risk => arrayValue(risk?.rushed_ahead).length > 0
      || arrayValue(risk?.rushedAhead).length > 0
      || arrayValue(risk?.forbidden_touched).length > 0
      || arrayValue(risk?.forbiddenTouched).length > 0,
  },
  story_drive_sync: {
    category: 'story_drive',
    label: '故事力',
    kind: 'story_drive_gap',
    payloadKey: 'story_drive_sync',
    issueType: 'story_drive_gap',
    count: storyDriveRiskCount,
    title: (risk, count) => text(risk?.label, `故事力缺口 ${count}`),
    message: risk => issueTexts(arrayValue(risk?.missed), 2).join('；') || '主角主动选择、明确阻碍、选择代价、状态变化或下一步因果没有落地',
    high: (_risk, count) => count >= 3,
  },
  character_arc_sync: {
    category: 'character_arc',
    label: '人物弧光',
    kind: 'character_arc_gap',
    payloadKey: 'character_arc_sync',
    issueType: 'character_arc_gap',
    count: characterArcRiskCount,
    title: (risk, count) => text(risk?.label, `人物弧光缺口 ${count}`),
    message: risk => issueTexts(arrayValue(risk?.missed), 2).join('；') || '角色欲望、缺陷受压、关系变化、成长节点或口吻锚点没有落地',
    high: (_risk, count) => count >= 3,
  },
  readability_review: {
    category: 'readability',
    label: '可读性',
    kind: 'readability_or_meme_risk',
    payloadKey: 'readability_review',
    issueType: 'readability_risk',
    count: readabilityRiskCount,
    title: (risk, count) => text(risk?.label, `可读性/网感风险 ${count}`),
    message: risk => issueTexts([
      ...arrayValue(risk?.meme_sense?.immersion_risks),
      ...arrayValue(risk?.immersion_risks),
      ...arrayValue(risk?.issues),
    ], 2).join('；') || `可读性评分 ${risk?.readability_score || risk?.score || '-'}`,
    high: risk => Number(risk?.readability_score ?? risk?.score ?? 100) < 65,
  },
  chapter_attraction_review: {
    category: 'chapter_attraction',
    label: '吸引力',
    kind: 'chapter_attraction_gap',
    payloadKey: 'chapter_attraction_review',
    issueType: 'chapter_attraction_gap',
    count: chapterAttractionRiskCount,
    title: (risk, count) => text(risk?.label, `吸引力缺口 ${count}`),
    message: risk => issueTexts(chapterAttractionWeakDimensions(risk), 2).join('；') || `吸引力评分 ${risk?.score || '-'}`,
    high: (_risk, count) => count >= 3,
  },
  chapter_benchmark_sync: {
    category: 'chapter_benchmark',
    label: '标杆章',
    kind: 'chapter_benchmark_gap',
    payloadKey: 'chapter_benchmark_sync',
    issueType: 'chapter_benchmark_gap',
    count: chapterBenchmarkRiskCount,
    title: (risk, count) => text(risk?.label, `标杆章缺口 ${count}`),
    message: risk => issueTexts(arrayValue(risk?.missed), 2).join('；') || `质量基准评分 ${risk?.score || '-'}`,
    high: (_risk, count) => count >= 3,
  },
  intent_confirmation_sync: {
    category: 'pre_draft_execution',
    label: '写前执行',
    kind: 'intent_confirmation_gap',
    payloadKey: 'intent_confirmation_sync',
    issueType: 'intent_confirmation_gap',
    count: review => contractSyncRiskCount(review, 'intent_confirmation_sync'),
    title: (risk, count) => text(risk?.label, `意图确认缺口 ${count}`),
    message: risk => issueTexts(arrayValue(risk?.missed || risk?.gaps || risk?.issues), 2).join('；') || '正文没有按写前意图统一发力。',
    high: (_risk, count) => count >= 2,
  },
  benchmark_recall_sync: {
    category: 'pre_draft_execution',
    label: '写前执行',
    kind: 'benchmark_recall_gap',
    payloadKey: 'benchmark_recall_sync',
    issueType: 'benchmark_recall_gap',
    count: review => contractSyncRiskCount(review, 'benchmark_recall_sync'),
    title: (risk, count) => text(risk?.label, `文风召回缺口 ${count}`),
    message: risk => issueTexts(arrayValue(risk?.missed || risk?.gaps || risk?.issues), 2).join('；') || '对标模块、节奏或文风召回没有落到正文。',
    high: (_risk, count) => count >= 2,
  },
  style_sample_sync: {
    category: 'style_sample',
    label: '风格',
    kind: 'style_sample_gap',
    payloadKey: 'style_sample_sync',
    issueType: 'style_sample_gap',
    count: styleSampleRiskCount,
    title: (risk, count) => text(risk?.label, `风格缺口 ${count}`),
    message: risk => issueTexts([
      ...arrayValue(risk?.missed),
      ...arrayValue(risk?.copied_phrases),
      ...arrayValue(risk?.copiedPhrases),
    ], 2).join('；') || `风格评分 ${risk?.score || '-'}`,
    high: risk => (numberValue(risk?.copy_risk_count ?? risk?.copyRiskCount) ?? arrayValue(risk?.copied_phrases).length + arrayValue(risk?.copiedPhrases).length) > 0,
  },
  volume_beat_sync: {
    category: 'volume_beat',
    label: '爆点',
    kind: 'volume_segment_missed',
    payloadKey: 'volume_beat_sync',
    issueType: 'volume_segment_missed',
    count: volumeSegmentRiskCount,
    title: (risk, count) => text(risk?.label, `爆点漏写 ${count}`),
    message: risk => issueTexts(arrayValue(risk?.missed), 2).join('；') || '卷级高潮、爽点或回报预算没有兑现',
    high: (_risk, count) => count >= 2,
  },
  governance_recheck_sync: {
    category: 'recovery_evidence',
    label: '恢复依据',
    kind: 'recovery_evidence_mismatch',
    payloadKey: 'governance_recheck_sync',
    issueType: 'recovery_evidence_mismatch',
    count: governanceRecheckRiskCount,
    title: (risk, count) => text(risk?.label, `恢复依据缺口 ${count}`),
    message: risk => issueTexts([
      ...arrayValue(risk?.failed_evidence),
      ...arrayValue(risk?.failedEvidence),
      ...arrayValue(risk?.missed),
      ...arrayValue(risk?.watch_items),
      ...arrayValue(risk?.watchItems),
    ], 2).join('；') || '治理复查记忆没有在单章正文中落地',
    high: () => true,
  },
  quality_audit_repair_receipt_sync: {
    category: 'quality_audit_repair_receipt',
    label: '质量回执',
    kind: 'quality_audit_repair_receipt',
    payloadKey: 'quality_audit_repair_receipt_sync',
    issueType: 'quality_audit_repair_receipt',
    count: qualityAuditRepairReceiptRiskCount,
    title: (risk, count) => text(risk?.label, `质量诊断修复回执缺口 ${count}`),
    message: qualityAuditRepairReceiptRiskMessage,
    high: () => true,
  },
  deslop_repair_receipt_sync: {
    category: 'deslop_repair_receipt',
    label: '去AI味回执',
    kind: 'deslop_repair_receipt',
    payloadKey: 'deslop_repair_receipt_sync',
    issueType: 'deslop_repair_receipt',
    count: deslopRepairReceiptRiskCount,
    title: (risk, count) => text(risk?.label, `去AI味修复回执残留 ${count}`),
    message: deslopRepairReceiptRiskMessage,
    high: () => true,
  },
  revision_cascade_impact_sync: {
    category: 'revision_cascade_impact',
    label: '级联修订',
    kind: 'revision_cascade_impact',
    payloadKey: 'revision_cascade_impact_sync',
    issueType: 'revision_cascade_impact',
    count: review => revisionSyncRiskCount(review, 'revision_cascade_impact_sync'),
    title: (risk, count) => text(risk?.label, `修订级联影响 ${count}`),
    message: risk => revisionSyncRiskMessage(risk, 'revision_receipts.cascade_impacts 存在后续章节同步义务。'),
    high: () => true,
  },
  revision_scope_guard_sync: {
    category: 'revision_scope_guard',
    label: '修订幅度',
    kind: 'revision_scope_guard',
    payloadKey: 'revision_scope_guard_sync',
    issueType: 'revision_scope_guard',
    count: review => revisionSyncRiskCount(review, 'revision_scope_guard_sync'),
    title: (risk, count) => text(risk?.label, `修订幅度风险 ${count}`),
    message: risk => revisionSyncRiskMessage(risk, '修订前后字数差异超过 oh-story 修订幅度警戒线。'),
    high: () => true,
  },
  prose_revision_receipt_sync: {
    category: 'prose_revision_receipt',
    label: '修订回执',
    kind: 'prose_revision_receipt_sync',
    payloadKey: 'prose_revision_receipt_sync',
    issueType: 'prose_revision_receipt_sync',
    count: review => revisionSyncRiskCount(review, 'prose_revision_receipt_sync'),
    title: (risk, count) => text(risk?.label, `修订回执残留 ${count}`),
    message: risk => revisionSyncRiskMessage(risk, 'delivery_risk_receipts 存在失败项，但 revision_receipts 没有逐条闭环。'),
    high: () => true,
  },
  prose_quality: {
    category: 'scene_card_receipt',
    label: '场景回执',
    kind: 'scene_card_receipt',
    payloadKey: 'scene_card_receipt',
    issueType: 'scene_card_receipt',
    count: sceneCardReceiptRiskCount,
    title: sceneCardReceiptRiskTitle,
    message: sceneCardReceiptRiskMessage,
    high: () => true,
  },
}

export function buildResolvedDeliveryRiskIssueKeys(args: {
  runRecords: AnyRecord[]
  chapters: AnyRecord[]
  reviews: AnyRecord[]
}) {
  const resolvedKeys = new Set<string>()
  const repairRuns = args.runRecords
    .filter(run => text(run?.run_type) === 'longform_production_repair')
    .map(run => ({
      run,
      output: parsePayload(run?.output_ref, { owner: run, kind: 'run', field: 'output_ref' }) || {},
    }))
    .filter(entry => isCompletedRepairRun(entry.run))

  for (const entry of repairRuns) {
    const repairTime = recordTime(entry.run)
    const tasks = [
      ...arrayValue(entry.output?.tasks),
      ...arrayValue(entry.output?.repairTasks),
    ]
    for (const task of tasks) {
      if (!isResolvedTaskStatus(task?.task_status ?? task?.status)) continue
      const issueType = repairTaskIssueType(task)
      if (!issueType) continue
      const taskChapterId = task?.chapter_id ?? task?.chapterId ?? null
      const taskChapterNo = Number(task?.chapter_no ?? task?.chapterNo ?? 0)
      const taskResolvedAt = Date.parse(text(task?.resolved_at || task?.updated_at || task?.created_at))
      const resolvedAfter = Number.isFinite(taskResolvedAt) ? Math.max(repairTime, taskResolvedAt) : repairTime
      const chapter = findChapter(args.chapters, { chapterId: taskChapterId, chapterNo: taskChapterNo })
      if (!chapter) continue
      const chapterNo = Number(chapter?.chapter_no ?? chapter?.chapterNo ?? taskChapterNo)
      const latestQuality = latestQualityReviewForChapter(args.reviews, chapter, chapterNo)
      if (!qualityReviewPassed(latestQuality) || recordTime(latestQuality || {}) <= resolvedAfter) continue
      for (const resolvedIssueType of resolvedBatchRiskIssueTypes(issueType)) {
        for (const key of batchRiskIssueKeys({
          chapterId: chapter?.id ?? chapter?.chapter_id ?? taskChapterId,
          chapterNo,
        }, resolvedIssueType)) {
          resolvedKeys.add(key)
        }
      }
    }
  }

  return resolvedKeys
}

export const DELIVERY_RISK_ISSUE_LABELS: Record<string, string> = {
  core_drift: '核心',
  runway_sync_risk: '航线',
  reader_expectation_debt: '期待',
  opening_handoff_debt: '开篇承接',
  target_reader_gap: '目标读者',
  genre_positioning_gap: '题材定位',
  female_audience_gap: '女频长篇',
  upgrade_rhythm_gap: '升级节奏',
  chapter_structure_gap: '章节结构',
  chapter_progression_gap: '章节推进',
  information_load_gap: '信息负载',
  longform_continuity_gap: '长篇连续性',
  core_contract_gap: '核心契约',
  continuity_heat_gap: '连续性热度',
  revision_receipt_gap: '修订回执',
  deslop_repair_gap: '去AI味修复',
  prose_meta_gap: '正文元叙事',
  serial_risk_repair_gap: '连续风险修复',
  chapter_hook_quality_gap: '章钩质量',
  reader_retention_gap: '追读雷达',
  reader_retention_missed: '追读',
  reader_payoff_debt: '回报',
  innovation_missed: '创新',
  innovation_execution_missed: '创新',
  signature_scene_missed: '强场面',
  storyline_sync_risk: '剧情线',
  story_unit_sync_risk: '剧情单元',
  story_drive_gap: '故事力',
  character_arc_gap: '人物弧光',
  chapter_attraction_gap: '吸引力',
  chapter_benchmark_gap: '标杆章',
  style_sample_gap: '风格',
  intent_confirmation_gap: '意图确认',
  benchmark_recall_gap: '文风召回',
  source_readiness_gap: '来源就绪',
  state_tracking_gap: '状态跟踪',
  style_boundary_gap: '风格边界',
  information_flow_gap: '信息流',
  expectation_threshold_gap: '期待阈值',
  story_loop_gap: '故事闭环',
  emotional_arc_gap: '情绪弧',
  chapter_hook_gap: '章级钩子',
  paragraph_hook_gap: '段落级钩子',
  suspense_gap: '悬念编排',
  reversal_gap: '反转设计',
  showdown_gap: '高潮对抗',
  prose_craft_gap: '正文工艺',
  punctuation_tone_gap: '语气标点',
  content_rubric_gap: '内容基准',
  asset_linkage_gap: '资产挂钩',
  dialogue_gap: '对白质量',
  plot_dynamics_gap: '剧情动力',
  character_relation_gap: '角色关系',
  character_behavior_gap: '角色行为',
  conflict_structure_gap: '冲突结构',
  bridge_unit_gap: '桥段节奏',
  opening_gap: '开篇设计',
  readability_risk: '可读性',
  readability_or_meme_risk: '可读性',
  opening_pull_risk: '开篇吸引力',
  ending_page_turn_risk: '章末翻页',
  scene_progression_risk: '场景推进',
  payoff_density_risk: '爽点密度',
  volume_beat_missed: '爆点',
  volume_segment_missed: '爆点',
  recovery_evidence_mismatch: '恢复依据',
  scene_card_receipt: '场景回执',
  deslop_repair_receipt: '去AI味回执',
  revision_cascade_impact: '级联修订',
  revision_scope_guard: '修订幅度',
  prose_revision_receipt_sync: '修订回执',
  quality_audit_repair_receipt: '质量回执',
  quality_audit_gap: '质量诊断',
  purpose_tag_density_gap: '质量诊断',
  strengthened_repair_acceptance_mismatch: '强化复盘',
}

export function deliveryRiskIssueLabel(issueType: string) {
  if (issueType.startsWith('scene_card_receipt')) return '场景回执'
  if (issueType.startsWith('deslop_repair_receipt')) return '去AI味回执'
  if (issueType.startsWith('revision_cascade_impact')) return '级联修订'
  if (issueType.startsWith('revision_scope_guard')) return '修订幅度'
  if (issueType.startsWith('prose_revision_receipt')) return '修订回执'
  if (issueType.startsWith('quality_audit_repair_receipt')) return '质量回执'
  if (issueType.startsWith('quality_audit')) return '质量诊断'
  if (issueType.startsWith('source_readiness')) return '来源就绪'
  if (issueType.startsWith('state_tracking')) return '状态跟踪'
  if (issueType.startsWith('style_boundary')) return '风格边界'
  if (issueType.startsWith('information_flow')) return '信息流'
  if (issueType.startsWith('expectation_threshold')) return '期待阈值'
  if (issueType.startsWith('story_loop')) return '故事闭环'
  if (issueType.startsWith('emotional_arc')) return '情绪弧'
  if (issueType.startsWith('chapter_hook')) return '章级钩子'
  if (issueType.startsWith('paragraph_hook')) return '段落级钩子'
  if (issueType.startsWith('suspense')) return '悬念编排'
  if (issueType.startsWith('reversal')) return '反转设计'
  if (issueType.startsWith('showdown')) return '高潮对抗'
  if (issueType.startsWith('prose_craft')) return '正文工艺'
  if (issueType.startsWith('punctuation_tone')) return '语气标点'
  if (issueType.startsWith('content_rubric')) return '内容基准'
  if (issueType.startsWith('target_reader')) return '目标读者'
  if (issueType.startsWith('genre_positioning')) return '题材定位'
  if (issueType.startsWith('female_audience')) return '女频长篇'
  if (issueType.startsWith('upgrade_rhythm')) return '升级节奏'
  if (issueType.startsWith('chapter_structure')) return '章节结构'
  if (issueType.startsWith('chapter_progression')) return '章节推进'
  if (issueType.startsWith('information_load')) return '信息负载'
  if (issueType.startsWith('longform_continuity')) return '长篇连续性'
  if (issueType.startsWith('reader_retention_gap')) return '追读雷达'
  if (issueType.startsWith('asset_linkage')) return '资产挂钩'
  if (issueType.startsWith('dialogue')) return '对白质量'
  if (issueType.startsWith('plot_dynamics')) return '剧情动力'
  if (issueType.startsWith('character_relation')) return '角色关系'
  if (issueType.startsWith('character_behavior')) return '角色行为'
  if (issueType.startsWith('conflict_structure')) return '冲突结构'
  if (issueType.startsWith('bridge_unit')) return '桥段节奏'
  if (issueType.startsWith('opening')) return '开篇设计'
  return DELIVERY_RISK_ISSUE_LABELS[issueType] || issueType
}

export function buildResolvedDeliveryRiskEvidence(args: {
  runRecords: AnyRecord[]
  chapters: AnyRecord[]
  reviews: AnyRecord[]
}): AutoCreationDeliveryRiskResolution[] {
  const repaired = new Map<string, {
    count: number
    chapterNos: Set<number>
    issueTypes: Set<string>
    labels: Set<string>
    latestTime: number
  }>()
  const repairRuns = args.runRecords
    .filter(run => text(run?.run_type) === 'longform_production_repair')
    .map(run => ({
      run,
      output: parsePayload(run?.output_ref, { owner: run, kind: 'run', field: 'output_ref' }) || {},
    }))
    .filter(entry => isCompletedRepairRun(entry.run))

  for (const entry of repairRuns) {
    const repairTime = recordTime(entry.run)
    const tasks = [
      ...arrayValue(entry.output?.tasks),
      ...arrayValue(entry.output?.repairTasks),
    ]
    for (const task of tasks) {
      if (!isResolvedTaskStatus(task?.task_status ?? task?.status)) continue
      const issueType = repairTaskIssueType(task)
      if (!issueType) continue
      const taskChapterId = task?.chapter_id ?? task?.chapterId ?? null
      const taskChapterNo = Number(task?.chapter_no ?? task?.chapterNo ?? 0)
      const taskResolvedAt = Date.parse(text(task?.resolved_at || task?.updated_at || task?.created_at))
      const resolvedAfter = Number.isFinite(taskResolvedAt) ? Math.max(repairTime, taskResolvedAt) : repairTime
      const chapter = findChapter(args.chapters, { chapterId: taskChapterId, chapterNo: taskChapterNo })
      if (!chapter) continue
      const chapterNo = Number(chapter?.chapter_no ?? chapter?.chapterNo ?? taskChapterNo)
      const latestQuality = latestQualityReviewForChapter(args.reviews, chapter, chapterNo)
      if (!qualityReviewPassed(latestQuality) || recordTime(latestQuality || {}) <= resolvedAfter) continue

      const group = repaired.get('repair') || {
        count: 0,
        chapterNos: new Set<number>(),
        issueTypes: new Set<string>(),
        labels: new Set<string>(),
        latestTime: 0,
      }
      group.count += 1
      if (chapterNo > 0) group.chapterNos.add(chapterNo)
      group.issueTypes.add(issueType)
      group.labels.add(deliveryRiskIssueLabel(issueType))
      group.latestTime = Math.max(group.latestTime, recordTime(latestQuality || {}), resolvedAfter)
      repaired.set('repair', group)
    }
  }

  const evidence: Array<AutoCreationDeliveryRiskResolution & { latestTime: number }> = [...repaired.values()]
    .map(group => {
      const chapterNos = [...group.chapterNos].sort((a, b) => a - b)
      const labels = [...group.labels]
      return {
        label: '任务修复已清',
        count: group.count,
        chapterNos,
        issueTypes: [...group.issueTypes],
        detail: `${chapterNos.length ? `第${chapterNos.join('、')}章` : '相关章节'} ${labels.join('、') || '交稿'}风险已处理，后续质量复检通过。`,
        latestTime: group.latestTime,
      }
    })

  for (const review of args.reviews) {
    if (text(review?.review_type) !== 'delivery_risk_convergence') continue
    const payload = reviewPayload(review)
    const convergence = payload?.delivery_risk_convergence || payload?.result?.delivery_risk_convergence || payload?.result || payload
    const afterCount = Number(convergence?.after_count ?? convergence?.afterCount ?? convergence?.after?.total_count ?? 0)
    if (!(text(convergence?.status) === 'cleared' || afterCount === 0)) continue
    const chapterNo = payloadReviewChapterNo(review, { ...payload, chapter_no: payload?.chapter_no || convergence?.chapter_no })
    const beforeCount = Number(convergence?.before_count ?? convergence?.beforeCount ?? convergence?.before?.total_count ?? convergence?.resolved_count ?? convergence?.resolvedCount ?? 0)
    const count = Number.isFinite(beforeCount) && beforeCount > 0 ? beforeCount : 1
    const label = firstText(convergence?.label, convergence?.summary, '风险已清零')
    evidence.push({
      label: '复检收敛已清',
      count,
      chapterNos: chapterNo > 0 ? [chapterNo] : [],
      issueTypes: ['delivery_risk_convergence'],
      detail: `${chapterNo > 0 ? `第${chapterNo}章` : '相关章节'} ${label}，复检收敛显示风险清零。`,
      latestTime: recordTime(review),
    })
  }

  return evidence
    .sort((a, b) => b.latestTime - a.latestTime)
    .map(({ latestTime: _latestTime, ...item }) => item)
}

export function latestDeliveryRiskReviews(reviews: AnyRecord[]) {
  const latest = new Map<string, AnyRecord>()
  for (const review of reviews) {
    const reviewType = text(review?.review_type)
    if (!DELIVERY_RISK_CONFIG[reviewType]) continue
    const payload = reviewPayload(review)
    const chapterId = payloadReviewChapterId(review, payload)
    const chapterNo = payloadReviewChapterNo(review, payload)
    const chapterKey = chapterId !== null && chapterId !== undefined
      ? `id:${chapterId}`
      : chapterNo > 0
        ? `no:${chapterNo}`
        : `review:${review?.id ?? latest.size}`
    const key = `${reviewType}:${chapterKey}`
    const current = latest.get(key)
    if (!current || recordTime(review) >= recordTime(current)) {
      latest.set(key, review)
    }
  }
  return Array.from(latest.values())
}

export function buildDeliveryRiskGate(args: {
  reviews: AnyRecord[]
  runRecords: AnyRecord[]
  chapters: AnyRecord[]
}): AutoCreationDeliveryRiskGate {
  const reviews = args.reviews
  const resolvedKeys = resolvedAnnotationKeys(reviews)
  const clearedChapters = clearedDeliveryRiskChapterKeys(reviews)
  const repairedIssueKeys = buildResolvedDeliveryRiskIssueKeys(args)
  const recentlyResolved = buildResolvedDeliveryRiskEvidence(args).slice(0, 4)
  const categoryMap = new Map<AutoCreationDeliveryRiskGateCategory['key'], AutoCreationDeliveryRiskGateCategory>()
  const topRisks: string[] = []

  for (const review of latestDeliveryRiskReviews(reviews)) {
    const reviewType = text(review?.review_type)
    const payload = reviewPayload(review)
    if (reviewType === 'prose_quality') {
      const chapterId = payloadReviewChapterId(review, payload)
      const chapterNo = payloadReviewChapterNo(review, payload)
      const qualityAuditChecks = qualityAuditRiskChecks(payload)
      if (qualityAuditChecks.length > 0) {
        const issueType = text(qualityAuditChecks[0]?.key || qualityAuditChecks[0]?.type || 'quality_audit_gap')
        const title = `质量诊断缺口 ${qualityAuditChecks.length}`
        if (!batchRiskIssueResolved(repairedIssueKeys, { chapterId, chapterNo, status: 'success' }, issueType)) {
          const annotationKey = deliveryRiskAnnotationKey({
            source: reviewType,
            reviewId: review?.id,
            chapterId,
            chapterNo,
            kind: issueType,
            title,
          })
          const clearedAt = Math.max(
            chapterId !== null && chapterId !== undefined ? clearedChapters.get(`id:${chapterId}`) || 0 : 0,
            chapterNo > 0 ? clearedChapters.get(`no:${chapterNo}`) || 0 : 0,
          )
          if (!resolvedKeys.has(annotationKey) && clearedAt <= recordTime(review)) {
            const current = categoryMap.get('quality_audit') || {
              key: 'quality_audit',
              label: '质量诊断',
              count: 0,
              highCount: 0,
            }
            current.count += qualityAuditChecks.length
            if (qualityAuditRiskHigh(qualityAuditChecks)) current.highCount += qualityAuditChecks.length
            categoryMap.set('quality_audit', current)
            topRisks.push(`质量诊断${chapterNo > 0 ? `第${chapterNo}章` : ''}：${qualityAuditRiskMessageFromChecks(qualityAuditChecks)}`)
          }
        }
      }
      const preDraftRisks = [
        {
          issueType: 'intent_confirmation_gap',
          title: '意图确认缺口',
          checks: preDraftExecutionRiskChecks(payload, 'intent_confirmation_checks', 'intentConfirmationChecks'),
        },
        {
          issueType: 'benchmark_recall_gap',
          title: '文风召回缺口',
          checks: preDraftExecutionRiskChecks(payload, 'benchmark_recall_checks', 'benchmarkRecallChecks'),
        },
      ]
      for (const preDraftRisk of preDraftRisks) {
        if (preDraftRisk.checks.length <= 0) continue
        const title = `${preDraftRisk.title} ${preDraftRisk.checks.length}`
        if (batchRiskIssueResolved(repairedIssueKeys, { chapterId, chapterNo, status: 'success' }, preDraftRisk.issueType)) continue
        const annotationKey = deliveryRiskAnnotationKey({
          source: reviewType,
          reviewId: review?.id,
          chapterId,
          chapterNo,
          kind: preDraftRisk.issueType,
          title,
        })
        const clearedAt = Math.max(
          chapterId !== null && chapterId !== undefined ? clearedChapters.get(`id:${chapterId}`) || 0 : 0,
          chapterNo > 0 ? clearedChapters.get(`no:${chapterNo}`) || 0 : 0,
        )
        if (resolvedKeys.has(annotationKey) || clearedAt > recordTime(review)) continue
        const current = categoryMap.get('pre_draft_execution') || {
          key: 'pre_draft_execution',
          label: '写前执行',
          count: 0,
          highCount: 0,
        }
        current.count += preDraftRisk.checks.length
        current.highCount += preDraftRisk.checks.length
        categoryMap.set('pre_draft_execution', current)
        topRisks.push(`写前执行${chapterNo > 0 ? `第${chapterNo}章` : ''}：${preDraftExecutionRiskMessage(preDraftRisk.checks)}`)
      }
      const sourceStateRisks = [
        {
          category: 'source_readiness' as const,
          label: '来源就绪',
          issueType: 'source_readiness_gap',
          title: '来源就绪缺口',
          checks: sourceStateRiskChecks(payload, 'source_readiness_checks', 'sourceReadinessChecks'),
        },
        {
          category: 'state_tracking' as const,
          label: '状态跟踪',
          issueType: 'state_tracking_gap',
          title: '状态跟踪缺口',
          checks: sourceStateRiskChecks(payload, 'state_tracking_checks', 'stateTrackingChecks'),
        },
        {
          category: 'style_boundary' as const,
          label: '风格边界',
          issueType: 'style_boundary_gap',
          title: '风格边界缺口',
          checks: sourceStateRiskChecks(payload, 'style_boundary_checks', 'styleBoundaryChecks'),
        },
        {
          category: 'information_flow' as const,
          label: '信息流',
          issueType: 'information_flow_gap',
          title: '信息流缺口',
          checks: sourceStateRiskChecks(payload, 'information_flow_checks', 'informationFlowChecks'),
        },
        {
          category: 'expectation_threshold' as const,
          label: '期待阈值',
          issueType: 'expectation_threshold_gap',
          title: '期待阈值缺口',
          checks: sourceStateRiskChecks(payload, 'expectation_threshold_checks', 'expectationThresholdChecks'),
        },
        {
          category: 'story_loop' as const,
          label: '故事闭环',
          issueType: 'story_loop_gap',
          title: '故事闭环缺口',
          checks: sourceStateRiskChecks(payload, 'story_loop_checks', 'storyLoopChecks'),
        },
        {
          category: 'emotional_arc' as const,
          label: '情绪弧',
          issueType: 'emotional_arc_gap',
          title: '情绪弧缺口',
          checks: sourceStateRiskChecks(payload, 'emotional_arc_checks', 'emotionalArcChecks'),
        },
        {
          category: 'chapter_hook' as const,
          label: '章级钩子',
          issueType: 'chapter_hook_gap',
          title: '章级钩子缺口',
          checks: sourceStateRiskChecks(payload, 'chapter_hook_checks', 'chapterHookChecks'),
        },
        {
          category: 'paragraph_hook' as const,
          label: '段落级钩子',
          issueType: 'paragraph_hook_gap',
          title: '段落级钩子缺口',
          checks: sourceStateRiskChecks(payload, 'paragraph_hook_checks', 'paragraphHookChecks'),
        },
        {
          category: 'suspense' as const,
          label: '悬念编排',
          issueType: 'suspense_gap',
          title: '悬念编排缺口',
          checks: sourceStateRiskChecks(payload, 'suspense_checks', 'suspenseChecks'),
        },
        {
          category: 'reversal' as const,
          label: '反转设计',
          issueType: 'reversal_gap',
          title: '反转设计缺口',
          checks: sourceStateRiskChecks(payload, 'reversal_checks', 'reversalChecks'),
        },
        {
          category: 'showdown' as const,
          label: '高潮对抗',
          issueType: 'showdown_gap',
          title: '高潮对抗缺口',
          checks: sourceStateRiskChecks(payload, 'showdown_checks', 'showdownChecks'),
        },
        {
          category: 'prose_craft' as const,
          label: '正文工艺',
          issueType: 'prose_craft_gap',
          title: '正文工艺缺口',
          checks: sourceStateRiskChecks(payload, 'prose_craft_checks', 'proseCraftChecks'),
        },
        {
          category: 'punctuation_tone' as const,
          label: '语气标点',
          issueType: 'punctuation_tone_gap',
          title: '语气标点缺口',
          checks: sourceStateRiskChecks(payload, 'punctuation_tone_checks', 'punctuationToneChecks'),
        },
        {
          category: 'content_rubric' as const,
          label: '内容基准',
          issueType: 'content_rubric_gap',
          title: '内容基准缺口',
          checks: sourceStateRiskChecks(payload, 'content_rubric_checks', 'contentRubricChecks'),
        },
        {
          category: 'target_reader' as const,
          label: '目标读者',
          issueType: 'target_reader_gap',
          title: '目标读者缺口',
          checks: sourceStateRiskChecks(payload, 'target_reader_checks', 'targetReaderChecks'),
        },
        {
          category: 'genre_positioning' as const,
          label: '题材定位',
          issueType: 'genre_positioning_gap',
          title: '题材定位缺口',
          checks: sourceStateRiskChecks(payload, 'genre_positioning_checks', 'genrePositioningChecks'),
        },
        {
          category: 'female_audience' as const,
          label: '女频长篇',
          issueType: 'female_audience_gap',
          title: '女频长篇缺口',
          checks: sourceStateRiskChecks(payload, 'female_audience_checks', 'femaleAudienceChecks'),
        },
        {
          category: 'upgrade_rhythm' as const,
          label: '升级节奏',
          issueType: 'upgrade_rhythm_gap',
          title: '升级节奏缺口',
          checks: sourceStateRiskChecks(payload, 'upgrade_rhythm_checks', 'upgradeRhythmChecks'),
        },
        {
          category: 'chapter_structure' as const,
          label: '章节结构',
          issueType: 'chapter_structure_gap',
          title: '章节结构缺口',
          checks: sourceStateRiskChecks(payload, 'structure_checks', 'structureChecks'),
        },
        {
          category: 'chapter_progression' as const,
          label: '章节推进',
          issueType: 'chapter_progression_gap',
          title: '章节推进缺口',
          checks: sourceStateRiskChecks(payload, 'progression_checks', 'progressionChecks'),
        },
        {
          category: 'information_load' as const,
          label: '信息负载',
          issueType: 'information_load_gap',
          title: '信息负载缺口',
          checks: sourceStateRiskChecks(payload, 'information_checks', 'informationChecks'),
        },
        {
          category: 'longform_continuity' as const,
          label: '长篇连续性',
          issueType: 'longform_continuity_gap',
          title: '长篇连续性缺口',
          checks: sourceStateRiskChecks(payload, 'longform_checks', 'longformChecks'),
        },
        {
          category: 'core_contract' as const,
          label: '核心契约',
          issueType: 'core_contract_gap',
          title: '核心契约缺口',
          checks: sourceStateRiskChecks(payload, 'core_contract_checks', 'coreContractChecks'),
        },
        {
          category: 'continuity_heat' as const,
          label: '连续性热度',
          issueType: 'continuity_heat_gap',
          title: '连续性热度缺口',
          checks: sourceStateRiskChecks(payload, 'continuity_heat_checks', 'continuityHeatChecks'),
        },
        {
          category: 'revision_receipt' as const,
          label: '修订回执',
          issueType: 'revision_receipt_gap',
          title: '修订回执缺口',
          checks: sourceStateRiskChecks(payload, 'revision_receipt_checks', 'revisionReceiptChecks'),
        },
        {
          category: 'deslop_repair' as const,
          label: '去AI味修复',
          issueType: 'deslop_repair_gap',
          title: '去AI味修复缺口',
          checks: sourceStateRiskChecks(payload, 'deslop_repair_checks', 'deslopRepairChecks'),
        },
        {
          category: 'prose_meta' as const,
          label: '正文元叙事',
          issueType: 'prose_meta_gap',
          title: '正文元叙事缺口',
          checks: sourceStateRiskChecks(payload, 'prose_meta_checks', 'proseMetaChecks'),
        },
        {
          category: 'serial_risk_repair' as const,
          label: '连续风险修复',
          issueType: 'serial_risk_repair_gap',
          title: '连续风险修复缺口',
          checks: sourceStateRiskChecks(payload, 'serial_risk_repair_checks', 'serialRiskRepairChecks'),
        },
        {
          category: 'chapter_hook_quality' as const,
          label: '章钩质量',
          issueType: 'chapter_hook_quality_gap',
          title: '章钩质量缺口',
          checks: sourceStateRiskChecks(payload, 'chapter_hook_quality_checks', 'chapterHookQualityChecks'),
        },
        {
          category: 'reader_retention' as const,
          label: '追读雷达',
          issueType: 'reader_retention_gap',
          title: '追读雷达缺口',
          checks: sourceStateRiskChecks(payload, 'reader_retention_checks', 'readerRetentionChecks'),
        },
        {
          category: 'asset_linkage' as const,
          label: '资产挂钩',
          issueType: 'asset_linkage_gap',
          title: '资产挂钩缺口',
          checks: sourceStateRiskChecks(payload, 'asset_linkage_checks', 'assetLinkageChecks'),
        },
        {
          category: 'dialogue' as const,
          label: '对白质量',
          issueType: 'dialogue_gap',
          title: '对白质量缺口',
          checks: sourceStateRiskChecks(payload, 'dialogue_checks', 'dialogueChecks'),
        },
        {
          category: 'plot_dynamics' as const,
          label: '剧情动力',
          issueType: 'plot_dynamics_gap',
          title: '剧情动力缺口',
          checks: sourceStateRiskChecks(payload, 'plot_dynamics_checks', 'plotDynamicsChecks'),
        },
        {
          category: 'character_relation' as const,
          label: '角色关系',
          issueType: 'character_relation_gap',
          title: '角色关系缺口',
          checks: sourceStateRiskChecks(payload, 'character_relation_checks', 'characterRelationChecks'),
        },
        {
          category: 'character_behavior' as const,
          label: '角色行为',
          issueType: 'character_behavior_gap',
          title: '角色行为缺口',
          checks: sourceStateRiskChecks(payload, 'character_behavior_checks', 'characterBehaviorChecks'),
        },
        {
          category: 'conflict_structure' as const,
          label: '冲突结构',
          issueType: 'conflict_structure_gap',
          title: '冲突结构缺口',
          checks: sourceStateRiskChecks(payload, 'conflict_structure_checks', 'conflictStructureChecks'),
        },
        {
          category: 'bridge_unit' as const,
          label: '桥段节奏',
          issueType: 'bridge_unit_gap',
          title: '桥段节奏缺口',
          checks: sourceStateRiskChecks(payload, 'bridge_unit_checks', 'bridgeUnitChecks'),
        },
        {
          category: 'opening' as const,
          label: '开篇设计',
          issueType: 'opening_gap',
          title: '开篇设计缺口',
          checks: sourceStateRiskChecks(payload, 'opening_checks', 'openingChecks'),
        },
      ]
      for (const sourceStateRisk of sourceStateRisks) {
        if (sourceStateRisk.checks.length <= 0) continue
        const title = `${sourceStateRisk.title} ${sourceStateRisk.checks.length}`
        if (batchRiskIssueResolved(repairedIssueKeys, { chapterId, chapterNo, status: 'success' }, sourceStateRisk.issueType)) continue
        const annotationKey = deliveryRiskAnnotationKey({
          source: reviewType,
          reviewId: review?.id,
          chapterId,
          chapterNo,
          kind: sourceStateRisk.issueType,
          title,
        })
        const clearedAt = Math.max(
          chapterId !== null && chapterId !== undefined ? clearedChapters.get(`id:${chapterId}`) || 0 : 0,
          chapterNo > 0 ? clearedChapters.get(`no:${chapterNo}`) || 0 : 0,
        )
        if (resolvedKeys.has(annotationKey) || clearedAt > recordTime(review)) continue
        const current = categoryMap.get(sourceStateRisk.category) || {
          key: sourceStateRisk.category,
          label: sourceStateRisk.label,
          count: 0,
          highCount: 0,
        }
        current.count += sourceStateRisk.checks.length
        current.highCount += sourceStateRisk.checks.length
        categoryMap.set(sourceStateRisk.category, current)
        topRisks.push(`${sourceStateRisk.label}${chapterNo > 0 ? `第${chapterNo}章` : ''}：${sourceStateRiskMessage(sourceStateRisk.checks)}`)
      }
    }
    const config = DELIVERY_RISK_CONFIG[reviewType]
    if (!config) continue
    const risk = riskPayload(review, config.payloadKey)
    const count = Math.max(0, Number(config.count(review) || 0))
    if (count <= 0 && text(risk?.status) !== 'warn') continue
    const normalizedCount = Math.max(1, count)
    const chapterId = payloadReviewChapterId(review, payload)
    const chapterNo = payloadReviewChapterNo(review, payload)
    if (batchRiskIssueResolved(repairedIssueKeys, { chapterId, chapterNo, status: 'success' }, config.issueType)) continue
    const clearedAt = Math.max(
      chapterId !== null && chapterId !== undefined ? clearedChapters.get(`id:${chapterId}`) || 0 : 0,
      chapterNo > 0 ? clearedChapters.get(`no:${chapterNo}`) || 0 : 0,
    )
    if (clearedAt > recordTime(review)) continue
    const title = config.title(risk, normalizedCount)
    const annotationKey = deliveryRiskAnnotationKey({
      source: reviewType,
      reviewId: review?.id,
      chapterId,
      chapterNo,
      kind: config.kind,
      title,
    })
    if (resolvedKeys.has(annotationKey)) continue

    const high = config.high(risk, normalizedCount)
    const current = categoryMap.get(config.category) || {
      key: config.category,
      label: config.label,
      count: 0,
      highCount: 0,
    }
    current.count += normalizedCount
    if (high) current.highCount += normalizedCount
    categoryMap.set(config.category, current)
    topRisks.push(`${config.label}${chapterNo > 0 ? `第${chapterNo}章` : ''}：${config.message(risk)}`)
  }

  const categories = [...categoryMap.values()]
  const totalOpen = categories.reduce((sum, item) => sum + item.count, 0)
  const highOpen = categories.reduce((sum, item) => sum + item.highCount, 0)
  const status: AutoCreationDeliveryRiskGateStatus = highOpen > 0 ? 'block' : totalOpen > 0 ? 'warn' : 'ok'

  return {
    status,
    label: status === 'ok' ? '交稿风险已清' : status === 'block' ? `高风险 ${highOpen}` : `未清风险 ${totalOpen}`,
    summary: status === 'ok'
      ? '批注池没有未处理的交稿风险，可以按现有护栏推进。'
      : `批注池还有 ${totalOpen} 项交稿风险未清，其中高风险 ${highOpen} 项；先修正核心、追读、回报、创新、强场面、剧情线、剧情单元或可读性问题，再扩大连写批次。`,
    totalOpen,
    highOpen,
    categories,
    topRisks: topRisks.slice(0, 4),
    recentlyResolved,
  }
}

export function taskTitle(task: AnyRecord) {
  return firstText(task?.title, task?.message, task?.summary, task?.issue, task?.description, task?.issue_type, task?.issueType)
}

export function isStorylineDecisionTask(task: AnyRecord, output: AnyRecord) {
  const source = text(task?.source || output?.source)
  const issueType = text(task?.issue_type || task?.issueType)
  return source === 'storyline_diff_decision'
    || issueType.startsWith('storyline_diff_')
    || Boolean(task?.decision_key || task?.decisionKey)
}

export function buildStorylineDecisionGate(runRecords: AnyRecord[]): AutoCreationStorylineDecisionGate {
  const openTasks: AnyRecord[] = []
  for (const run of runRecords.filter(item => text(item?.run_type) === 'longform_production_repair')) {
    const output = parsePayload(run?.output_ref, { owner: run, kind: 'run', field: 'output_ref' }) || {}
    const tasks = [
      ...arrayValue(output?.tasks),
      ...arrayValue(output?.repairTasks),
    ]
    for (const task of tasks) {
      if (!isStorylineDecisionTask(task, output)) continue
      const status = text(task?.task_status ?? task?.status)
      if (isResolvedTaskStatus(status)) continue
      if (['ignored', 'false_positive'].includes(status)) continue
      openTasks.push(task)
    }
  }

  const openCount = openTasks.length
  const taskTitles = issueTexts(openTasks.map(task => taskTitle(task)), 3)
  if (openCount <= 0) {
    return {
      status: 'ok',
      label: '剧情线决策已闭环',
      summary: '剧情线差异决策任务已处理并通过复检，不阻止安全连写。',
      openCount: 0,
      taskTitles: [],
    }
  }

  return {
    status: 'block',
    label: `剧情线决策 ${openCount}`,
    summary: `还有 ${openCount} 个剧情线决策任务未闭环；先在任务中心完成回修或计划同步，并通过剧情线同步复检后，再放行安全连写。`,
    openCount,
    taskTitles,
  }
}

export function latestRepairAuditEntry(runRecords: AnyRecord[]) {
  return runRecords
    .filter(run => text(run?.run_type) === 'longform_production_repair')
    .map(run => ({ run, output: parsePayload(run?.output_ref, { owner: run, kind: 'run', field: 'output_ref' }) || {} }))
    .sort((a, b) => recordTime(b.run) - recordTime(a.run))
    .map(item => ({ run: item.run, audit: item.output?.audit_summary || item.output?.auditSummary }))
    .find(item => item.audit) || null
}

export function compactUniqueText(values: any[], limit = 120) {
  return Array.from(new Set(values.map(item => firstText(item)).filter(Boolean).map(item => item.length > limit ? `${item.slice(0, limit)}…` : item)))
}

export function recoveryEvidenceSourceSummary(recoveryClosure: AnyRecord | null) {
  if (!recoveryClosure) return ''
  const tasks = arrayValue(recoveryClosure?.tasks)
  const singleChapterCount = Number(recoveryClosure?.single_chapter_count ?? recoveryClosure?.singleChapterCount ?? 0)
    || tasks.filter((task: any) => text(task?.source || task?.sourceMode) === 'single_chapter_governance_recheck').length
  const batchCount = Number(recoveryClosure?.batch_count ?? recoveryClosure?.batchCount ?? 0)
    || tasks.filter((task: any) => text(task?.source || task?.sourceMode) === 'safe_batch_recovery_recheck').length
  const genericCount = Math.max(0, Number(recoveryClosure?.total || 0) - singleChapterCount - batchCount)
  return [
    singleChapterCount > 0 ? `单章治理复查 ${singleChapterCount}` : '',
    batchCount > 0 ? `批次恢复复查 ${batchCount}` : '',
    genericCount > 0 ? `恢复依据复查 ${genericCount}` : '',
  ].filter(Boolean).join('；')
}

export function recoveryEvidenceSourceMeta(task: AnyRecord) {
  const source = text(task?.source || task?.sourceMode)
  const sourceLabel = firstText(task?.source_label, task?.sourceLabel)
  if (source === 'single_chapter_governance_recheck') return { source, label: sourceLabel || '单章治理复查' }
  if (source === 'safe_batch_recovery_recheck') return { source, label: sourceLabel || '批次恢复复查' }
  if (text(task?.annotation_source || task?.annotationSource) === 'governance_recheck_sync') {
    return { source: 'single_chapter_governance_recheck', label: sourceLabel || '单章治理复查' }
  }
  if (text(task?.source) === 'auto_creation_safe_batch_risk' || task?.segment) {
    return { source: 'safe_batch_recovery_recheck', label: sourceLabel || '批次恢复复查' }
  }
  return { source: source || 'recovery_evidence_recheck', label: sourceLabel || '恢复依据复查' }
}

export function recoveryEvidenceReview(task: AnyRecord) {
  return task?.recovery_evidence_review || task?.recoveryEvidenceReview || {}
}

export function recoveryEvidenceResidualTexts(task: AnyRecord) {
  const review = recoveryEvidenceReview(task)
  const failedItems = [
    ...arrayValue(review?.failed_items),
    ...arrayValue(review?.failedItems),
  ]
  return compactUniqueText([
    ...arrayValue(review?.failed_evidence),
    ...arrayValue(review?.failedEvidence),
    ...failedItems.map((item: any) => firstText(item?.evidence, item)),
  ], 100).slice(0, 3)
}

export function recoveryEvidenceSourceTaskStatus(task: AnyRecord) {
  const review = recoveryEvidenceReview(task)
  const taskStatus = text(task?.task_status ?? task?.taskStatus ?? task?.status).toLowerCase()
  const reviewStatus = text(review?.status).toLowerCase()
  const residualEvidence = recoveryEvidenceResidualTexts(task)
  const hasResidual = residualEvidence.length > 0 || reviewStatus === 'warn' || taskStatus === 'needs_review'
  const closed = ['resolved', 'closed', 'done', 'completed'].includes(taskStatus) || reviewStatus === 'ok'
  const resultStatus = hasResidual ? 'blocked' : closed ? 'cleared' : 'pending'
  return {
    resultStatus,
    residualEvidence,
  }
}

export function recoveryEvidenceProductionStatusLabel(status: string) {
  if (status === 'cleared') return '生产阻断已解除'
  if (status === 'pending') return '等待复检结论'
  return '暂缓安全连写'
}

export function finiteNumberOrNull(value: any) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

export function recoveryEvidenceProductionGateNextActionFromSource(source: AnyRecord, action: string, label: string) {
  return {
    action,
    label,
    source: text(source?.source || source?.sourceMode),
    sourceLabel: text(source?.label || source?.sourceLabel),
    status: text(source?.status),
    residualEvidence: arrayValue(source?.residual_evidence || source?.residualEvidence).map(item => text(item)).filter(Boolean),
  }
}

export function buildRecoveryEvidenceProductionGateNextAction(sources: AnyRecord[]) {
  const singleResidual = sources.find(source =>
    text(source?.source) === 'single_chapter_governance_recheck'
    && text(source?.status) === 'blocked'
    && arrayValue(source?.residual_evidence || source?.residualEvidence).length > 0,
  )
  if (singleResidual) {
    return recoveryEvidenceProductionGateNextActionFromSource(singleResidual, 'revision', '回修依据')
  }

  const batchResidual = sources.find(source =>
    text(source?.source) === 'safe_batch_recovery_recheck'
    && text(source?.status) === 'blocked'
    && arrayValue(source?.residual_evidence || source?.residualEvidence).length > 0,
  )
  if (batchResidual) {
    return recoveryEvidenceProductionGateNextActionFromSource(batchResidual, 'focus_task', '定位批次任务')
  }

  const genericResidual = sources.find(source =>
    text(source?.status) === 'blocked'
    && arrayValue(source?.residual_evidence || source?.residualEvidence).length > 0,
  )
  if (genericResidual) {
    return recoveryEvidenceProductionGateNextActionFromSource(genericResidual, 'focus_task', '定位任务')
  }

  const singlePending = sources.find(source => text(source?.source) === 'single_chapter_governance_recheck' && text(source?.status) === 'pending')
  if (singlePending) {
    return recoveryEvidenceProductionGateNextActionFromSource(singlePending, 'recheck_single_chapter', '复检单章')
  }

  const batchPending = sources.find(source => text(source?.source) === 'safe_batch_recovery_recheck' && text(source?.status) === 'pending')
  if (batchPending) {
    return recoveryEvidenceProductionGateNextActionFromSource(batchPending, 'recheck_safe_batch', '复盘批次')
  }

  const unresolved = sources.find(source => text(source?.status) !== 'cleared')
  if (unresolved) {
    return recoveryEvidenceProductionGateNextActionFromSource(unresolved, 'review_governance_closure', '治理复查台')
  }

  return null
}

export function recoveryEvidenceGovernanceQueueTaskAction(source: AnyRecord) {
  const sourceKey = text(source?.source || source?.sourceMode)
  const status = text(source?.status)
  const residualEvidence = arrayValue(source?.residual_evidence || source?.residualEvidence).map(item => text(item)).filter(Boolean)
  if (status === 'blocked' && residualEvidence.length > 0) {
    if (sourceKey === 'single_chapter_governance_recheck') return { actionKey: 'revision', label: '回修依据' }
    if (sourceKey === 'safe_batch_recovery_recheck') return { actionKey: 'focus_task', label: '定位批次任务' }
    return { actionKey: 'focus_task', label: '定位任务' }
  }
  if (status === 'pending') {
    if (sourceKey === 'single_chapter_governance_recheck') return { actionKey: 'recheck_single_chapter', label: '复检单章' }
    if (sourceKey === 'safe_batch_recovery_recheck') return { actionKey: 'recheck_safe_batch', label: '复盘批次' }
  }
  return { actionKey: 'review_governance_closure', label: '治理复查台' }
}

export function recoveryEvidenceGovernanceQueueExecutionMeta(source: AnyRecord, actionKey: string) {
  const sourceTasks = arrayValue(source?.source_tasks || source?.sourceTasks)
  const firstTask = sourceTasks[0] || {}
  const sourceTaskIndex = finiteNumberOrNull(firstTask?.source_task_index ?? firstTask?.sourceTaskIndex ?? firstTask?.task_index ?? firstTask?.taskIndex)
  const chapterId = finiteNumberOrNull(firstTask?.chapter_id ?? firstTask?.chapterId)
  const chapterNo = finiteNumberOrNull(firstTask?.chapter_no ?? firstTask?.chapterNo)
  const meta: AnyRecord = {
    source_task_index: sourceTaskIndex,
    source_task_indices: arrayValue(source?.source_task_indices || source?.sourceTaskIndices),
    chapter_id: chapterId,
    chapter_no: chapterNo,
    chapter_ids: arrayValue(source?.chapter_ids || source?.chapterIds),
    chapter_nos: arrayValue(source?.chapter_nos || source?.chapterNos),
  }

  if (actionKey === 'revision') {
    return {
      ...meta,
      recheck_mode: 'single_chapter',
      recheck_source: 'governance_recheck_sync',
      closure_status: 'blocked_until_recheck',
      auto_recheck: true,
      requires_manual_repair: false,
    }
  }

  if (actionKey === 'recheck_single_chapter') {
    return {
      ...meta,
      recheck_mode: 'single_chapter',
      recheck_source: 'governance_recheck_sync',
      closure_status: 'blocked_until_recheck',
      auto_recheck: true,
      requires_manual_repair: false,
    }
  }

  if (actionKey === 'recheck_safe_batch') {
    return {
      ...meta,
      recheck_mode: 'batch_audit',
      recheck_source: 'longform_repair_audit_summary',
      closure_status: 'blocked_until_batch_audit',
      auto_recheck: true,
      requires_manual_repair: false,
    }
  }

  if (actionKey === 'focus_task') {
    return {
      ...meta,
      recheck_mode: 'manual_then_batch_audit',
      recheck_source: 'longform_repair_audit_summary',
      closure_status: 'blocked_until_batch_audit',
      auto_recheck: false,
      requires_manual_repair: true,
    }
  }

  if (actionKey === 'deep_repair_single_brief') {
    return {
      ...meta,
      recheck_mode: 'single_chapter_deep_repair',
      recheck_source: 'recovery_evidence_source_deep_repair',
      closure_status: 'blocked_until_single_brief_deep_repair',
      auto_recheck: false,
      requires_manual_repair: true,
    }
  }

  if (actionKey === 'deep_repair_batch_brief') {
    return {
      ...meta,
      recheck_mode: 'batch_brief_deep_repair',
      recheck_source: 'recovery_evidence_source_deep_repair',
      closure_status: 'blocked_until_batch_brief_deep_repair',
      auto_recheck: false,
      requires_manual_repair: true,
    }
  }

  return {
    ...meta,
    recheck_mode: 'governance_closure',
    recheck_source: 'longform_repair_audit_summary',
    closure_status: 'blocked_until_governance_review',
    auto_recheck: false,
    requires_manual_repair: false,
  }
}

export function buildRecoveryEvidenceGovernanceQueue(snapshot: AnyRecord, nextAction: AnyRecord | null) {
  const sources = arrayValue(snapshot?.sources)
  const unresolvedSources = sources.filter(source => text(source?.status) !== 'cleared')
  const mainAction = nextAction || {
    action: 'review_governance_closure',
    label: '治理复查台',
    source: 'recovery_evidence_production_gate',
    sourceLabel: '恢复依据生产闸门',
    status: text(snapshot?.status),
    residualEvidence: [],
  }
  const tasks = unresolvedSources.map((source, index) => {
    const action = recoveryEvidenceGovernanceQueueTaskAction(source)
    const residualEvidence = arrayValue(source?.residual_evidence || source?.residualEvidence).map(item => text(item)).filter(Boolean)
    const sourceLabel = text(source?.label || source?.sourceLabel || source?.source, '恢复依据来源')
    const statusLabel = text(source?.status_label || source?.statusLabel, recoveryEvidenceProductionStatusLabel(text(source?.status)))
    const executionMeta = recoveryEvidenceGovernanceQueueExecutionMeta(source, action.actionKey)
    return {
      issue_type: 'recovery_evidence_governance_queue',
      severity: text(source?.status) === 'blocked' ? 'high' : 'medium',
      task_status: 'needs_review',
      source: text(source?.source || source?.sourceMode),
      source_label: sourceLabel,
      source_status: text(source?.status),
      source_status_label: statusLabel,
      action_key: action.actionKey,
      action_label: action.label,
      ...executionMeta,
      title: `${sourceLabel}：${action.label}`,
      message: residualEvidence.length
        ? `${statusLabel}：${residualEvidence.join('；')}`
        : `${statusLabel}，需要先完成${action.label}再恢复安全连写。`,
      action: `${action.label}后刷新恢复依据审计，确认该来源从暂缓安全连写/等待复检结论变为生产阻断已解除。`,
      recovery_evidence_review: {
        status: residualEvidence.length ? 'warn' : 'pending',
        summary: residualEvidence.length ? `残留依据：${residualEvidence.join('；')}` : '等待复检结论回填。',
        failed_evidence: residualEvidence,
      },
      acceptance_criteria: [
        `${sourceLabel}显示生产阻断已解除`,
        '恢复依据审计无残留 failed_evidence',
        '总控台恢复依据生产闸门允许继续安全连写',
      ],
      queue_index: index,
    }
  })
  const nextCycleType = ['revision', 'focus_task'].includes(text(mainAction.action)) ? 'revision_batch' : 'recheck_summary'
  return {
    source: 'recovery_evidence_production_gate',
    status: text(snapshot?.status),
    summary: `恢复依据生产闸门阻断，先执行「${text(mainAction.label, '治理复查台')}」并沉淀为连续治理队列。`,
    main_action: mainAction,
    source_count: Number(snapshot?.source_count || sources.length || 0),
    sources,
    tasks,
    next_cycle: {
      type: nextCycleType,
      label: nextCycleType === 'revision_batch' ? '下一轮修订批次' : '下一轮复检批次摘要',
    },
    recommendations: [
      `先处理主动作「${text(mainAction.label, '治理复查台')}」，不要带着未解除恢复依据进入安全连写。`,
      '处理后重新生成恢复依据审计摘要，确认单章/批次来源均变为生产阻断已解除。',
      '审计闭环后再回到总控台恢复 2-3 章安全连写。',
    ],
  }
}

export function buildRecoveryEvidenceProductionGate(runRecords: AnyRecord[]) {
  const auditEntry = latestRepairAuditEntry(runRecords)
  const audit = auditEntry?.audit || null
  const closure = audit?.recovery_evidence_closure || audit?.recoveryEvidenceClosure || null
  const tasks = arrayValue(closure?.tasks)
  if (!closure || tasks.length === 0) {
    const detail = '暂无恢复依据来源复检阻断。'
    return {
      signal: signal('恢复依据生产闸门', 'ok', detail),
      snapshot: {
        status: 'ok',
        label: '恢复依据生产闸门',
        detail,
        source_count: 0,
        sources: [],
        next_action: null,
      },
    }
  }

  const groups = new Map<string, {
    source: string
    label: string
    statuses: string[]
    residualEvidence: string[]
    sourceTasks: AnyRecord[]
  }>()
  for (const [taskIndex, task] of tasks.entries()) {
    const meta = recoveryEvidenceSourceMeta(task)
    const status = recoveryEvidenceSourceTaskStatus(task)
    const group = groups.get(meta.source) || { source: meta.source, label: meta.label, statuses: [], residualEvidence: [], sourceTasks: [] }
    group.statuses.push(status.resultStatus)
    group.residualEvidence.push(...status.residualEvidence)
    const sourceTaskIndex = finiteNumberOrNull(task?.task_index ?? task?.taskIndex)
    group.sourceTasks.push({
      ...task,
      source_task_index: sourceTaskIndex ?? taskIndex,
    })
    groups.set(meta.source, group)
  }

  const sourceDetails = Array.from(groups.values()).map(group => {
    const uniqueResiduals = compactUniqueText(group.residualEvidence, 80).slice(0, 2)
    const sourceStatus = group.statuses.includes('blocked')
      ? 'blocked'
      : group.statuses.every(status => status === 'cleared') ? 'cleared' : 'pending'
    if (sourceStatus === 'cleared') return `${group.label}：生产阻断已解除`
    if (sourceStatus === 'pending') return `${group.label}：等待复检结论`
    return `${group.label}：暂缓安全连写${uniqueResiduals.length ? `（${uniqueResiduals.join('；')}）` : ''}`
  })
  const blocked = sourceDetails.some(item => item.includes('暂缓安全连写') || item.includes('等待复检结论'))
  const sources = Array.from(groups.values()).map(group => {
    const residualEvidence = compactUniqueText(group.residualEvidence, 80).slice(0, 3)
    const sourceStatus = group.statuses.includes('blocked')
      ? 'blocked'
      : group.statuses.every(status => status === 'cleared') ? 'cleared' : 'pending'
    const sourceTaskIndices = Array.from(new Set(group.sourceTasks.map(task => finiteNumberOrNull(task?.source_task_index ?? task?.sourceTaskIndex)).filter(item => item !== null)))
    const chapterIds = Array.from(new Set(group.sourceTasks.map(task => finiteNumberOrNull(task?.chapter_id ?? task?.chapterId)).filter(item => item !== null)))
    const chapterNos = Array.from(new Set(group.sourceTasks.map(task => finiteNumberOrNull(task?.chapter_no ?? task?.chapterNo)).filter(item => item !== null)))
    return {
      source: group.source,
      label: group.label,
      status: sourceStatus,
      status_label: recoveryEvidenceProductionStatusLabel(sourceStatus),
      residual_evidence: residualEvidence,
      task_count: group.statuses.length,
      source_task_index: sourceTaskIndices[0] ?? null,
      source_task_indices: sourceTaskIndices,
      chapter_id: chapterIds[0] ?? null,
      chapter_ids: chapterIds,
      chapter_no: chapterNos[0] ?? null,
      chapter_nos: chapterNos,
      source_tasks: group.sourceTasks,
    }
  })
  const nextAction = buildRecoveryEvidenceProductionGateNextAction(sources)

  if (!blocked) {
    const detail = `恢复依据生产闸门：${sourceDetails.join('；')}，可恢复安全连写。`
    return {
      signal: signal('恢复依据生产闸门', 'ok', detail),
      snapshot: {
        status: 'ok',
        label: '恢复依据生产闸门',
        detail,
        source_count: sources.length,
        sources,
        next_action: nextAction,
      },
    }
  }
  const detail = `恢复依据生产闸门：${sourceDetails.join('；')}。先完成回修/复检，再恢复 2-3 章安全连写。`
  return {
    signal: signal('恢复依据生产闸门', 'block', detail),
    snapshot: {
      status: 'block',
      label: '恢复依据生产闸门',
      detail,
      source_count: sources.length,
      sources,
      next_action: nextAction,
    },
  }
}

export function buildGovernanceClosureBrief(args: {
  runRecords: AnyRecord[]
  storylineDecisionGate: AutoCreationStorylineDecisionGate
}): AutoCreationGovernanceClosureBrief {
  const auditEntry = latestRepairAuditEntry(args.runRecords)
  const audit = auditEntry?.audit || null
  const recoveryClosure = audit?.recovery_evidence_closure || audit?.recoveryEvidenceClosure || null
  const recoverySourceSummary = recoveryEvidenceSourceSummary(recoveryClosure)
  const failedEvidence = recoveryClosure && recoveryClosure.status !== 'closed' && Number(recoveryClosure.total || 0) > 0
    ? compactUniqueText([
      ...arrayValue(recoveryClosure.failed_evidence),
      ...arrayValue(recoveryClosure.failedEvidence),
    ], 120).slice(0, 4)
    : []
  const recoveryWatchItems = recoveryClosure && recoveryClosure.status !== 'closed' && Number(recoveryClosure.total || 0) > 0
    ? compactUniqueText([
      ...arrayValue(recoveryClosure.watch_items),
      ...arrayValue(recoveryClosure.watchItems),
    ], 120).slice(0, 4)
    : []
  const issueLabels = [
    failedEvidence.length ? `恢复依据审计 ${Number(recoveryClosure?.resolved || 0)}/${Number(recoveryClosure?.total || 0)}${recoverySourceSummary ? `（${recoverySourceSummary}）` : ''}` : '',
    args.storylineDecisionGate.openCount > 0 ? `剧情线决策 ${args.storylineDecisionGate.openCount}` : '',
  ].filter(Boolean)
  const watchItems = compactUniqueText([
    ...failedEvidence,
    ...recoveryWatchItems,
    ...args.storylineDecisionGate.taskTitles,
  ], 120).slice(0, 6)

  if (!issueLabels.length) {
    return {
      status: 'ok',
      label: '治理闭环',
      summary: '长线治理闭环没有发现需要前置处理的恢复依据审计或剧情线决策任务。',
      count: 0,
      sourceSummary: recoverySourceSummary,
      failedEvidence: [],
      watchItems: [],
      action: opsAction('open_task_center', '打开任务中心', '查看长线治理闭环记录。'),
    }
  }

  return {
    status: 'block',
    label: '治理闭环',
    summary: `${issueLabels.join('；')} 未闭环：${watchItems.slice(0, 3).join('；') || '先回任务中心完成复查或修订。'}`,
    count: issueLabels.length,
    sourceSummary: recoverySourceSummary,
    failedEvidence,
    watchItems,
    action: opsAction('review_governance_closure', '治理复查台', '生成最新恢复依据审计，并打开任务中心定位剧情线决策复检。', false, {
      repairAuditRunId: auditEntry?.run?.id || null,
      recoveryEvidenceStatus: text(recoveryClosure?.status),
      recoveryEvidenceResolved: Number(recoveryClosure?.resolved || 0),
      recoveryEvidenceTotal: Number(recoveryClosure?.total || 0),
      recoveryEvidenceSourceSummary: recoverySourceSummary,
      failedEvidence,
      watchItems: recoveryWatchItems,
      storylineDecisionTaskCount: args.storylineDecisionGate.openCount,
      storylineDecisionTaskTitles: args.storylineDecisionGate.taskTitles.slice(0, 6),
    }),
  }
}

export function governanceMemoryFromAudit(
  audit: AnyRecord | null,
  auditEntry: { run: AnyRecord; audit: AnyRecord } | null,
  storylineDecisionGate: AutoCreationStorylineDecisionGate,
): AutoCreationGovernanceRecheckMemory | null {
  const memory = audit?.governance_recheck_memory || audit?.governanceRecheckMemory || null
  if (!memory) return null
  const rawStatus = text(memory?.status)
  if (!['closed', 'needs_followup'].includes(rawStatus)) return null
  const storylineDecisionTaskCount = Math.max(
    Number(memory?.storyline_decision_task_count ?? memory?.storylineDecisionTaskCount ?? 0),
    storylineDecisionGate.openCount,
  )
  const status: AutoCreationGovernanceRecheckMemoryStatus = rawStatus === 'closed' && storylineDecisionTaskCount === 0
    ? 'closed'
    : 'needs_followup'
  const evidence = compactUniqueText([
    ...arrayValue(memory?.evidence),
    ...arrayValue(memory?.repaired_evidence),
    ...arrayValue(memory?.repairedEvidence),
  ], 120).slice(0, 5)
  const failedEvidence = compactUniqueText([
    ...arrayValue(memory?.failed_evidence),
    ...arrayValue(memory?.failedEvidence),
  ], 120).slice(0, 5)
  const watchItems = compactUniqueText([
    ...arrayValue(memory?.watch_items),
    ...arrayValue(memory?.watchItems),
    ...storylineDecisionGate.taskTitles,
  ], 120).slice(0, 6)
  const sourceRunId = memory?.source_run_id ?? memory?.sourceRunId ?? auditEntry?.run?.id ?? null

  if (status === 'closed') {
    return {
      visible: true,
      status,
      label: text(memory?.label, '治理复查已记录'),
      summary: text(memory?.summary, '恢复依据审计已闭环，今日生产可沿用上一轮复查证据。'),
      evidence,
      failedEvidence,
      watchItems,
      storylineDecisionTaskCount: 0,
      sourceRunId,
      action: opsAction('open_task_center', '查看治理记录', '打开任务中心查看恢复依据审计和复查证据。'),
    }
  }

  return {
    visible: true,
    status,
    label: text(memory?.label, '治理复查待处理'),
    summary: text(memory?.summary, '仍有治理复查记忆需要处理或观察。'),
    evidence,
    failedEvidence,
    watchItems,
    storylineDecisionTaskCount,
    sourceRunId,
    action: opsAction('review_governance_closure', '治理复查台', '刷新恢复依据审计，并打开任务中心定位剧情线决策复检。', false, {
      repairAuditRunId: sourceRunId,
      recoveryEvidenceStatus: rawStatus,
      failedEvidence,
      watchItems,
      storylineDecisionTaskCount,
      storylineDecisionTaskTitles: storylineDecisionGate.taskTitles.slice(0, 6),
    }),
  }
}

export function buildGovernanceRecheckMemory(args: {
  runRecords: AnyRecord[]
  storylineDecisionGate: AutoCreationStorylineDecisionGate
}): AutoCreationGovernanceRecheckMemory {
  const auditEntry = latestRepairAuditEntry(args.runRecords)
  const audit = auditEntry?.audit || null
  const explicitMemory = governanceMemoryFromAudit(audit, auditEntry, args.storylineDecisionGate)
  if (explicitMemory) return explicitMemory
  const recoveryClosure = audit?.recovery_evidence_closure || audit?.recoveryEvidenceClosure || null
  const total = Number(recoveryClosure?.total || 0)
  const resolved = Number(recoveryClosure?.resolved || 0)
  const repairedEvidence = compactUniqueText([
    ...arrayValue(recoveryClosure?.repaired_evidence),
    ...arrayValue(recoveryClosure?.repairedEvidence),
  ], 120).slice(0, 5)
  const failedEvidence = compactUniqueText([
    ...arrayValue(recoveryClosure?.failed_evidence),
    ...arrayValue(recoveryClosure?.failedEvidence),
  ], 120).slice(0, 5)
  const watchItems = compactUniqueText([
    ...arrayValue(recoveryClosure?.watch_items),
    ...arrayValue(recoveryClosure?.watchItems),
    ...args.storylineDecisionGate.taskTitles,
  ], 120).slice(0, 6)
  const closed = Boolean(recoveryClosure && text(recoveryClosure.status) === 'closed' && total > 0 && args.storylineDecisionGate.openCount === 0)
  const needsFollowup = Boolean((recoveryClosure && text(recoveryClosure.status) !== 'closed' && total > 0) || args.storylineDecisionGate.openCount > 0)

  if (!closed && !needsFollowup) {
    return {
      visible: false,
      status: 'empty',
      label: '治理复查',
      summary: '还没有可沉淀的治理复查记录。',
      evidence: [],
      failedEvidence: [],
      watchItems: [],
      storylineDecisionTaskCount: 0,
      sourceRunId: null,
      action: opsAction('open_task_center', '打开任务中心', '查看长线治理闭环记录。'),
    }
  }

  if (closed) {
    return {
      visible: true,
      status: 'closed',
      label: '治理复查已记录',
      summary: `恢复依据闭环 ${resolved}/${total}，剧情线决策无未关闭项；今日生产可沿用上一轮复查证据。`,
      evidence: repairedEvidence,
      failedEvidence,
      watchItems,
      storylineDecisionTaskCount: 0,
      sourceRunId: auditEntry?.run?.id || null,
      action: opsAction('open_task_center', '查看治理记录', '打开任务中心查看恢复依据审计和复查证据。'),
    }
  }

  return {
    visible: true,
    status: 'needs_followup',
    label: '治理复查待处理',
    summary: [
      total > 0 ? `恢复依据审计 ${resolved}/${total}` : '',
      args.storylineDecisionGate.openCount > 0 ? `剧情线决策 ${args.storylineDecisionGate.openCount}` : '',
    ].filter(Boolean).join('；') || '仍有治理闭环任务需要复查。',
    evidence: repairedEvidence,
    failedEvidence,
    watchItems,
    storylineDecisionTaskCount: args.storylineDecisionGate.openCount,
    sourceRunId: auditEntry?.run?.id || null,
    action: opsAction('review_governance_closure', '治理复查台', '刷新恢复依据审计，并打开任务中心定位剧情线决策复检。', false, {
      repairAuditRunId: auditEntry?.run?.id || null,
      recoveryEvidenceStatus: text(recoveryClosure?.status),
      recoveryEvidenceResolved: resolved,
      recoveryEvidenceTotal: total,
      failedEvidence,
      watchItems,
      storylineDecisionTaskCount: args.storylineDecisionGate.openCount,
      storylineDecisionTaskTitles: args.storylineDecisionGate.taskTitles.slice(0, 6),
    }),
  }
}

export function issueText(value: any) {
  if (typeof value === 'string') return text(value)
  return firstText(value?.description, value?.issue, value?.message, value?.suggestion, value?.title, value?.name)
}

export function issueTexts(values: any[], limit = 6) {
  return Array.from(new Set(values.map(issueText).filter(Boolean))).slice(0, limit)
}

export function buildBatchPlanReview(args: {
  batchPlanContext: AnyRecord | null
  coreReview: AnyRecord | null
  payoffReview: AnyRecord | null
  storylineReview: AnyRecord | null
}) {
  const context = args.batchPlanContext || {}
  const chapterPlan = context.chapter_plan || {}
  const planned = [
    context.batch_goal ? `本批目标：${context.batch_goal}` : '',
    context.reader_payoff_plan ? `读者回报：${context.reader_payoff_plan}` : '',
    context.mainline_focus ? `主线焦点：${context.mainline_focus}` : '',
    context.forbidden_boundary ? `禁抢跑边界：${context.forbidden_boundary}` : '',
    chapterPlan.chapter_task ? `本章职责：${chapterPlan.chapter_task}` : '',
    chapterPlan.conflict ? `本章冲突：${chapterPlan.conflict}` : '',
    chapterPlan.ending_hook ? `章末钩子：${chapterPlan.ending_hook}` : '',
  ].filter(Boolean)

  const corePayload = riskPayload(args.coreReview, 'chapter_core_drift')
  const payoffPayload = riskPayload(args.payoffReview, 'reader_payoff_sync')
  const storylinePayload = riskPayload(args.storylineReview, 'storyline_sync')
  const coreRisks = issueTexts([...arrayValue(corePayload?.drift_risks), ...arrayValue(corePayload?.risks)])
  const payoffMissed = issueTexts([...arrayValue(payoffPayload?.missed), ...arrayValue(payoffPayload?.debts)])
  const storylineMissed = issueTexts(arrayValue(storylinePayload?.missed))
  const storylineUnplanned = issueTexts(arrayValue(storylinePayload?.unplanned))
  const forbiddenTouched = issueTexts(arrayValue(storylinePayload?.forbidden_touched))
  const actualRisks = [
    ...coreRisks.map(item => `核心偏移：${item}`),
    ...payoffMissed.map(item => `回报欠账：${item}`),
    ...storylineMissed.map(item => `剧情线漏推：${item}`),
    ...storylineUnplanned.map(item => `额外推进：${item}`),
    ...forbiddenTouched.map(item => `禁揭触碰：${item}`),
  ]

  return {
    planned,
    missed: Array.from(new Set([...payoffMissed, ...storylineMissed])),
    actual_risks: actualRisks,
    forbidden_touched: forbiddenTouched,
    unplanned: storylineUnplanned,
  }
}

export function rhythmFingerprint(value: any) {
  return text(value)
    .replace(/[，。！？、；：,.!?;:\s"'“”‘’《》（）()【】\[\]{}]/g, '')
    .slice(0, 80)
}

export function batchPlanChapterForItem(batchBrief: AnyRecord | null | undefined, item: AutoCreationBatchReviewItem) {
  return arrayValue(batchBrief?.chapters)
    .find(plan => Number(plan?.chapter_no ?? plan?.chapterNo ?? 0) === Number(item.chapterNo)) || null
}

export function repeatedRhythmDimension(args: {
  label: string
  values: string[]
  threshold: number
}) {
  const buckets = new Map<string, { value: string; count: number }>()
  for (const value of args.values) {
    const fingerprint = rhythmFingerprint(value)
    if (!fingerprint || fingerprint.length < 4) continue
    const existing = buckets.get(fingerprint)
    buckets.set(fingerprint, { value: existing?.value || value, count: (existing?.count || 0) + 1 })
  }
  const repeated = Array.from(buckets.values())
    .filter(item => item.count >= args.threshold)
    .sort((a, b) => b.count - a.count)[0]
  if (!repeated) return null
  return {
    label: args.label,
    value: repeated.value,
    count: repeated.count,
    risk: `${args.label}连续 ${repeated.count} 章重复：${repeated.value}`,
  }
}

export function buildSerialRhythmReview(args: {
  items: AutoCreationBatchReviewItem[]
  chapters: AnyRecord[]
  nextBatchBrief?: AnyRecord | null
}) {
  const successfulItems = args.items.filter(item => item.status === 'success')
  if (successfulItems.length < 3) {
    return {
      status: 'ok' as const,
      score: 88,
      risk_count: 0,
      risks: [],
      evidence: [],
      dimensions: [],
    }
  }
  const rows = successfulItems.map(item => {
    const chapter = findChapter(args.chapters, item) || {}
    const raw = parsePayload(chapter.raw_payload || chapter.rawPayload, { owner: chapter, kind: 'chapter', field: chapter.raw_payload ? 'raw_payload' : 'rawPayload' }) || chapter.raw_payload || chapter.rawPayload || {}
    const plan = batchPlanChapterForItem(args.nextBatchBrief, item) || {}
    return {
      chapter_no: item.chapterNo,
      title: item.title,
      conflict: firstText(chapter.conflict, raw.conflict, raw.core_conflict, plan.conflict),
      payoff: firstText(raw.payoff, raw.reader_payoff, raw.readerPayoff, plan.payoff, plan.reader_payoff, plan.readerPayoff, plan.chapter_payoff, plan.chapterPayoff),
      ending_hook: firstText(chapter.ending_hook, chapter.endingHook, chapter.hook, raw.ending_hook, raw.endingHook, raw.hook, plan.ending_hook, plan.endingHook),
      prose_seed: text(chapter.chapter_text).slice(0, 160),
    }
  })
  const threshold = Math.min(successfulItems.length, 3)
  const dimensions = [
    repeatedRhythmDimension({ label: '冲突来源', values: rows.map(row => row.conflict), threshold }),
    repeatedRhythmDimension({ label: '读者回报', values: rows.map(row => row.payoff), threshold }),
    repeatedRhythmDimension({ label: '章末钩子', values: rows.map(row => row.ending_hook), threshold }),
  ].filter(Boolean) as Array<{ label: string; value: string; count: number; risk: string }>

  const riskCount = dimensions.length
  return {
    status: riskCount > 0 ? 'warn' as const : 'ok' as const,
    score: Math.max(45, 90 - riskCount * 14),
    risk_count: riskCount,
    risks: dimensions.map(item => item.risk),
    evidence: rows.map(row => `第${row.chapter_no}章：${[row.conflict, row.payoff, row.ending_hook].filter(Boolean).join(' / ')}`).slice(0, 6),
    dimensions,
  }
}

export function assetIntakePayload(review: AnyRecord | null) {
  const payload = reviewPayload(review)
  return payload?.asset_intake || payload?.result?.asset_intake || payload?.result || payload
}

export function assetApplyExistsAfter(args: {
  reviews: AnyRecord[]
  chapter: AnyRecord
  chapterNo: number
  intakeReview: AnyRecord | null
}) {
  const intakeTime = recordTime(args.intakeReview || {})
  return args.reviews.some(review => {
    if (text(review?.review_type) !== 'asset_intake_apply') return false
    if (recordTime(review) < intakeTime) return false
    const payload = reviewPayload(review)
    const reviewChapterId = payload?.chapter_id ?? review?.chapter_id ?? null
    const reviewChapterNo = Number(payload?.chapter_no ?? review?.chapter_no ?? 0)
    const chapterId = args.chapter?.id ?? args.chapter?.chapter_id ?? null
    return chapterId !== null && reviewChapterId !== null
      ? String(chapterId) === String(reviewChapterId)
      : reviewChapterNo === args.chapterNo
  })
}

export function buildAssetGrowthReview(args: {
  items: AutoCreationBatchReviewItem[]
  chapters: AnyRecord[]
  reviews: AnyRecord[]
}) {
  const successfulItems = args.items.filter(item => item.status === 'success')
  const pendingAssets: AnyRecord[] = []
  for (const item of successfulItems) {
    const chapter = findChapter(args.chapters, item)
    if (!chapter) continue
    const intakeReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'asset_intake')
    if (!intakeReview || assetApplyExistsAfter({ reviews: args.reviews, chapter, chapterNo: item.chapterNo, intakeReview })) continue
    const payload = assetIntakePayload(intakeReview)
    const appliedNames = new Set(arrayValue(payload?.applied_asset_names).map(name => text(name)).filter(Boolean))
    for (const asset of arrayValue(payload?.discovered_assets)) {
      const name = text(asset?.name)
      if (!name || appliedNames.has(name)) continue
      pendingAssets.push({
        chapter_no: item.chapterNo,
        chapter_id: item.chapterId,
        entity_type: text(asset?.entity_type || asset?.type, 'unknown'),
        name,
        summary: text(asset?.summary),
      })
    }
  }
  const budget = Math.max(3, successfulItems.length * 2)
  const overBudget = Math.max(0, pendingAssets.length - budget)
  const typeCounts = pendingAssets.reduce((acc: Record<string, number>, asset) => {
    const type = text(asset.entity_type, 'unknown')
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {})
  return {
    status: overBudget > 0 ? 'warn' as const : 'ok' as const,
    budget,
    pending_count: pendingAssets.length,
    over_budget_count: overBudget,
    pending_assets: pendingAssets,
    type_counts: typeCounts,
    summary: overBudget > 0
      ? `本批发现 ${pendingAssets.length} 个新资产，超过预算 ${budget} 个。`
      : `本批新资产 ${pendingAssets.length}/${budget}，仍在预算内。`,
  }
}

export function syncMissedItems(review: AnyRecord | null, payloadKey: string) {
  const payload = riskPayload(review, payloadKey)
  return [
    ...arrayValue(payload?.missed),
    ...arrayValue(payload?.debts),
  ].map(item => {
    if (typeof item === 'string') {
      return { label: text(item), text: text(item) }
    }
    return {
      key: firstText(item?.key, item?.id, item?.type, item?.kind),
      match_scope: firstText(item?.match_scope, item?.matchScope, item?.scope),
      label: firstText(item?.label, item?.title, item?.name, item?.key, item?.type, item?.text),
      text: firstText(item?.text, item?.description, item?.reason, item?.expected_state_change, item?.expectedStateChange, item?.label, item?.title, item?.name),
    }
  }).filter(item => item.label || item.text)
}

export function isChapterHandoffMiss(item: AnyRecord) {
  const key = text(item?.key || item?.type || item?.kind).toLowerCase()
  const scope = text(item?.match_scope || item?.matchScope || item?.scope).toLowerCase()
  const content = [
    key,
    scope,
    text(item?.label || item?.title || item?.name),
    text(item?.text || item?.description || item?.reason),
  ].join(' ').toLowerCase()
  if (['opening_handoff', 'previous_handoff', 'chapter_handoff'].some(token => content.includes(token))) return true
  if (content.includes('handoff') && (content.includes('opening') || content.includes('previous') || content.includes('chapter'))) return true
  if (content.includes('上一章承接') || content.includes('上章承接') || content.includes('开篇承接') || content.includes('章节交接')) return true
  return scope === 'opening' && (content.includes('承接') || content.includes('上一章') || content.includes('上章'))
}

export function chapterHandoffMissedItems(review: AnyRecord | null) {
  return syncMissedItems(review, 'reader_expectation_sync').filter(isChapterHandoffMiss)
}

export function chapterHandoffRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  return chapterHandoffMissedItems(review).length
}

export function buildChapterHandoffReview(args: {
  item: AutoCreationBatchReviewItem
  expectationReview: AnyRecord | null
}) {
  const missed = chapterHandoffMissedItems(args.expectationReview)
  return {
    status: missed.length > 0 ? 'warn' as const : 'ok' as const,
    chapter_no: args.item.chapterNo,
    chapter_id: args.item.chapterId || null,
    title: args.item.title,
    missed_count: missed.length,
    missed,
    label: missed.length > 0 ? `章节交接漏接 ${missed.length}` : '章节交接正常',
  }
}

export function buildReaderPullReview(args: {
  item: AutoCreationBatchReviewItem
  expectationReview: AnyRecord | null
  retentionReview: AnyRecord | null
}) {
  const expectationPayload = riskPayload(args.expectationReview, 'reader_expectation_sync')
  const retentionPayload = riskPayload(args.retentionReview, 'reader_retention_sync')
  const expectationCount = expectationRiskCount(args.expectationReview)
  const retentionCount = retentionRiskCount(args.retentionReview)
  const missed = [
    ...syncMissedItems(args.expectationReview, 'reader_expectation_sync'),
    ...syncMissedItems(args.retentionReview, 'reader_retention_sync'),
  ]
  return {
    status: expectationCount + retentionCount > 0 ? 'warn' as const : 'ok' as const,
    chapter_no: args.item.chapterNo,
    chapter_id: args.item.chapterId || null,
    title: args.item.title,
    expectation_count: expectationCount,
    retention_count: retentionCount,
    missed_count: expectationCount + retentionCount,
    missed,
    expectation_label: firstText(expectationPayload?.label, expectationCount > 0 ? `期待欠账 ${expectationCount}` : ''),
    retention_label: firstText(retentionPayload?.label, retentionCount > 0 ? `追读漏项 ${retentionCount}` : ''),
  }
}

export function buildStoryDriveReview(args: {
  item: AutoCreationBatchReviewItem
  review: AnyRecord | null
}) {
  const payload = riskPayload(args.review, 'story_drive_sync')
  const count = storyDriveRiskCount(args.review)
  return {
    status: count > 0 ? 'warn' as const : 'ok' as const,
    chapter_no: args.item.chapterNo,
    chapter_id: args.item.chapterId || null,
    title: args.item.title,
    missed_count: count,
    missed: syncMissedItems(args.review, 'story_drive_sync'),
    label: firstText(payload?.label, count > 0 ? `故事力缺口 ${count}` : ''),
    score: numberValue(payload?.score),
  }
}

export function buildCharacterArcReview(args: {
  item: AutoCreationBatchReviewItem
  review: AnyRecord | null
}) {
  const payload = riskPayload(args.review, 'character_arc_sync')
  const count = characterArcRiskCount(args.review)
  return {
    status: count > 0 ? 'warn' as const : 'ok' as const,
    chapter_no: args.item.chapterNo,
    chapter_id: args.item.chapterId || null,
    title: args.item.title,
    missed_count: count,
    missed: syncMissedItems(args.review, 'character_arc_sync'),
    label: firstText(payload?.label, count > 0 ? `人物弧光缺口 ${count}` : ''),
    score: numberValue(payload?.score),
  }
}

export function buildStyleSampleReview(args: {
  item: AutoCreationBatchReviewItem
  review: AnyRecord | null
}) {
  const payload = riskPayload(args.review, 'style_sample_sync')
  const count = styleSampleRiskCount(args.review)
  return {
    status: count > 0 ? 'warn' as const : 'ok' as const,
    chapter_no: args.item.chapterNo,
    chapter_id: args.item.chapterId || null,
    title: args.item.title,
    missed_count: count,
    missed: syncMissedItems(args.review, 'style_sample_sync'),
    copied_phrases: arrayValue(payload?.copied_phrases || payload?.copiedPhrases).map(item => text(item)).filter(Boolean),
    label: firstText(payload?.label, count > 0 ? `风格缺口 ${count}` : ''),
    score: numberValue(payload?.score),
  }
}

export function buildChapterBenchmarkReview(args: {
  item: AutoCreationBatchReviewItem
  review: AnyRecord | null
}) {
  const payload = riskPayload(args.review, 'chapter_benchmark_sync')
  const count = chapterBenchmarkRiskCount(args.review)
  return {
    status: count > 0 ? 'warn' as const : 'ok' as const,
    chapter_no: args.item.chapterNo,
    chapter_id: args.item.chapterId || null,
    title: args.item.title,
    missed_count: count,
    missed: syncMissedItems(args.review, 'chapter_benchmark_sync'),
    label: firstText(payload?.label, count > 0 ? `标杆章缺口 ${count}` : ''),
    score: numberValue(payload?.score),
    next_actions: arrayValue(payload?.next_actions || payload?.nextActions).map(item => text(item)).filter(Boolean),
  }
}

export function buildContractSyncReview(args: {
  item: AutoCreationBatchReviewItem
  review: AnyRecord | null
  payloadKey: string
  fallbackLabel: string
}) {
  const payload = riskPayload(args.review, args.payloadKey)
  const count = contractSyncRiskCount(args.review, args.payloadKey)
  return {
    status: count > 0 ? 'warn' as const : 'ok' as const,
    chapter_no: args.item.chapterNo,
    chapter_id: args.item.chapterId || null,
    title: args.item.title,
    missed_count: count,
    missed: syncMissedItems(args.review, args.payloadKey),
    label: firstText(payload?.label, count > 0 ? `${args.fallbackLabel} ${count}` : ''),
    summary: text(payload?.summary),
    next_actions: arrayValue(payload?.next_actions || payload?.nextActions).map(item => text(item)).filter(Boolean),
  }
}

export function buildChapterAttractionReview(args: {
  item: AutoCreationBatchReviewItem
  review: AnyRecord | null
}) {
  const payload = riskPayload(args.review, 'chapter_attraction_review')
  const count = chapterAttractionRiskCount(args.review)
  return {
    status: count > 0 ? 'warn' as const : 'ok' as const,
    chapter_no: args.item.chapterNo,
    chapter_id: args.item.chapterId || null,
    title: args.item.title,
    weak_count: count,
    weak_dimensions: chapterAttractionWeakDimensions(payload).map((item: any) => ({
      key: firstText(item?.key, item?.type),
      label: firstText(item?.label, item?.title, item?.key, '吸引力缺口'),
      status: firstText(item?.status),
      score: numberValue(item?.score),
      issue: firstText(item?.issue, item?.text, item?.reason, item?.repair_instruction, item?.repairInstruction),
    })),
    dimensions: arrayValue(payload?.dimensions),
    priority_repair: firstText(payload?.priority_repair, payload?.priorityRepair),
    label: firstText(payload?.label, count > 0 ? `吸引力缺口 ${count}` : ''),
    score: numberValue(payload?.score),
  }
}

export function buildInnovationExecutionReview(args: {
  item: AutoCreationBatchReviewItem
  review: AnyRecord | null
}) {
  const payload = riskPayload(args.review, 'innovation_sync')
  const count = innovationRiskCount(args.review)
  return {
    status: count > 0 ? 'warn' as const : 'ok' as const,
    chapter_no: args.item.chapterNo,
    chapter_id: args.item.chapterId || null,
    title: args.item.title,
    missed_count: count,
    missed: syncMissedItems(args.review, 'innovation_sync'),
    label: firstText(payload?.label, count > 0 ? `创新缺口 ${count}` : ''),
    score: numberValue(payload?.score),
  }
}

export function volumeSegmentMissedItems(review: AnyRecord | null) {
  return syncMissedItems(review, 'volume_beat_sync')
}

export function volumeSegmentRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'volume_beat_sync')
  const explicit = numberValue(payload?.missed_count ?? payload?.missedCount)
  if (explicit !== null) return explicit
  const missed = volumeSegmentMissedItems(review).length
  return missed > 0 ? missed : riskCountFromStatus(payload, review)
}

export function buildVolumeSegmentReview(args: {
  planning?: PlanningWorkspaceModel | null
  item: AutoCreationBatchReviewItem
  chapter?: AnyRecord | null
  review: AnyRecord | null
}) {
  const planning = args.planning
  const payload = riskPayload(args.review, 'volume_beat_sync')
  const gate = planning?.volumeSegmentGate || null
  const gateSignals = arrayValue(gate?.signals).filter(signal => text(signal?.status) !== 'ok')
  const raw = parsePayload(args.chapter?.raw_payload || args.chapter?.rawPayload, { owner: args.chapter, kind: 'chapter', field: args.chapter?.raw_payload ? 'raw_payload' : 'rawPayload' }) || args.chapter?.raw_payload || args.chapter?.rawPayload || {}
  const planned = [
    firstText(planning?.topStatus?.currentVolume) ? `当前卷：${firstText(planning?.topStatus?.currentVolume)}` : '',
    firstText(planning?.topStatus?.currentStage) ? `当前阶段：${firstText(planning?.topStatus?.currentStage)}` : '',
    firstText(planning?.mainline?.currentVolumeGoal) ? `当前卷目标：${firstText(planning?.mainline?.currentVolumeGoal)}` : '',
    firstText(planning?.mainline?.currentStageConflict) ? `阶段冲突：${firstText(planning?.mainline?.currentStageConflict)}` : '',
    ...gateSignals.map(signal => `${firstText(signal?.label, signal?.key)}：${firstText(signal?.detail)}`).filter(Boolean),
  ].filter(Boolean)
  const actual = [
    firstText(raw?.mainline_progress, raw?.mainlineProgress, args.chapter?.mainline_progress, args.chapter?.volume_stage)
      ? `本章主线进度：${firstText(raw?.mainline_progress, raw?.mainlineProgress, args.chapter?.mainline_progress, args.chapter?.volume_stage)}`
      : '',
    firstText(args.chapter?.conflict, raw?.conflict) ? `本章冲突：${firstText(args.chapter?.conflict, raw?.conflict)}` : '',
    firstText(raw?.payoff, raw?.reader_payoff, raw?.readerPayoff) ? `本章回报：${firstText(raw?.payoff, raw?.reader_payoff, raw?.readerPayoff)}` : '',
  ].filter(Boolean)
  const missed = volumeSegmentMissedItems(args.review)
  const missedCount = volumeSegmentRiskCount(args.review)
  return {
    status: missedCount > 0 ? 'warn' as const : 'ok' as const,
    chapter_no: args.item.chapterNo,
    chapter_id: args.item.chapterId || null,
    title: args.item.title,
    missed_count: missedCount,
    planned,
    actual,
    missed,
    gate_summary: firstText(gate?.summary),
    review_label: firstText(payload?.label, missedCount > 0 ? `卷级阶段漏兑现 ${missedCount}` : '卷级阶段正常'),
  }
}

export function batchRepairTask(args: {
  item: AutoCreationBatchReviewItem
  issueType: string
  taskType?: string
  severity: 'high' | 'medium'
  message: string
  action: string
  metrics: AnyRecord
  batchPlanContext?: AnyRecord | null
  batchPlanReview?: AnyRecord | null
  serialRhythmReview?: AnyRecord | null
  assetGrowthReview?: AnyRecord | null
  volumeSegmentReview?: AnyRecord | null
  readerTrialReview?: AnyRecord | null
  readerPullReview?: AnyRecord | null
  first30Retention?: AnyRecord | null
  chapterHandoffReview?: AnyRecord | null
  storyDriveSync?: AnyRecord | null
  characterArcSync?: AnyRecord | null
  innovationReview?: AnyRecord | null
  chapterAttractionReview?: AnyRecord | null
  chapterBenchmarkSync?: AnyRecord | null
  intentConfirmationSync?: AnyRecord | null
  benchmarkRecallSync?: AnyRecord | null
  styleSampleSync?: AnyRecord | null
  batchChecklistExecution?: AnyRecord | null
  recoveryEvidenceReview?: AnyRecord | null
  recoveryEvidenceRegovernanceQueue?: AnyRecord | null
  strengthenedRepairAcceptanceReview?: AnyRecord | null
  safeBatchExpansionSegmentReview?: AnyRecord | null
  safeBatchExpansionStructureReview?: AnyRecord | null
  safeBatchExpansionStructureValidationResult?: AnyRecord | null
  safeBatchExpansionStructureDecisionReview?: AnyRecord | null
  postBatchQualityCheck?: AnyRecord | null
  actionArea?: string
  actionKey?: string
}) {
  return {
    task_type: args.taskType || 'repair_quality',
    issue_type: args.issueType,
    severity: args.severity,
    chapter_id: args.item.chapterId || null,
    chapter_no: args.item.chapterNo,
    title: `第${args.item.chapterNo}章《${args.item.title}》批次风险修复`,
    message: args.message,
    action: args.action,
    acceptance_criteria: [
      '质量复检通过且分数不低于78',
      '核心冲突、读者回报和章末钩子重新落地',
      '故事状态、剧情线和回报债务复盘后无新增警告',
    ],
    task_status: 'open',
    source: 'auto_creation_safe_batch_risk',
    metrics: args.metrics,
    ...(args.actionArea ? { action_area: args.actionArea } : {}),
    ...(args.actionKey ? { action_key: args.actionKey } : {}),
    ...(args.batchPlanContext ? { batch_plan_context: args.batchPlanContext } : {}),
    ...(args.batchPlanReview ? { batch_plan_review: args.batchPlanReview } : {}),
    ...(args.serialRhythmReview ? { serial_rhythm_review: args.serialRhythmReview } : {}),
    ...(args.assetGrowthReview ? { asset_growth_review: args.assetGrowthReview } : {}),
    ...(args.volumeSegmentReview ? { volume_segment_review: args.volumeSegmentReview } : {}),
    ...(args.readerTrialReview ? { reader_trial_review: args.readerTrialReview } : {}),
    ...(args.readerPullReview ? { reader_pull_review: args.readerPullReview } : {}),
    ...(args.first30Retention ? { first30_retention: args.first30Retention } : {}),
    ...(args.chapterHandoffReview ? { chapter_handoff_review: args.chapterHandoffReview } : {}),
    ...(args.storyDriveSync ? { story_drive_sync: args.storyDriveSync } : {}),
    ...(args.characterArcSync ? { character_arc_sync: args.characterArcSync } : {}),
    ...(args.innovationReview ? { innovation_review: args.innovationReview } : {}),
    ...(args.chapterAttractionReview ? { chapter_attraction_review: args.chapterAttractionReview } : {}),
    ...(args.chapterBenchmarkSync ? { chapter_benchmark_sync: args.chapterBenchmarkSync } : {}),
    ...(args.intentConfirmationSync ? { intent_confirmation_sync: args.intentConfirmationSync } : {}),
    ...(args.benchmarkRecallSync ? { benchmark_recall_sync: args.benchmarkRecallSync } : {}),
    ...(args.styleSampleSync ? { style_sample_sync: args.styleSampleSync } : {}),
    ...(args.batchChecklistExecution ? { batch_checklist_execution: args.batchChecklistExecution } : {}),
    ...(args.recoveryEvidenceReview ? { recovery_evidence_review: args.recoveryEvidenceReview } : {}),
    ...(args.recoveryEvidenceRegovernanceQueue ? {
      recovery_evidence_regovernance_queue: args.recoveryEvidenceRegovernanceQueue,
      recoveryEvidenceGovernanceQueue: args.recoveryEvidenceRegovernanceQueue,
    } : {}),
    ...(args.strengthenedRepairAcceptanceReview ? {
      strengthened_repair_acceptance_review: args.strengthenedRepairAcceptanceReview,
    } : {}),
    ...(args.safeBatchExpansionSegmentReview ? {
      safe_batch_expansion_segment_review: args.safeBatchExpansionSegmentReview,
    } : {}),
    ...(args.safeBatchExpansionStructureReview ? {
      safe_batch_expansion_structure_review: args.safeBatchExpansionStructureReview,
    } : {}),
    ...(args.safeBatchExpansionStructureValidationResult ? {
      safe_batch_expansion_structure_validation_result: args.safeBatchExpansionStructureValidationResult,
    } : {}),
    ...(args.safeBatchExpansionStructureDecisionReview ? {
      safe_batch_expansion_structure_decision_review: args.safeBatchExpansionStructureDecisionReview,
    } : {}),
    ...(args.postBatchQualityCheck ? { post_batch_quality_check: args.postBatchQualityCheck } : {}),
  }
}

export function isResolvedTaskStatus(value: any) {
  return ['resolved', 'done', 'completed', 'success', 'closed'].includes(text(value).toLowerCase())
}

export function isCompletedRepairRun(run: AnyRecord) {
  return ['completed', 'success', 'done'].includes(text(run?.status).toLowerCase())
}

export const SAFE_REPAIR_TASK_CATEGORY_ISSUE_TYPES = new Set([
  'batch_brief_mismatch',
  'chapter_handoff_missed',
  'chapter_benchmark_gap',
  'chapter_attraction_gap',
  'character_arc_gap',
  'benchmark_recall_gap',
  'core_drift',
  'intent_confirmation_gap',
  'innovation_execution_missed',
  'innovation_missed',
  'opening_handoff_debt',
  'post_batch_quality_warning',
  'reader_expectation_debt',
  'reader_payoff_debt',
  'reader_pull_missed',
  'target_reader_gap',
  'genre_positioning_gap',
  'female_audience_gap',
  'upgrade_rhythm_gap',
  'chapter_structure_gap',
  'chapter_progression_gap',
  'information_load_gap',
  'longform_continuity_gap',
  'core_contract_gap',
  'continuity_heat_gap',
  'revision_receipt_gap',
  'deslop_repair_gap',
  'prose_meta_gap',
  'serial_risk_repair_gap',
  'chapter_hook_quality_gap',
  'reader_retention_gap',
  'reader_retention_missed',
  'scene_card_receipt',
  'source_readiness_gap',
  'state_tracking_gap',
  'style_boundary_gap',
  'information_flow_gap',
  'expectation_threshold_gap',
  'story_loop_gap',
  'emotional_arc_gap',
  'chapter_hook_gap',
  'paragraph_hook_gap',
  'suspense_gap',
  'reversal_gap',
  'showdown_gap',
  'prose_craft_gap',
  'punctuation_tone_gap',
  'content_rubric_gap',
  'asset_linkage_gap',
  'dialogue_gap',
  'plot_dynamics_gap',
  'character_relation_gap',
  'character_behavior_gap',
  'conflict_structure_gap',
  'bridge_unit_gap',
  'opening_gap',
  'story_drive_gap',
  'storyline_sync_risk',
  'style_sample_gap',
  'volume_beat_missed',
  'volume_segment_missed',
  'deslop_repair_receipt',
  'revision_cascade_impact',
  'revision_scope_guard',
  'prose_revision_receipt',
  'prose_revision_receipt_sync',
  'quality_audit_repair_receipt',
  'quality_audit_repair_receipt_sync',
  'recovery_evidence',
  'recovery_evidence_mismatch',
])

export const REPAIR_TASK_CATEGORY_ISSUE_TYPE_ALIASES: Record<string, string> = {
  chapter_attraction: 'chapter_attraction_gap',
  chapter_benchmark: 'chapter_benchmark_gap',
  character_arc: 'character_arc_gap',
  delivery_core: 'core_drift',
  innovation: 'innovation_missed',
  reader_expectation: 'reader_expectation_debt',
  reader_payoff: 'reader_payoff_debt',
  target_reader: 'target_reader_gap',
  target_reader_sync: 'target_reader_gap',
  genre_positioning: 'genre_positioning_gap',
  genre_positioning_sync: 'genre_positioning_gap',
  female_audience: 'female_audience_gap',
  female_audience_sync: 'female_audience_gap',
  upgrade_rhythm: 'upgrade_rhythm_gap',
  upgrade_rhythm_sync: 'upgrade_rhythm_gap',
  chapter_structure: 'chapter_structure_gap',
  chapter_structure_sync: 'chapter_structure_gap',
  chapter_progression: 'chapter_progression_gap',
  chapter_progression_sync: 'chapter_progression_gap',
  information_load: 'information_load_gap',
  information_load_sync: 'information_load_gap',
  longform_continuity: 'longform_continuity_gap',
  longform_continuity_sync: 'longform_continuity_gap',
  core_contract: 'core_contract_gap',
  core_contract_check_sync: 'core_contract_gap',
  continuity_heat: 'continuity_heat_gap',
  continuity_heat_sync: 'continuity_heat_gap',
  revision_receipt: 'revision_receipt_gap',
  revision_receipt_check_sync: 'revision_receipt_gap',
  deslop_repair: 'deslop_repair_gap',
  deslop_repair_check_sync: 'deslop_repair_gap',
  prose_meta: 'prose_meta_gap',
  prose_meta_sync: 'prose_meta_gap',
  serial_risk_repair: 'serial_risk_repair_gap',
  serial_risk_repair_sync: 'serial_risk_repair_gap',
  chapter_hook_quality: 'chapter_hook_quality_gap',
  chapter_hook_quality_sync: 'chapter_hook_quality_gap',
  reader_retention: 'reader_retention_missed',
  reader_retention_check: 'reader_retention_gap',
  reader_retention_check_sync: 'reader_retention_gap',
  signature_scene: 'signature_scene_missed',
  source_readiness: 'source_readiness_gap',
  source_readiness_sync: 'source_readiness_gap',
  state_tracking: 'state_tracking_gap',
  state_tracking_sync: 'state_tracking_gap',
  style_boundary: 'style_boundary_gap',
  style_boundary_sync: 'style_boundary_gap',
  information_flow: 'information_flow_gap',
  information_flow_sync: 'information_flow_gap',
  expectation_threshold: 'expectation_threshold_gap',
  expectation_threshold_sync: 'expectation_threshold_gap',
  story_loop: 'story_loop_gap',
  story_loop_sync: 'story_loop_gap',
  emotional_arc: 'emotional_arc_gap',
  emotional_arc_sync: 'emotional_arc_gap',
  chapter_hook: 'chapter_hook_gap',
  chapter_hook_sync: 'chapter_hook_gap',
  paragraph_hook: 'paragraph_hook_gap',
  paragraph_hook_sync: 'paragraph_hook_gap',
  suspense: 'suspense_gap',
  suspense_sync: 'suspense_gap',
  reversal: 'reversal_gap',
  reversal_sync: 'reversal_gap',
  showdown: 'showdown_gap',
  showdown_sync: 'showdown_gap',
  prose_craft: 'prose_craft_gap',
  prose_craft_sync: 'prose_craft_gap',
  punctuation_tone: 'punctuation_tone_gap',
  punctuation_tone_sync: 'punctuation_tone_gap',
  content_rubric: 'content_rubric_gap',
  content_rubric_sync: 'content_rubric_gap',
  asset_linkage: 'asset_linkage_gap',
  asset_linkage_sync: 'asset_linkage_gap',
  dialogue: 'dialogue_gap',
  dialogue_sync: 'dialogue_gap',
  plot_dynamics: 'plot_dynamics_gap',
  plot_dynamics_sync: 'plot_dynamics_gap',
  character_relation: 'character_relation_gap',
  character_relation_sync: 'character_relation_gap',
  character_behavior: 'character_behavior_gap',
  character_behavior_sync: 'character_behavior_gap',
  conflict_structure: 'conflict_structure_gap',
  conflict_structure_sync: 'conflict_structure_gap',
  bridge_unit: 'bridge_unit_gap',
  bridge_unit_sync: 'bridge_unit_gap',
  opening: 'opening_gap',
  opening_sync: 'opening_gap',
  story_drive: 'story_drive_gap',
  storyline: 'storyline_sync_risk',
  story_unit: 'story_unit_sync_risk',
  style_sample: 'style_sample_gap',
  pre_draft_execution: 'intent_confirmation_gap',
  volume_beat: 'volume_beat_missed',
}

export function repairTaskIssueType(task: AnyRecord) {
  const explicit = text(task?.issue_type ?? task?.issueType)
  if (explicit) return explicit
  const category = text(task?.annotation_category ?? task?.annotationCategory ?? task?.category)
  if (REPAIR_TASK_CATEGORY_ISSUE_TYPE_ALIASES[category]) return REPAIR_TASK_CATEGORY_ISSUE_TYPE_ALIASES[category]
  return SAFE_REPAIR_TASK_CATEGORY_ISSUE_TYPES.has(category) ? category : ''
}

export function batchRiskIssueKeys(item: { chapterId: any; chapterNo: number }, issueType: string) {
  return [
    item.chapterId !== null && item.chapterId !== undefined ? `id:${String(item.chapterId)}:${issueType}` : '',
    item.chapterNo > 0 ? `no:${item.chapterNo}:${issueType}` : '',
  ].filter(Boolean)
}

export function batchRiskIssueBatchKey(issueType: string) {
  return `batch:${issueType}`
}

export function batchRiskIssueResolvedForBatch(keys: Set<string> | undefined, issueType: string) {
  return Boolean(keys?.has(batchRiskIssueBatchKey(issueType)))
}

export function resolvedBatchRiskIssueTypes(issueType: string) {
  if (issueType === 'batch_brief_mismatch') {
    return [
      'batch_brief_mismatch',
      'core_drift',
      'reader_payoff_debt',
      'storyline_sync_risk',
    ]
  }
  if (issueType === 'opening_handoff_debt' || issueType === 'reader_expectation_debt') {
    return ['opening_handoff_debt', 'reader_expectation_debt']
  }
  if (issueType === 'reader_pull_missed' || issueType === 'reader_retention_missed') {
    return ['reader_pull_missed', 'reader_retention_missed', 'reader_expectation_debt']
  }
  if (issueType === 'target_reader_gap') {
    return ['target_reader_gap']
  }
  if (issueType === 'genre_positioning_gap') {
    return ['genre_positioning_gap']
  }
  if (issueType === 'female_audience_gap') {
    return ['female_audience_gap']
  }
  if (issueType === 'upgrade_rhythm_gap') {
    return ['upgrade_rhythm_gap']
  }
  if (issueType === 'chapter_structure_gap') {
    return ['chapter_structure_gap']
  }
  if (issueType === 'chapter_progression_gap') {
    return ['chapter_progression_gap']
  }
  if (issueType === 'information_load_gap') {
    return ['information_load_gap']
  }
  if (issueType === 'longform_continuity_gap') {
    return ['longform_continuity_gap']
  }
  if (issueType === 'core_contract_gap') {
    return ['core_contract_gap']
  }
  if (issueType === 'continuity_heat_gap') {
    return ['continuity_heat_gap']
  }
  if (issueType === 'revision_receipt_gap') {
    return ['revision_receipt_gap']
  }
  if (issueType === 'deslop_repair_gap') {
    return ['deslop_repair_gap']
  }
  if (issueType === 'prose_meta_gap') {
    return ['prose_meta_gap']
  }
  if (issueType === 'serial_risk_repair_gap') {
    return ['serial_risk_repair_gap']
  }
  if (issueType === 'chapter_hook_quality_gap') {
    return ['chapter_hook_quality_gap']
  }
  if (issueType === 'reader_retention_gap') {
    return ['reader_retention_gap']
  }
  if (issueType === 'innovation_missed' || issueType === 'innovation_execution_missed') {
    return ['innovation_missed', 'innovation_execution_missed']
  }
  if (issueType === 'intent_confirmation_gap' || issueType === 'benchmark_recall_gap') {
    return ['intent_confirmation_gap', 'benchmark_recall_gap']
  }
  if (issueType === 'volume_beat_missed' || issueType === 'volume_segment_missed') {
    return ['volume_beat_missed', 'volume_segment_missed']
  }
  if (issueType === 'recovery_evidence_mismatch') {
    return ['recovery_evidence_mismatch']
  }
  if (issueType.startsWith('scene_card_receipt')) {
    return ['scene_card_receipt', issueType]
  }
  if (issueType.startsWith('deslop_repair_receipt')) {
    return ['deslop_repair_receipt', issueType]
  }
  if (issueType.startsWith('revision_cascade_impact')) {
    return ['revision_cascade_impact', issueType]
  }
  if (issueType.startsWith('revision_scope_guard')) {
    return ['revision_scope_guard', issueType]
  }
  if (issueType.startsWith('prose_revision_receipt')) {
    return ['prose_revision_receipt_sync', 'prose_revision_receipt', issueType]
  }
  if (issueType === 'strengthened_repair_acceptance_mismatch') {
    return ['strengthened_repair_acceptance_mismatch']
  }
  if (issueType === 'safe_batch_expansion_segment_hotspot') {
    return ['safe_batch_expansion_segment_hotspot']
  }
  if (issueType === 'safe_batch_expansion_structure_repair') {
    return ['safe_batch_expansion_structure_repair', 'safe_batch_expansion_segment_hotspot']
  }
  if (issueType === 'safe_batch_expansion_structure_decision_mismatch') {
    return ['safe_batch_expansion_structure_decision_mismatch']
  }
  if ([
    'readability_risk',
    'readability_or_meme_risk',
    'opening_pull_risk',
    'ending_page_turn_risk',
    'scene_progression_risk',
    'payoff_density_risk',
  ].includes(issueType)) {
    return [
      'readability_risk',
      'readability_or_meme_risk',
      'opening_pull_risk',
      'ending_page_turn_risk',
      'scene_progression_risk',
      'payoff_density_risk',
    ]
  }
  return [issueType]
}

export function batchRiskIssueResolved(keys: Set<string> | undefined, item: { chapterId: any; chapterNo: number }, issueType: string) {
  if (!keys) return false
  return batchRiskIssueKeys(item, issueType).some(key => keys.has(key))
}

export function recoveryEvidenceRiskMatches(evidence: string, counts: {
  payoffDebtTotal: number
  readerPullRiskTotal: number
  storylineRiskTotal: number
  styleSampleRiskTotal: number
  batchPlanRiskTotal: number
  batchChecklistRiskTotal: number
}) {
  const riskLabels: string[] = []
  const normalized = evidence.toLowerCase()
  if (normalized.includes('样章') || normalized.includes('风格')) {
    if (counts.styleSampleRiskTotal > 0) riskLabels.push(`风格样章缺口 ${counts.styleSampleRiskTotal} 项`)
  }
  if (normalized.includes('读者回报') || normalized.includes('回报') || normalized.includes('追读') || normalized.includes('读者拉力')) {
    const count = counts.payoffDebtTotal + counts.readerPullRiskTotal
    if (count > 0) riskLabels.push(`读者回报/拉力风险 ${count} 项`)
  }
  if (normalized.includes('主线') || normalized.includes('剧情线')) {
    const count = counts.storylineRiskTotal + counts.batchPlanRiskTotal
    if (count > 0) riskLabels.push(`主线/剧情线风险 ${count} 项`)
  }
  if (normalized.includes('批次任务书') || normalized.includes('开工清单') || normalized.includes('安全批次')) {
    const count = counts.batchPlanRiskTotal + counts.batchChecklistRiskTotal
    if (count > 0) riskLabels.push(`批次计划/开工清单风险 ${count} 项`)
  }
  if (
    normalized.includes('治理复查')
    || normalized.includes('恢复复查')
    || normalized.includes('生产阻断已解除')
    || normalized.includes('治理队列已闭环')
    || normalized.includes('放行摘要')
  ) {
    const count = counts.payoffDebtTotal
      + counts.readerPullRiskTotal
      + counts.storylineRiskTotal
      + counts.styleSampleRiskTotal
      + counts.batchPlanRiskTotal
      + counts.batchChecklistRiskTotal
    if (count > 0) riskLabels.push(`恢复依据来源继承风险 ${count} 项`)
  }
  return riskLabels
}

export function buildRecoveryEvidenceReview(args: {
  preflight?: AnyRecord | null
  counts: {
    payoffDebtTotal: number
    readerPullRiskTotal: number
    storylineRiskTotal: number
    styleSampleRiskTotal: number
    batchPlanRiskTotal: number
    batchChecklistRiskTotal: number
  }
}) {
  const evidenceItems = batchReleaseEvidenceItemsFromPreflight(args.preflight)
  const evidence = Array.from(new Set(evidenceItems.map(item => item.evidence).filter(Boolean)))
  const failedItems = evidenceItems
    .map(item => ({
      ...item,
      risk_labels: recoveryEvidenceRiskMatches(item.evidence, args.counts),
    }))
    .filter(item => item.risk_labels.length > 0)

  return {
    visible: evidence.length > 0,
    status: failedItems.length > 0 ? 'warn' as const : 'ok' as const,
    evidence,
    failed_evidence: failedItems.map(item => item.evidence),
    failed_items: failedItems,
    summary: failedItems.length > 0
      ? `恢复放行依据 ${failedItems.length} 项未被本批交稿兑现：${failedItems.map(item => item.evidence).slice(0, 3).join('；')}`
      : evidence.length > 0 ? '恢复放行依据已被本批交稿复盘接住。' : '本批没有恢复放行依据。',
  }
}

export function recoveryEvidenceReleaseSummaryFromPreflight(preflight: AnyRecord | null | undefined) {
  return parsePayload(preflight?.recovery_evidence_release_summary || preflight?.recoveryEvidenceReleaseSummary)
    || preflight?.recovery_evidence_release_summary
    || preflight?.recoveryEvidenceReleaseSummary
    || null
}

export function isStrengthenedRepairReleaseEvidence(value: any) {
  const normalized = text(value)
  return normalized.includes('强化深修') || normalized.includes('强化复检')
}

export function strengthenedRepairReleaseSourcesFromPreflight(preflight: AnyRecord | null | undefined) {
  const releaseSummary = recoveryEvidenceReleaseSummaryFromPreflight(preflight)
  const sources = [
    ...arrayValue(releaseSummary?.strengthened_repair_sources),
    ...arrayValue(releaseSummary?.strengthenedRepairSources),
  ]
  const seen = new Set<string>()
  return sources
    .map(source => {
      const label = firstText(source?.label, source?.source_label, source?.sourceLabel, source?.source)
      const status = text(source?.status)
      const statusLabel = firstText(
        source?.status_label,
        source?.statusLabel,
        status === 'converged' ? '强化深修已收敛' : '强化深修恢复',
      )
      const evidence = firstText(source?.evidence, source?.text, label && statusLabel ? `${label}：${statusLabel}` : statusLabel)
      return evidence ? {
        evidence,
        source: text(source?.source || source?.sourceMode, 'strengthened_repair_recheck'),
        source_label: label || '强化深修来源',
        source_status: status,
        status_label: statusLabel,
      } : null
    })
    .filter((source): source is AnyRecord => {
      if (!source) return false
      const key = [source.source, source.evidence].join('|')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

export function buildStrengthenedRepairAcceptanceReview(args: {
  preflight?: AnyRecord | null
  counts: {
    coreRiskTotal: number
    payoffDebtTotal: number
    readerPullRiskTotal: number
  }
}) {
  const sources = strengthenedRepairReleaseSourcesFromPreflight(args.preflight)
  const sourceEvidence = sources.map(source => text(source?.evidence)).filter(Boolean)
  const coreRiskCount = Math.max(0, Number(args.counts.coreRiskTotal || 0))
  const payoffDebtCount = Math.max(0, Number(args.counts.payoffDebtTotal || 0))
  const readerPullRiskCount = Math.max(0, Number(args.counts.readerPullRiskTotal || 0))
  const failedEvidence = [
    coreRiskCount > 0 ? `核心守恒风险 ${coreRiskCount} 项` : '',
    payoffDebtCount > 0 ? `读者回报欠账 ${payoffDebtCount} 项` : '',
    readerPullRiskCount > 0 ? `读者拉力风险 ${readerPullRiskCount} 项` : '',
  ].filter(Boolean)
  const riskCount = coreRiskCount + payoffDebtCount + readerPullRiskCount
  const sourceSummary = sourceEvidence.slice(0, 2).join('；') || '强化深修来源'

  return {
    visible: sourceEvidence.length > 0,
    status: riskCount > 0 ? 'warn' as const : 'ok' as const,
    source_evidence: sourceEvidence,
    sources,
    failed_evidence: failedEvidence,
    risk_count: riskCount,
    core_risk_count: coreRiskCount,
    payoff_debt_count: payoffDebtCount,
    reader_pull_risk_count: readerPullRiskCount,
    summary: riskCount > 0
      ? `强化深修恢复验收未通过：${sourceSummary} 放行后仍有${failedEvidence.join('、')}。`
      : `强化深修恢复验收已通过：${sourceSummary} 放行后核心守恒、读者回报和追读拉力正常。`,
  }
}

export function emptyStrengthenedRepairAcceptanceTrend(): AutoCreationStrengthenedRepairAcceptanceTrend {
  return {
    visible: false,
    status: 'ok',
    label: '强化恢复验收趋势',
    summary: '暂无强化深修恢复后的批次验收记录。',
    acceptedBatchCount: 0,
    failedBatchCount: 0,
    passStreak: 0,
    latestStatus: 'none',
    latestBatchLabel: '',
    latestRunId: null,
    sourceEvidence: [],
    dimensions: {
      core: { label: '核心守恒', failedCount: 0 },
      payoff: { label: '读者回报', failedCount: 0 },
      readerPull: { label: '读者拉力', failedCount: 0 },
    },
  }
}

export function strengthenedAcceptanceFailedEvidence(counts: {
  coreRiskCount: number
  payoffDebtCount: number
  readerPullRiskCount: number
}) {
  return [
    counts.coreRiskCount > 0 ? `核心守恒风险 ${counts.coreRiskCount} 项` : '',
    counts.payoffDebtCount > 0 ? `读者回报欠账 ${counts.payoffDebtCount} 项` : '',
    counts.readerPullRiskCount > 0 ? `读者拉力风险 ${counts.readerPullRiskCount} 项` : '',
  ].filter(Boolean)
}

export function strengthenedAcceptanceBatchEvent(args: {
  run: AnyRecord
  chapters: AnyRecord[]
  reviews: AnyRecord[]
  storyState?: AnyRecord | null
}) {
  if (text(args.run?.run_type) !== 'batch_generate_prose') return null
  const input = parsePayload(args.run?.input_ref, { owner: args.run, kind: 'run', field: 'input_ref' }) || {}
  const output = parsePayload(args.run?.output_ref, { owner: args.run, kind: 'run', field: 'output_ref' }) || {}
  const preflight = input?.batch_preflight || input?.batchPreflight || null
  const sources = strengthenedRepairReleaseSourcesFromPreflight(preflight)
  if (!sources.length) return null
  const outputChapters = arrayValue(output?.chapters)
  const items = outputChapters.map((chapter: any) => ({
    chapterId: chapter?.id ?? chapter?.chapter_id ?? null,
    chapterNo: Number(chapter?.chapter_no ?? chapter?.chapterNo ?? 0),
    title: text(chapter?.title, `第${Number(chapter?.chapter_no ?? chapter?.chapterNo ?? 0)}章`),
    status: text(chapter?.status) === 'success' ? 'success' as AutoCreationBatchReviewItemStatus : 'failed' as AutoCreationBatchReviewItemStatus,
  })).filter(item => item.chapterNo > 0)
  const deliveredItems = items.filter(item => {
    if (item.status !== 'success') return false
    const chapter = findChapter(args.chapters, item)
    if (!chapter || !hasDeliveredProse(chapter)) return false
    return qualityReviewPassed(latestQualityReviewForChapter(args.reviews, chapter, item.chapterNo))
  })
  if (!deliveredItems.length) return null

  let coreRiskTotal = 0
  let payoffDebtTotal = 0
  let readerPullRiskTotal = 0
  deliveredItems.forEach(item => {
    const chapter = findChapter(args.chapters, item)
    if (!chapter) return
    const coreReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'chapter_core_drift')
    const payoffReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'reader_payoff_sync')
    const expectationReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'reader_expectation_sync')
    const retentionReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'reader_retention_sync')
    coreRiskTotal += coreRiskCount(coreReview)
    payoffDebtTotal += payoffDebtCount(payoffReview)
    readerPullRiskTotal += expectationRiskCount(expectationReview) + retentionRiskCount(retentionReview)
  })
  const failedEvidence = strengthenedAcceptanceFailedEvidence({
    coreRiskCount: coreRiskTotal,
    payoffDebtCount: payoffDebtTotal,
    readerPullRiskCount: readerPullRiskTotal,
  })
  const releaseSummary = recoveryEvidenceReleaseSummaryFromPreflight(preflight)
  const batchLabel = firstText(
    releaseSummary?.next_batch_label,
    releaseSummary?.nextBatchLabel,
    deliveredItems.length ? `第${deliveredItems[0].chapterNo}-${deliveredItems[deliveredItems.length - 1].chapterNo}章` : '',
  )

  return {
    status: failedEvidence.length ? 'warn' as const : 'ok' as const,
    event_at: text(args.run?.created_at || args.run?.updated_at),
    run_id: args.run?.id ?? null,
    batch_label: batchLabel,
    source_evidence: sources.map(source => text(source?.evidence)).filter(Boolean),
    failed_evidence: failedEvidence,
    core_risk_count: coreRiskTotal,
    payoff_debt_count: payoffDebtTotal,
    reader_pull_risk_count: readerPullRiskTotal,
  }
}

export function strengthenedAcceptanceRepairTaskEvents(runRecords: AnyRecord[]) {
  return arrayValue(runRecords).flatMap(run => {
    const output = parsePayload(run?.output_ref, { owner: run, kind: 'run', field: 'output_ref' }) || {}
    return arrayValue(output?.tasks).map(task => {
      if (text(task?.issue_type || task?.issueType) !== 'strengthened_repair_acceptance_mismatch') return null
      if (isResolvedTaskStatus(task?.task_status || task?.taskStatus)) return null
      const review = task?.strengthened_repair_acceptance_review || task?.strengthenedRepairAcceptanceReview || {}
      const failedEvidence = arrayValue(review?.failed_evidence || review?.failedEvidence).map(item => text(item)).filter(Boolean)
      const coreRiskCount = Number(review?.core_risk_count ?? review?.coreRiskCount ?? (failedEvidence.some(item => item.includes('核心')) ? 1 : 0))
      const payoffDebtCount = Number(review?.payoff_debt_count ?? review?.payoffDebtCount ?? (failedEvidence.some(item => item.includes('回报')) ? 1 : 0))
      const readerPullRiskCount = Number(review?.reader_pull_risk_count ?? review?.readerPullRiskCount ?? (failedEvidence.some(item => item.includes('拉力') || item.includes('追读')) ? 1 : 0))
      return {
        status: 'warn' as const,
        event_at: text(run?.created_at || run?.updated_at),
        run_id: run?.id ?? null,
        batch_label: firstText(review?.batch_label, review?.batchLabel, task?.title, '强化复盘批次'),
        source_evidence: arrayValue(review?.source_evidence || review?.sourceEvidence).map(item => text(item)).filter(Boolean),
        failed_evidence: failedEvidence.length
          ? failedEvidence
          : strengthenedAcceptanceFailedEvidence({ coreRiskCount, payoffDebtCount, readerPullRiskCount }),
        core_risk_count: Number.isFinite(coreRiskCount) ? coreRiskCount : 0,
        payoff_debt_count: Number.isFinite(payoffDebtCount) ? payoffDebtCount : 0,
        reader_pull_risk_count: Number.isFinite(readerPullRiskCount) ? readerPullRiskCount : 0,
      }
    }).filter(Boolean)
  })
}

export function buildStrengthenedRepairAcceptanceTrend(args: {
  runRecords: AnyRecord[]
  chapters: AnyRecord[]
  reviews: AnyRecord[]
  storyState?: AnyRecord | null
}): AutoCreationStrengthenedRepairAcceptanceTrend {
  const batchEvents = arrayValue(args.runRecords)
    .map(run => strengthenedAcceptanceBatchEvent({
      run,
      chapters: args.chapters,
      reviews: args.reviews,
      storyState: args.storyState,
    }))
    .filter((event): event is AnyRecord => Boolean(event))
  const events = [
    ...batchEvents,
    ...strengthenedAcceptanceRepairTaskEvents(args.runRecords),
  ].sort((a, b) => recoveryEvidenceEventTime(a.event_at) - recoveryEvidenceEventTime(b.event_at))
  if (!events.length) return emptyStrengthenedRepairAcceptanceTrend()

  const acceptedBatchCount = events.filter(event => event.status === 'ok').length
  const failedBatchCount = events.filter(event => event.status === 'warn').length
  const latest = events[events.length - 1]
  let passStreak = 0
  for (let index = events.length - 1; index >= 0; index -= 1) {
    if (events[index].status !== 'ok') break
    passStreak += 1
  }
  const coreFailedCount = events.reduce((sum, event) => sum + Number(event.core_risk_count || 0), 0)
  const payoffFailedCount = events.reduce((sum, event) => sum + Number(event.payoff_debt_count || 0), 0)
  const readerPullFailedCount = events.reduce((sum, event) => sum + Number(event.reader_pull_risk_count || 0), 0)
  const latestFailedEvidence = arrayValue(latest?.failed_evidence).map(item => text(item)).filter(Boolean)
  const latestSourceEvidence = arrayValue(latest?.source_evidence).map(item => text(item)).filter(Boolean)
  const status: AutoCreationBatchGuardrailSignalStatus = latest.status === 'warn' ? 'warn' : 'ok'
  const summary = status === 'warn'
    ? `强化恢复验收最近 1 批未通过：${latestFailedEvidence.slice(0, 3).join('、') || '核心/回报/追读仍需复盘'}；本轮回到单章治理。`
    : `强化恢复验收连续 ${Math.max(1, passStreak)} 批通过，核心守恒、读者回报和追读拉力趋势稳定，可继续小批量扩批观察。`

  return {
    visible: true,
    status,
    label: '强化恢复验收趋势',
    summary,
    acceptedBatchCount,
    failedBatchCount,
    passStreak,
    latestStatus: latest.status,
    latestBatchLabel: text(latest.batch_label),
    latestRunId: latest.run_id ?? null,
    sourceEvidence: Array.from(new Set([
      ...latestSourceEvidence,
      ...events.flatMap(event => arrayValue(event.source_evidence).map(item => text(item)).filter(Boolean)),
    ])).slice(0, 6),
    dimensions: {
      core: { label: '核心守恒', failedCount: coreFailedCount },
      payoff: { label: '读者回报', failedCount: payoffFailedCount },
      readerPull: { label: '读者拉力', failedCount: readerPullFailedCount },
    },
  }
}

export function strengthenedRepairAcceptanceTrendSnapshot(trend: AutoCreationStrengthenedRepairAcceptanceTrend) {
  if (!trend.visible) return null
  return {
    visible: true,
    status: trend.status,
    label: trend.label,
    summary: trend.summary,
    accepted_batch_count: trend.acceptedBatchCount,
    failed_batch_count: trend.failedBatchCount,
    pass_streak: trend.passStreak,
    latest_status: trend.latestStatus,
    latest_batch_label: trend.latestBatchLabel,
    latest_run_id: trend.latestRunId,
    source_evidence: trend.sourceEvidence,
    dimensions: {
      core: { label: trend.dimensions.core.label, failed_count: trend.dimensions.core.failedCount },
      payoff: { label: trend.dimensions.payoff.label, failed_count: trend.dimensions.payoff.failedCount },
      reader_pull: { label: trend.dimensions.readerPull.label, failed_count: trend.dimensions.readerPull.failedCount },
    },
  }
}

export function safeBatchRecoveryRoadmapLane(targetChapterCount: number) {
  if (targetChapterCount <= 1) return { key: 'single_chapter', label: '1章治理' }
  if (targetChapterCount >= 5) return { key: 'expanded_batch', label: '5章连写' }
  return { key: 'small_batch', label: `${Math.max(1, targetChapterCount)}章验证` }
}

export function safeBatchRecoveryRoadmapNode(args: {
  key: string
  label: string
  status: string
  targetChapterCount: number
  detail: string
  actionLabel: string
  focus?: AnyRecord | null
}) {
  const focus = args.focus || safeBatchRecoveryRoadmapFocus(args.key, args.label, args.actionLabel)
  return {
    key: args.key,
    label: args.label,
    status: ['ok', 'warn', 'pending'].includes(args.status) ? args.status : 'pending',
    target_chapter_count: Math.max(0, Number(args.targetChapterCount || 0)),
    detail: text(args.detail),
    action_label: text(args.actionLabel),
    ...(focus ? { focus } : {}),
  }
}

export function safeBatchRecoveryRoadmapActionLabel(key: string) {
  if (key === 'strengthened_acceptance') return '查看强化复盘'
  if (key === 'expansion_feedback') return '修扩批热区'
  if (key === 'structure_validation') return '修扩批结构'
  if (key === 'structure_repair_effectiveness') return '重做结构修复'
  if (key === 'structure_decision_execution') return '补齐结构决策执行'
  if (key === 'default_lane_template_version') return '修当前模板版本'
  return '查看安全连写'
}

export function safeBatchRecoveryRoadmapFocus(key: string, label: string, actionLabel: string, overrides: AnyRecord | null = null) {
  const focusMap: Record<string, AnyRecord> = {
    strengthened_acceptance: {
      target_view: 'recovery_review',
      issue_type: 'strengthened_repair_acceptance_mismatch',
      source: 'strengthened_repair_acceptance_trend',
      task_center_filter_label: '强化复盘',
    },
    expansion_feedback: {
      target_view: 'repair_task',
      issue_type: 'safe_batch_expansion_segment_hotspot',
      source: 'safe_batch_expansion_feedback',
      task_center_filter_label: '扩批分段',
    },
    structure_validation: {
      target_view: 'repair_task',
      issue_type: 'safe_batch_expansion_structure_repair',
      source: 'safe_batch_expansion_structure_validation',
      task_center_filter_label: '扩批结构',
    },
    structure_repair_effectiveness: {
      target_view: 'repair_task',
      issue_type: 'safe_batch_expansion_structure_repair',
      source: 'safe_batch_expansion_structure_repair_effectiveness',
      task_center_filter_label: '扩批结构',
    },
    structure_decision_execution: {
      target_view: 'repair_task',
      issue_type: 'safe_batch_expansion_structure_decision_mismatch',
      source: 'safe_batch_expansion_structure_decision_trend',
      task_center_filter_label: '扩批结构决策',
    },
    default_lane_template_version: {
      target_view: 'repair_task',
      issue_type: 'safe_batch_expansion_structure_repair',
      source: 'default_five_chapter_lane_template_stability_profile',
      task_center_filter_label: '当前模板版本',
      requirement_key: 'default_lane_template',
    },
  }
  const focus = focusMap[key]
  if (!focus) return null
  return {
    layer_key: key,
    layer_label: label,
    action_label: actionLabel,
    task_statuses: ['open', 'needs_review'],
    ...focus,
    ...(overrides || {}),
  }
}

export function buildSafeBatchRecoveryRoadmap(args: {
  trend: AutoCreationStrengthenedRepairAcceptanceTrend
  feedback?: AnyRecord | null
  policyStatus: string
  policySummary: string
  targetChapterCount: number
  baseChapterCount: number
  expandedChapterCount: number
  requiredPassStreak: number
}) {
  const feedback = args.feedback || null
  const feedbackStatus = text(feedback?.status, 'none')
  const validationTrend = feedback?.expansionStructureValidationTrend
    || feedback?.expansion_structure_validation_trend
    || null
  const repairEffectiveness = feedback?.expansionStructureRepairEffectiveness
    || feedback?.expansion_structure_repair_effectiveness
    || null
  const decisionTrend = feedback?.expansionStructureDecisionTrend
    || feedback?.expansion_structure_decision_trend
    || null
  const defaultLaneTemplateStabilityProfile = feedback?.defaultFiveChapterLaneTemplateStabilityProfile
    || feedback?.default_five_chapter_lane_template_stability_profile
    || null
  const latestTemplateVersionProfile = defaultLaneTemplateStabilityProfile?.latest_template_version_profile
    || defaultLaneTemplateStabilityProfile?.latestTemplateVersionProfile
    || null
  const strengthenedStatus = args.trend.status === 'warn' || args.trend.latestStatus === 'warn'
    ? 'warn'
    : args.trend.passStreak >= args.requiredPassStreak
      ? 'ok'
      : 'pending'
  const feedbackNodeStatus = ['rollback_to_single_chapter', 'rollback_to_small_batch'].includes(feedbackStatus)
    ? 'warn'
    : ['passed', 'recovered'].includes(feedbackStatus)
      ? 'ok'
      : 'pending'
  const feedbackRepeatedHotspot = feedback?.repeatedHotspotSegment || feedback?.repeated_hotspot_segment || null
  const feedbackRestoreRelapse = text(feedbackRepeatedHotspot?.source) === 'safe_batch_recovery_restore_five_batch'
  const feedbackDefaultRegression = feedback?.defaultFiveChapterRegression || feedback?.default_five_chapter_regression || null
  const feedbackDefaultRegressionRelapse = Boolean(feedbackDefaultRegression && feedbackDefaultRegression.visible !== false)
  const feedbackNeedsStructureValidation = feedbackRestoreRelapse || feedbackDefaultRegressionRelapse
  const feedbackFocus = feedbackNeedsStructureValidation
    ? safeBatchRecoveryRoadmapFocus('structure_validation', '结构验证', safeBatchRecoveryRoadmapActionLabel('structure_validation'))
    : null
  const validationStatus = validationTrend?.visible
    ? text(validationTrend?.status) === 'warn' ? 'warn' : 'ok'
    : 'pending'
  const repairRecommendation = text(repairEffectiveness?.recommendation)
  const repairStatus = repairEffectiveness?.visible
    ? repairRecommendation === 'escalate_structure_redesign' ? 'warn' : 'ok'
    : 'pending'
  const decisionStatus = decisionTrend?.visible
    ? text(decisionTrend?.status) === 'warn' ? 'warn' : 'ok'
    : 'pending'
  const topDecisionRequirement = decisionTrend?.top_failed_requirement || decisionTrend?.topFailedRequirement || null
  const decisionFailedRequirements = arrayValue(decisionTrend?.failed_requirements || decisionTrend?.failedRequirements)
  const decisionHasDefaultLaneTemplateGap = Boolean(
    decisionTrend?.default_five_chapter_lane_redesign
    || decisionTrend?.defaultFiveChapterLaneRedesign
    || text(topDecisionRequirement?.key).startsWith('default_lane_')
    || decisionFailedRequirements.some((item: AnyRecord) => text(item?.key).startsWith('default_lane_')),
  )
  const decisionActionLabel = decisionHasDefaultLaneTemplateGap
    ? '补默认档位模板'
    : safeBatchRecoveryRoadmapActionLabel('structure_decision_execution')
  const decisionFocus = decisionHasDefaultLaneTemplateGap
    ? safeBatchRecoveryRoadmapFocus('structure_decision_execution', '结构决策执行', decisionActionLabel, {
      task_center_filter_label: '默认档位模板',
      requirement_key: 'default_lane_template',
    })
    : null
  const templateVersionId = text(latestTemplateVersionProfile?.id || latestTemplateVersionProfile?.template_version_id || latestTemplateVersionProfile?.templateVersionId)
  const templateVersionStatus = text(latestTemplateVersionProfile?.status)
  const templateVersionPassStreak = Number(latestTemplateVersionProfile?.pass_streak ?? latestTemplateVersionProfile?.passStreak ?? 0)
  const templateVersionRequiredPassStreak = Number(latestTemplateVersionProfile?.required_pass_streak ?? latestTemplateVersionProfile?.requiredPassStreak ?? defaultLaneTemplateStabilityProfile?.required_pass_streak ?? defaultLaneTemplateStabilityProfile?.requiredPassStreak ?? 2)
  const latestProductionRelapseVerdict = latestTemplateVersionProfile?.latest_production_relapse_verdict
    || latestTemplateVersionProfile?.latestProductionRelapseVerdict
    || null
  const latestProductionRelapseStatus = text(latestProductionRelapseVerdict?.status)
  const latestProductionRelapseRemainingReasons = arrayValue(latestProductionRelapseVerdict?.remaining_failure_reasons || latestProductionRelapseVerdict?.remainingFailureReasons)
    .map((reason: any) => text(reason))
    .filter(Boolean)
  const latestProductionRelapseClearedReasons = arrayValue(latestProductionRelapseVerdict?.cleared_failure_reasons || latestProductionRelapseVerdict?.clearedFailureReasons)
    .map((reason: any) => text(reason))
    .filter(Boolean)
  const latestProductionRelapseText = latestProductionRelapseStatus === 'failed'
    ? `生产后验仍复发：${latestProductionRelapseRemainingReasons.join('、') || '真实生产失败维度'}。`
    : latestProductionRelapseStatus === 'passed'
      ? `生产后验已修复：${latestProductionRelapseClearedReasons.join('、') || '真实生产失败维度'}已清零。`
      : ''
  const defaultLaneTemplateStatus = text(defaultLaneTemplateStabilityProfile?.status)
  const defaultLaneTemplateVersionWarn = ['relapsed', 'redesign'].includes(defaultLaneTemplateStatus)
    || ['relapsed', 'redesign'].includes(templateVersionStatus)
  const defaultLaneTemplateVersionReady = Boolean(defaultLaneTemplateStabilityProfile)
    && !defaultLaneTemplateVersionWarn
    && (templateVersionStatus === 'ready' || (!templateVersionId && defaultLaneTemplateStatus === 'ready'))
  const defaultLaneTemplateVersionStatus = !defaultLaneTemplateStabilityProfile
    ? 'pending'
    : defaultLaneTemplateVersionWarn
      ? 'warn'
      : defaultLaneTemplateVersionReady
        ? 'ok'
        : 'pending'
  const defaultLaneTemplateVersionActionLabel = defaultLaneTemplateVersionStatus === 'warn'
    ? latestProductionRelapseStatus === 'failed'
      ? '修生产后验'
      : defaultLaneTemplateStatus === 'redesign' || templateVersionStatus === 'redesign'
      ? '重构当前模板版本'
      : '修当前模板版本'
    : defaultLaneTemplateVersionStatus === 'ok'
      ? '当前模板版本稳定'
      : '观察当前模板版本'
  const defaultLaneTemplateVersionFocus = defaultLaneTemplateVersionStatus === 'warn'
    ? safeBatchRecoveryRoadmapFocus('default_lane_template_version', '默认档位模板版本', defaultLaneTemplateVersionActionLabel, {
      task_center_filter_label: latestProductionRelapseStatus === 'failed' ? '生产后验仍复发' : '当前模板版本',
      requirement_key: 'default_lane_template',
      template_version_id: templateVersionId,
    })
    : null
  const routeNodes = [
    safeBatchRecoveryRoadmapNode({
      key: 'strengthened_acceptance',
      label: '强化验收',
      status: strengthenedStatus,
      targetChapterCount: strengthenedStatus === 'ok' ? args.expandedChapterCount : args.baseChapterCount,
      detail: args.trend.visible
        ? args.trend.summary
        : `尚未形成强化验收趋势，先保持 ${args.baseChapterCount} 章以内。`,
      actionLabel: safeBatchRecoveryRoadmapActionLabel('strengthened_acceptance'),
    }),
    safeBatchRecoveryRoadmapNode({
      key: 'expansion_feedback',
      label: '扩批热区',
      status: feedbackNodeStatus,
      targetChapterCount: feedbackNodeStatus === 'warn' ? Number(feedback?.targetChapterCount || args.baseChapterCount) : args.expandedChapterCount,
      detail: text(feedback?.summary, '尚未产生5章扩批热区复盘。'),
      actionLabel: feedbackNeedsStructureValidation
        ? safeBatchRecoveryRoadmapActionLabel('structure_validation')
        : safeBatchRecoveryRoadmapActionLabel('expansion_feedback'),
      focus: feedbackFocus,
    }),
    safeBatchRecoveryRoadmapNode({
      key: 'structure_validation',
      label: '结构验证',
      status: validationStatus,
      targetChapterCount: validationStatus === 'warn' ? args.baseChapterCount : args.expandedChapterCount,
      detail: text(validationTrend?.summary, '尚未进入扩批结构验证批。'),
      actionLabel: safeBatchRecoveryRoadmapActionLabel('structure_validation'),
    }),
    safeBatchRecoveryRoadmapNode({
      key: 'structure_repair_effectiveness',
      label: '结构修复有效性',
      status: repairStatus,
      targetChapterCount: repairRecommendation === 'escalate_structure_redesign' ? 1 : repairRecommendation === 'continue_small_validation' ? args.baseChapterCount : args.expandedChapterCount,
      detail: text(repairEffectiveness?.summary, '尚未形成结构修复有效性结论。'),
      actionLabel: safeBatchRecoveryRoadmapActionLabel('structure_repair_effectiveness'),
    }),
    safeBatchRecoveryRoadmapNode({
      key: 'structure_decision_execution',
      label: '结构决策执行',
      status: decisionStatus,
      targetChapterCount: decisionStatus === 'warn'
        ? Number(decisionTrend?.suggested_target_chapter_count ?? decisionTrend?.suggestedTargetChapterCount ?? args.baseChapterCount)
        : args.expandedChapterCount,
      detail: topDecisionRequirement
        ? `结构决策漏项：${text(topDecisionRequirement.label, '执行要求')} ${Number(topDecisionRequirement.count || 0)}。${text(decisionTrend?.summary)}`
        : text(decisionTrend?.summary, '尚未形成结构决策执行趋势。'),
      actionLabel: decisionActionLabel,
      focus: decisionFocus,
    }),
    safeBatchRecoveryRoadmapNode({
      key: 'default_lane_template_version',
      label: '默认档位模板版本',
      status: defaultLaneTemplateVersionStatus,
      targetChapterCount: defaultLaneTemplateVersionStatus === 'warn'
        ? defaultLaneTemplateStatus === 'redesign' || templateVersionStatus === 'redesign' ? 1 : args.baseChapterCount
        : defaultLaneTemplateVersionStatus === 'ok' ? args.expandedChapterCount : args.baseChapterCount,
      detail: templateVersionId
        ? [
          text(defaultLaneTemplateStabilityProfile?.summary, '默认档位模板版本仍在观察。'),
          latestProductionRelapseText,
          `当前模板版本 ${templateVersionId} 连过 ${Math.max(0, templateVersionPassStreak)}/${Math.max(1, templateVersionRequiredPassStreak || 2)}。`,
        ].filter(Boolean).join(' ')
        : text(defaultLaneTemplateStabilityProfile?.summary, '尚未形成默认档位模板版本稳定证据。'),
      actionLabel: defaultLaneTemplateVersionActionLabel,
      focus: defaultLaneTemplateVersionFocus,
    }),
  ]
  const preferredTemplateVersionLayer = defaultLaneTemplateVersionStatus === 'warn'
    ? routeNodes.find(node => node.key === 'default_lane_template_version') || null
    : null
  const nextRepairLayer = preferredTemplateVersionLayer
    || routeNodes.find(node => node.status === 'warn')
    || routeNodes.find(node => node.status === 'pending')
    || null
  const lane = safeBatchRecoveryRoadmapLane(args.targetChapterCount)
  const recommendedFocus = nextRepairLayer?.status === 'warn'
    ? nextRepairLayer.focus || safeBatchRecoveryRoadmapFocus(nextRepairLayer.key, nextRepairLayer.label, nextRepairLayer.action_label)
    : null

  return {
    visible: true,
    label: '安全连写恢复路线图',
    current_lane: lane.key,
    current_lane_label: lane.label,
    current_target_chapter_count: Math.max(1, Number(args.targetChapterCount || 1)),
    current_status: text(args.policyStatus, 'observing'),
    current_reason: text(args.policySummary),
    next_repair_layer: nextRepairLayer,
    ...(recommendedFocus ? { recommended_focus: recommendedFocus } : {}),
    route_nodes: routeNodes,
  }
}

export function buildSafeBatchExpansionPolicy(
  trend: AutoCreationStrengthenedRepairAcceptanceTrend,
  expansionFeedback?: AnyRecord | null,
) {
  const requiredPassStreak = 3
  const baseChapterCount = 3
  const expandedChapterCount = 5
  const feedback = expansionFeedback?.visible ? expansionFeedback : null
  const feedbackStatus = text(feedback?.status)
  const structureRepairEffectiveness = feedback?.expansionStructureRepairEffectiveness
    || feedback?.expansion_structure_repair_effectiveness
    || null
  const structureDecisionTrend = feedback?.expansionStructureDecisionTrend
    || feedback?.expansion_structure_decision_trend
    || null
  const defaultLaneTemplateStabilityProfile = feedback?.defaultFiveChapterLaneTemplateStabilityProfile
    || feedback?.default_five_chapter_lane_template_stability_profile
    || null
  const structureRepairRecommendation = text(structureRepairEffectiveness?.recommendation)
  const defaultLaneTemplateRecommendation = text(defaultLaneTemplateStabilityProfile?.recommendation)
  const defaultLaneTemplateStatus = text(defaultLaneTemplateStabilityProfile?.status)
  const structureRepairNeedsMoreValidation = structureRepairRecommendation === 'continue_small_validation'
  const structureRepairNeedsRedesign = structureRepairRecommendation === 'escalate_structure_redesign'
  const defaultLaneTemplateNeedsObservation = defaultLaneTemplateRecommendation === 'continue_validation'
    || defaultLaneTemplateStatus === 'observing'
  const defaultLaneTemplateNeedsRepair = defaultLaneTemplateRecommendation === 'repair_template'
    || defaultLaneTemplateStatus === 'relapsed'
  const defaultLaneTemplateNeedsRedesign = defaultLaneTemplateRecommendation === 'escalate_template_redesign'
    || defaultLaneTemplateStatus === 'redesign'
  const structureDecisionTrendWarn = text(structureDecisionTrend?.status) === 'warn'
  const feedbackNeedsRecovery = feedbackStatus === 'rollback_to_single_chapter' || feedbackStatus === 'rollback_to_small_batch'
  const feedbackRecovered = feedbackStatus === 'recovered'
  const canExpandByTrend = Boolean(
    trend.visible
    && trend.status === 'ok'
    && trend.latestStatus === 'ok'
    && trend.passStreak >= requiredPassStreak,
  )
  const canExpand = canExpandByTrend
    && !feedbackNeedsRecovery
    && !structureRepairNeedsMoreValidation
    && !structureRepairNeedsRedesign
    && !defaultLaneTemplateNeedsObservation
    && !defaultLaneTemplateNeedsRepair
    && !defaultLaneTemplateNeedsRedesign
    && !structureDecisionTrendWarn
  let targetChapterCount = baseChapterCount
  if (canExpand) {
    targetChapterCount = expandedChapterCount
  } else if (structureRepairNeedsRedesign || defaultLaneTemplateNeedsRedesign) {
    targetChapterCount = 1
  } else if (structureDecisionTrendWarn) {
    targetChapterCount = Math.max(1, Math.min(
      baseChapterCount,
      Number(structureDecisionTrend?.suggested_target_chapter_count ?? structureDecisionTrend?.suggestedTargetChapterCount ?? baseChapterCount),
    ))
  } else if (structureRepairNeedsMoreValidation || defaultLaneTemplateNeedsObservation || defaultLaneTemplateNeedsRepair) {
    targetChapterCount = baseChapterCount
  } else if (feedbackNeedsRecovery) {
    targetChapterCount = Math.max(1, Math.min(baseChapterCount, Number(feedback?.targetChapterCount || baseChapterCount)))
  }
  const structureRepairSummary = text(structureRepairEffectiveness?.summary)
  let summary = trend.visible
    ? `强化恢复验收连续 ${Math.max(0, trend.passStreak)}/${requiredPassStreak} 批通过；达到 ${requiredPassStreak} 批前继续保持 ${baseChapterCount} 章以内小批量安全连写。`
    : `暂无强化恢复验收趋势，继续保持 ${baseChapterCount} 章以内小批量安全连写。`
  if (structureRepairNeedsRedesign) {
    summary = `强化恢复验收连续 ${Math.max(0, trend.passStreak)}/${requiredPassStreak} 批通过；${structureRepairSummary}结构修复有效性要求升级批次设计重构，下一轮回到单章治理。`
  } else if (defaultLaneTemplateNeedsRedesign) {
    summary = `强化恢复验收连续 ${Math.max(0, trend.passStreak)}/${requiredPassStreak} 批通过；${text(defaultLaneTemplateStabilityProfile?.summary)}默认档位模板稳定性要求升级模板重构，下一轮回到单章治理。`
  } else if (structureDecisionTrendWarn) {
    summary = `强化恢复验收连续 ${Math.max(0, trend.passStreak)}/${requiredPassStreak} 批通过；${text(structureDecisionTrend?.summary)}结构决策执行趋势未稳，下一轮保持 ${targetChapterCount} 章以内安全连写。`
  } else if (structureRepairNeedsMoreValidation) {
    summary = `强化恢复验收连续 ${Math.max(0, trend.passStreak)}/${requiredPassStreak} 批通过；${structureRepairSummary}结构修复有效性建议继续小批验证，下一轮保持 ${baseChapterCount} 章以内安全连写。`
  } else if (defaultLaneTemplateNeedsObservation) {
    summary = `强化恢复验收连续 ${Math.max(0, trend.passStreak)}/${requiredPassStreak} 批通过；${text(defaultLaneTemplateStabilityProfile?.summary)}下一轮继续保持 ${baseChapterCount} 章模板观察批。`
  } else if (defaultLaneTemplateNeedsRepair) {
    summary = `强化恢复验收连续 ${Math.max(0, trend.passStreak)}/${requiredPassStreak} 批通过；${text(defaultLaneTemplateStabilityProfile?.summary)}默认档位模板仍需回修，下一轮保持 ${baseChapterCount} 章以内验证。`
  } else if (feedbackNeedsRecovery) {
    summary = `强化恢复验收连续 ${Math.max(0, trend.passStreak)}/${requiredPassStreak} 批通过，但最近一次5章扩批存在扩批分段热区；${text(feedback?.summary, `下一轮保持 ${targetChapterCount} 章以内安全连写。`)}`
  } else if (canExpand) {
    summary = feedbackRecovered
      ? `强化恢复验收连续 ${trend.passStreak}/${requiredPassStreak} 批通过；${text(feedback?.summary, '扩批分段热区已修复并通过复检。')}本轮恢复 ${expandedChapterCount} 章安全连写。`
      : `强化恢复验收连续 ${trend.passStreak}/${requiredPassStreak} 批通过，核心守恒、读者回报和追读拉力未复发，本轮可从 ${baseChapterCount} 章扩到 ${expandedChapterCount} 章安全连写。`
  }
  const status = canExpand ? 'expanded' : feedbackNeedsRecovery
    || structureRepairNeedsMoreValidation
    || structureRepairNeedsRedesign
    || defaultLaneTemplateNeedsObservation
    || defaultLaneTemplateNeedsRepair
    || defaultLaneTemplateNeedsRedesign
    || structureDecisionTrendWarn ? 'recovering' : 'observing'
  const recoveryRoadmap = buildSafeBatchRecoveryRoadmap({
    trend,
    feedback,
    policyStatus: status,
    policySummary: summary,
    targetChapterCount,
    baseChapterCount,
    expandedChapterCount,
    requiredPassStreak,
  })

  return {
    visible: true,
    status,
    label: '强化扩批规则',
    summary,
    targetChapterCount,
    baseChapterCount,
    expandedChapterCount,
    requiredPassStreak,
    passStreak: Math.max(0, Number(trend.passStreak || 0)),
    acceptedBatchCount: Math.max(0, Number(trend.acceptedBatchCount || 0)),
    failedBatchCount: Math.max(0, Number(trend.failedBatchCount || 0)),
    latestStatus: trend.latestStatus,
    expansionFeedback: feedback ? safeBatchExpansionFeedbackSnapshot(feedback) : null,
    recoveryRoadmap,
  }
}

export function buildSafeBatchRecoveryRestoreConfirmation(policy: AnyRecord | null | undefined) {
  if (!policy?.visible || text(policy.status) !== 'expanded') return null
  const targetChapterCount = Number(policy.targetChapterCount ?? policy.target_chapter_count ?? 0)
  if (targetChapterCount < 5) return null
  const feedback = policy.expansionFeedback || policy.expansion_feedback || null
  const validation = feedback?.expansionStructureValidationResult
    || feedback?.expansion_structure_validation_result
    || null
  if (!validation || text(validation.status) !== 'ok') return null
  const riskCount = Number(validation.risk_count ?? validation.riskCount ?? feedback?.risk_count ?? feedback?.riskCount ?? 0)
  if (riskCount > 0) return null
  const validationChapterNos = Array.from(new Set([
    ...arrayValue(validation.validation_chapter_nos),
    ...arrayValue(validation.validationChapterNos),
    ...arrayValue(feedback?.latest_chapter_nos),
    ...arrayValue(feedback?.latestChapterNos),
  ].map(chapterNo => Number(chapterNo)).filter(chapterNo => chapterNo > 0)))
  if (!validationChapterNos.length) return null
  const chapterEvidence = compactChapterNoEvidence(validationChapterNos)
  const validationSummary = text(validation.summary)
  const defaultFiveChapterRecoveryVerdict = validation.default_five_chapter_recovery_verdict
    || validation.defaultFiveChapterRecoveryVerdict
    || null
  return {
    status: 'ready',
    label: '确认恢复5章扩批',
    summary: `3章验证批已通过：${chapterEvidence}核心守恒、显性回报和章末追读稳定，可确认恢复 ${targetChapterCount} 章扩批。`,
    validation_chapter_nos: validationChapterNos,
    target_chapter_count: targetChapterCount,
    risk_count: riskCount,
    source: 'safe_batch_recovery_validation_result',
    evidence: [
      validationSummary,
      text(defaultFiveChapterRecoveryVerdict?.summary),
    ].filter(Boolean),
    ...(defaultFiveChapterRecoveryVerdict ? {
      default_five_chapter_recovery_verdict: defaultFiveChapterRecoveryVerdict,
    } : {}),
  }
}

export function safeBatchRecoveryFocusPayload(focusLike: AnyRecord | null | undefined) {
  if (!focusLike) return null
  return {
    layerKey: text(focusLike.layer_key || focusLike.layerKey),
    layerLabel: text(focusLike.layer_label || focusLike.layerLabel),
    actionLabel: text(focusLike.action_label || focusLike.actionLabel),
    targetView: text(focusLike.target_view || focusLike.targetView),
    issueType: text(focusLike.issue_type || focusLike.issueType),
    source: text(focusLike.source),
    taskStatuses: arrayValue(focusLike.task_statuses || focusLike.taskStatuses).map(item => text(item)).filter(Boolean),
    taskCenterFilterLabel: text(focusLike.task_center_filter_label || focusLike.taskCenterFilterLabel),
    requirementKey: text(focusLike.requirement_key || focusLike.requirementKey),
    templateVersionId: text(focusLike.template_version_id || focusLike.templateVersionId),
  }
}

export function safeBatchRecoveryRoadmapRecommendedAction(roadmapLike: AnyRecord | null | undefined) {
  const roadmap = roadmapLike || null
  const focus = safeBatchRecoveryFocusPayload(roadmap?.recommended_focus || roadmap?.recommendedFocus)
  const nextLayer = roadmap?.next_repair_layer || roadmap?.nextRepairLayer || null
  if (!focus || !focus.layerKey || text(nextLayer?.status) !== 'warn') return null
  const label = focus.actionLabel || text(nextLayer?.action_label || nextLayer?.actionLabel || nextLayer?.label, '查看安全连写路线')
  const detail = text(nextLayer?.detail, text(roadmap?.current_reason || roadmap?.currentReason, '任务中心会定位到安全连写恢复路线图指出的下一层。'))
  return opsAction('open_task_center', label, detail, false, {
    source: 'safe_batch_recovery_roadmap',
    safeBatchRecoveryFocus: focus,
  })
}

export function safeBatchExpansionPolicySnapshot(policy: AnyRecord) {
  return {
    status: text(policy?.status, 'observing'),
    label: text(policy?.label, '强化扩批规则'),
    summary: text(policy?.summary),
    target_chapter_count: Number(policy?.targetChapterCount || 0),
    base_chapter_count: Number(policy?.baseChapterCount || 0),
    expanded_chapter_count: Number(policy?.expandedChapterCount || 0),
    required_pass_streak: Number(policy?.requiredPassStreak || 0),
    pass_streak: Number(policy?.passStreak || 0),
    accepted_batch_count: Number(policy?.acceptedBatchCount || 0),
    failed_batch_count: Number(policy?.failedBatchCount || 0),
    latest_status: text(policy?.latestStatus, 'none'),
    ...(policy?.expansionFeedback ? { expansion_feedback: policy.expansionFeedback } : {}),
    ...(policy?.recoveryRoadmap ? { safe_batch_recovery_roadmap: policy.recoveryRoadmap } : {}),
  }
}

export function safeBatchExpansionPolicyFromPreflight(preflight: AnyRecord | null | undefined) {
  const policy = preflight?.safe_batch_expansion_policy || preflight?.safeBatchExpansionPolicy || null
  const targetChapterCount = Number(policy?.target_chapter_count ?? policy?.targetChapterCount ?? 0)
  if (!policy || text(policy?.status) !== 'expanded' || targetChapterCount < 5) return null
  return {
    status: 'expanded',
    targetChapterCount,
    baseChapterCount: Number(policy?.base_chapter_count ?? policy?.baseChapterCount ?? 3),
    expandedChapterCount: Number(policy?.expanded_chapter_count ?? policy?.expandedChapterCount ?? targetChapterCount),
    requiredPassStreak: Number(policy?.required_pass_streak ?? policy?.requiredPassStreak ?? 3),
    passStreak: Number(policy?.pass_streak ?? policy?.passStreak ?? 0),
    summary: text(policy?.summary, '强化恢复验收趋势允许本批扩批。'),
  }
}

export function safeBatchExpansionSegmentKey(index: number, total: number) {
  const frontEnd = Math.max(1, Math.ceil(total * 0.4))
  const middleEnd = Math.max(frontEnd + 1, Math.ceil(total * 0.8))
  if (index < frontEnd) return { key: 'front', label: '前段' }
  if (index < middleEnd) return { key: 'middle', label: '中段' }
  return { key: 'ending', label: '后段' }
}

export function safeBatchExpansionRollbackPolicy(args: {
  riskCount: number
  coreRiskCount: number
  hotspotLabel: string
}) {
  const rollbackToSingle = args.coreRiskCount >= 2 || args.riskCount >= 5
  const targetChapterCount = rollbackToSingle ? 1 : 3
  return {
    mode: rollbackToSingle ? 'rollback_to_single_chapter' : 'rollback_to_small_batch',
    targetChapterCount,
    label: rollbackToSingle ? '回到单章治理' : '回退到 2-3 章',
    summary: rollbackToSingle
      ? `${args.hotspotLabel || '扩批批次'}核心风险过高，下一轮回到单章治理，先逐章修复核心守恒、读者回报和追读拉力。`
      : `${args.hotspotLabel || '扩批批次'}出现扩批热区，下一轮回退到 2-3 章安全连写，确认核心/回报/追读稳定后再扩到 5 章。`,
  }
}

export function safeBatchExpansionSegmentReviewSnapshot(review: AnyRecord) {
  return {
    visible: Boolean(review?.visible),
    status: text(review?.status, 'ok'),
    label: text(review?.label, '扩批分段复盘'),
    summary: text(review?.summary),
    target_chapter_count: Number(review?.targetChapterCount || 0),
    actual_chapter_count: Number(review?.actualChapterCount || 0),
    risk_count: Number(review?.riskCount || 0),
    segments: arrayValue(review?.segments).map(segment => ({
      key: text(segment?.key),
      label: text(segment?.label),
      chapter_nos: arrayValue(segment?.chapterNos),
      risk_count: Number(segment?.riskCount || 0),
      core_risk_count: Number(segment?.coreRiskCount || 0),
      payoff_debt_count: Number(segment?.payoffDebtCount || 0),
      reader_pull_risk_count: Number(segment?.readerPullRiskCount || 0),
      summary: text(segment?.summary),
    })),
    hotspots: arrayValue(review?.hotspots).map(segment => ({
      key: text(segment?.key),
      label: text(segment?.label),
      chapter_nos: arrayValue(segment?.chapterNos),
      risk_count: Number(segment?.riskCount || 0),
      core_risk_count: Number(segment?.coreRiskCount || 0),
      payoff_debt_count: Number(segment?.payoffDebtCount || 0),
      reader_pull_risk_count: Number(segment?.readerPullRiskCount || 0),
      summary: text(segment?.summary),
    })),
    rollback_policy: {
      mode: text(review?.rollbackPolicy?.mode),
      target_chapter_count: Number(review?.rollbackPolicy?.targetChapterCount || 0),
      label: text(review?.rollbackPolicy?.label),
      summary: text(review?.rollbackPolicy?.summary),
    },
  }
}

export function safeBatchExpansionRepeatedHotspotSegment(feedback?: AnyRecord | null) {
  const segment = feedback?.repeatedHotspotSegment || feedback?.repeated_hotspot_segment || null
  const count = Number(segment?.count || 0)
  if (!segment || count < 2) return null
  const key = text(segment?.key)
  const label = text(segment?.label, key || '复发段位')
  return {
    key,
    label,
    count,
    summary: text(segment?.summary),
    source: text(segment?.source),
  }
}

export function buildSafeBatchExpansionStructureReview(args: {
  segmentReview?: AnyRecord | null
  expansionFeedback?: AnyRecord | null
}) {
  const defaultFiveChapterRegression = args.expansionFeedback?.defaultFiveChapterRegression
    || args.expansionFeedback?.default_five_chapter_regression
    || null
  const defaultFiveChapterRecoveryVerdictRelapse = args.expansionFeedback?.defaultFiveChapterRecoveryVerdictRelapse
    || args.expansionFeedback?.default_five_chapter_recovery_verdict_relapse
    || defaultFiveChapterRegression?.default_five_chapter_recovery_verdict_relapse
    || defaultFiveChapterRegression?.defaultFiveChapterRecoveryVerdictRelapse
    || null
  const defaultRegressionSegment = defaultFiveChapterRegression?.repeated_hotspot_segment
    || defaultFiveChapterRegression?.repeatedHotspotSegment
    || null
  const repeated = safeBatchExpansionRepeatedHotspotSegment(args.expansionFeedback)
    || (defaultFiveChapterRegression?.visible !== false && defaultRegressionSegment ? {
      key: text(defaultRegressionSegment?.key),
      label: text(defaultRegressionSegment?.label, text(defaultRegressionSegment?.key, '复发段位')),
      count: Math.max(1, Number(defaultRegressionSegment?.count || 1)),
      summary: text(defaultRegressionSegment?.summary || defaultFiveChapterRegression?.summary),
      source: 'default_five_chapter_lane',
    } : null)
  const segmentReview = args.segmentReview
  const hotspots = arrayValue(segmentReview?.hotspots)
  const hotspot = repeated
    ? hotspots.find(item => text(item?.key) === repeated.key) || hotspots[0] || null
    : null
  const affectedChapterNos = arrayValue(hotspot?.chapterNos || hotspot?.chapter_nos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const latestChapterNos = arrayValue(args.expansionFeedback?.latestChapterNos || args.expansionFeedback?.latest_chapter_nos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  if (!repeated || !segmentReview?.visible || Number(segmentReview?.riskCount || segmentReview?.risk_count || 0) <= 0) {
    return {
      visible: false,
      status: 'ok',
      label: '扩批结构修复',
      summary: '扩批结构暂未触发复发治理。',
      repeated_hotspot_segment: null,
      latest_chapter_nos: latestChapterNos,
      affected_chapter_nos: [],
      hotspot_summaries: [],
      structure_actions: [],
      rollback_policy: null,
    }
  }
  const hotspotSummaries = hotspots
    .filter(item => !repeated.key || text(item?.key) === repeated.key)
    .map(item => text(item?.summary))
    .filter(Boolean)
  const segmentLabel = repeated.label || text(hotspot?.label, '复发段位')
  const rollbackPolicy = segmentReview?.rollbackPolicy || segmentReview?.rollback_policy || null
  const defaultRegressionVisible = Boolean(defaultFiveChapterRegression && defaultFiveChapterRegression.visible !== false)
  const defaultRecoveryVerdictRelapseVisible = Boolean(defaultFiveChapterRecoveryVerdictRelapse && defaultFiveChapterRecoveryVerdictRelapse.visible !== false)
  const defaultLaneTemplateProductionRelapseQueue = buildDefaultFiveChapterLaneTemplateProductionRelapseQueue(defaultFiveChapterRegression)
  return {
    visible: true,
    status: 'warn',
    label: '扩批结构修复',
    summary: defaultRecoveryVerdictRelapseVisible
      ? `${text(defaultFiveChapterRecoveryVerdictRelapse.summary, `恢复判定失效：${segmentLabel}复发。`)} 先回到扩批结构修复层，再用3章验证批重新证明默认档位可以恢复。`
      : defaultRegressionVisible
      ? `${text(defaultFiveChapterRegression.summary, `默认5章档位在${segmentLabel}复发。`)} 先回到扩批结构修复层，再用3章验证批证明默认档位可以恢复。`
      : `${segmentLabel}连续 ${repeated.count} 次成为5章扩批热区，先做固定段落治理和批次结构改写，再恢复5章连写。`,
    repeated_hotspot_segment: repeated,
    latest_chapter_nos: latestChapterNos,
    affected_chapter_nos: affectedChapterNos,
    hotspot_summaries: hotspotSummaries.length ? hotspotSummaries : [text(hotspot?.summary, repeated.summary)].filter(Boolean),
    structure_actions: [
      defaultRecoveryVerdictRelapseVisible
        ? `恢复判定失效：${text(defaultFiveChapterRecoveryVerdictRelapse.summary)} 下一轮回到3章验证批。`
        : '',
      defaultRegressionVisible
        ? `默认档位回退：先把${segmentLabel}失效原因写入任务书，下一轮回到3章验证批。`
        : '',
      defaultLaneTemplateProductionRelapseQueue
        ? `当前模板版本生产复发：${text(defaultLaneTemplateProductionRelapseQueue.summary)}`
        : '',
      `重写${segmentLabel}固定职责：每批${segmentLabel}必须完成主线转折、显性回报和章末追读，不能只铺垫或转场。`,
      '批次节奏重排：前段抛压，中段兑现并升级，后段留钩；下一次5章前先用2-3章验证。',
      '把复发段位写入下一批任务书，明确每章承担的冲突来源、回报兑现和章末翻页问题。',
    ].filter(Boolean),
    ...(defaultRegressionVisible ? { default_five_chapter_regression: defaultFiveChapterRegression } : {}),
    ...(defaultRecoveryVerdictRelapseVisible ? { default_five_chapter_recovery_verdict_relapse: defaultFiveChapterRecoveryVerdictRelapse } : {}),
    ...(defaultLaneTemplateProductionRelapseQueue ? {
      default_five_chapter_lane_template_redesign_queue: defaultLaneTemplateProductionRelapseQueue,
    } : {}),
    rollback_policy: rollbackPolicy ? {
      mode: text(rollbackPolicy?.mode),
      target_chapter_count: Number(rollbackPolicy?.targetChapterCount ?? rollbackPolicy?.target_chapter_count ?? 0),
      label: text(rollbackPolicy?.label),
      summary: text(rollbackPolicy?.summary),
    } : null,
  }
}

export function safeBatchExpansionStructureVerificationFromPreflight(preflight?: AnyRecord | null) {
  return preflight?.safe_batch_expansion_structure_verification
    || preflight?.safeBatchExpansionStructureVerification
    || preflight?.next_batch_brief?.expansionStructureVerification
    || preflight?.next_batch_brief?.expansion_structure_verification
    || preflight?.nextBatchBrief?.expansionStructureVerification
    || preflight?.nextBatchBrief?.expansion_structure_verification
    || null
}

export function safeBatchDefaultRecoveryRiskCountForReason(reason: string, counts: {
  riskCount: number
  coreRiskCount: number
  payoffDebtCount: number
  readerPullRiskCount: number
}) {
  const reasonText = text(reason)
  if (reasonText.includes('核心')) return counts.coreRiskCount
  if (reasonText.includes('回报')) return counts.payoffDebtCount
  if (reasonText.includes('追读') || reasonText.includes('拉力')) return counts.readerPullRiskCount
  return counts.riskCount
}

export function normalizeDefaultFiveChapterLaneTemplateVersion(template: AnyRecord | null | undefined) {
  if (!template || template.visible === false) return null
  const redesignedTemplates = arrayValue(template.redesigned_templates || template.redesignedTemplates)
    .map((item: AnyRecord) => ({
      key: text(item?.key),
      label: text(item?.label || item?.name || item?.key, '模板项'),
      template: firstText(item?.template, item?.rewrite, item?.instruction, item?.text, item?.detail),
    }))
    .filter((item: AnyRecord) => item.key || item.label || item.template)
  const validationStandard = arrayValue(template.validation_standard || template.validationStandard)
    .map(item => text(item))
    .filter(Boolean)
  const requiredReceipts = arrayValue(template.required_receipts || template.requiredReceipts || template.receipts)
    .map(item => text(item))
    .filter(Boolean)
  const productionRelapseReview = template.production_relapse_review || template.productionRelapseReview || null
  const explicitId = firstText(
    template.template_version_id,
    template.templateVersionId,
    template.version_id,
    template.versionId,
    template.id,
    productionRelapseReview?.template_version_id,
    productionRelapseReview?.templateVersionId,
  )
  const source = firstText(template.source, 'default_five_chapter_lane_template')
  const sourceRunId = template.source_run_id ?? template.sourceRunId ?? null
  const id = explicitId || (sourceRunId !== null && sourceRunId !== undefined && text(sourceRunId) ? `${source}:${sourceRunId}` : '')
  const redesignSource = firstText(template.redesign_source, template.redesignSource)
  const hasVersionEvidence = Boolean(
    id
    || redesignSource
    || redesignedTemplates.length
    || validationStandard.length
    || requiredReceipts.length,
  )
  if (!hasVersionEvidence) return null
  return {
    id: id || source,
    label: text(template.label, '默认5章档位模板'),
    source,
    redesign_source: redesignSource,
    source_run_id: sourceRunId,
    repaired_at: text(template.repaired_at || template.repairedAt),
    summary: text(template.summary),
    redesigned_templates: redesignedTemplates,
    validation_standard: validationStandard,
    required_receipts: requiredReceipts,
  }
}

export function buildDefaultFiveChapterRecoveryVerdict(args: {
  verification: AnyRecord
  validationChapterNos: number[]
  riskCount: number
  coreRiskCount: number
  payoffDebtCount: number
  readerPullRiskCount: number
}) {
  const regression = args.verification?.default_five_chapter_regression
    || args.verification?.defaultFiveChapterRegression
    || null
  if (!regression || regression.visible === false) return null
  const failureReasons = arrayValue(regression.failure_reasons || regression.failureReasons)
    .map(item => text(item))
    .filter(Boolean)
  if (!failureReasons.length) return null
  const reasonStatuses = failureReasons.map(reason => {
    const riskCount = safeBatchDefaultRecoveryRiskCountForReason(reason, args)
    return {
      reason,
      status: riskCount > 0 ? 'remaining' : 'cleared',
      risk_count: riskCount,
    }
  })
  const clearedFailureReasons = reasonStatuses
    .filter(item => item.status === 'cleared')
    .map(item => item.reason)
  const remainingFailureReasons = reasonStatuses
    .filter(item => item.status === 'remaining')
    .map(item => item.reason)
  const defaultBatchChapterNos = arrayValue(regression.default_batch_chapter_nos || regression.defaultBatchChapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const restoreChapterNos = arrayValue(regression.restore_chapter_nos || regression.restoreChapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const previousValidationChapterNos = arrayValue(regression.validation_chapter_nos || regression.validationChapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const status = remainingFailureReasons.length ? 'failed' : 'passed'
  const summary = status === 'passed'
    ? `默认档位恢复判定：${clearedFailureReasons.join('、')}已清零，${compactChapterNoEvidence(args.validationChapterNos)}可作为默认5章档位恢复证据。`
    : `默认档位恢复判定：${remainingFailureReasons.join('、')}仍未清零，${compactChapterNoEvidence(args.validationChapterNos)}不能恢复默认5章档位。`

  return {
    visible: true,
    status,
    label: '默认档位恢复判定',
    summary,
    default_batch_chapter_nos: defaultBatchChapterNos,
    restore_chapter_nos: restoreChapterNos,
    previous_validation_chapter_nos: previousValidationChapterNos,
    validation_chapter_nos: args.validationChapterNos,
    failure_reasons: failureReasons,
    cleared_failure_reasons: clearedFailureReasons,
    remaining_failure_reasons: remainingFailureReasons,
    failure_reason_statuses: reasonStatuses,
  }
}

export function buildDefaultFiveChapterLaneTemplateVerdict(args: {
  verification: AnyRecord
  validationChapterNos: number[]
  chapters: AnyRecord[]
  riskCount?: number
  coreRiskCount?: number
  payoffDebtCount?: number
  readerPullRiskCount?: number
}) {
  const template = args.verification?.default_five_chapter_lane_template
    || args.verification?.defaultFiveChapterLaneTemplate
    || null
  if (!template || template.visible === false) return null
  const templateVersion = normalizeDefaultFiveChapterLaneTemplateVersion(template)
  const templateRequirements = arrayValue(template.requirements)
  const labelForKey = (key: string, fallback: string) => text(
    templateRequirements.find((item: AnyRecord) => text(item?.key) === key)?.label,
    fallback,
  )
  const requirements = DEFAULT_FIVE_CHAPTER_LANE_TEMPLATE_REQUIREMENTS.map(requirement => ({
    key: requirement.key,
    label: labelForKey(requirement.key, requirement.label),
  }))
  const missingRequirements = requirements
    .map(requirement => {
      const missingChapterNos = args.validationChapterNos.filter(chapterNo => {
        const chapter = findChapter(args.chapters, { chapterNo })
        const receipts = chapterExpansionStructureDecisionReceipts(chapter)
        return expansionStructureDecisionRequirementDelivered({
          key: requirement.key,
          payload: {},
          receipts,
        }) !== true
      })
      return missingChapterNos.length
        ? {
          ...requirement,
          chapter_nos: missingChapterNos,
        }
        : null
    })
    .filter(Boolean)
  const missingCount = missingRequirements.reduce((sum: number, item: AnyRecord) => sum + arrayValue(item?.chapter_nos).length, 0)
  const missingSummary = missingRequirements
    .map((item: AnyRecord) => `${compactChapterNoEvidence(arrayValue(item.chapter_nos).map((chapterNo: any) => Number(chapterNo)).filter(Boolean))}缺${item.label}`)
    .join('；')
  const productionRelapseVerdict = buildDefaultFiveChapterLaneTemplateProductionRelapseVerdict({
    template,
    validationChapterNos: args.validationChapterNos,
    riskCount: Number(args.riskCount || 0),
    coreRiskCount: Number(args.coreRiskCount || 0),
    payoffDebtCount: Number(args.payoffDebtCount || 0),
    readerPullRiskCount: Number(args.readerPullRiskCount || 0),
  })
  const productionFailedCount = Number(productionRelapseVerdict?.failed_count || 0)
  const productionFailedRequirements = arrayValue(productionRelapseVerdict?.failed_requirements)
  const productionSummary = productionRelapseVerdict
    ? productionRelapseVerdict.status === 'failed'
      ? `生产后验仍复发：${arrayValue(productionRelapseVerdict.remaining_failure_reasons).join('、')}。`
      : `生产后验已修复：${arrayValue(productionRelapseVerdict.cleared_failure_reasons).join('、')}已清零。`
    : ''
  const status = missingCount > 0 || productionFailedCount > 0 ? 'failed' : 'passed'
  const passedSummary = [
    `默认档位模板回检通过：${templateVersion?.id ? `版本 ${templateVersion.id} ` : ''}${compactChapterNoEvidence(args.validationChapterNos)}已逐章继承段位职责、冲突轮换、回报密度和章末追读模板。`,
    productionSummary,
  ].filter(Boolean).join(' ')
  const failedSummaryParts = [
    missingSummary,
    productionRelapseVerdict?.status === 'failed' ? productionSummary : '',
  ].filter(Boolean)
  return {
    visible: true,
    status,
    label: '默认档位模板回检',
    summary: status === 'passed'
      ? passedSummary
      : `默认档位模板回检未通过：${templateVersion?.id ? `版本 ${templateVersion.id} ` : ''}${failedSummaryParts.join('；')}，不能恢复默认5章档位。`,
    validation_chapter_nos: args.validationChapterNos,
    ...(templateVersion ? { template_version: templateVersion } : {}),
    requirements: requirements.map(requirement => ({
      ...requirement,
      status: missingRequirements.some((item: AnyRecord) => item.key === requirement.key) ? 'missing' : 'fulfilled',
    })),
    missing_count: missingCount,
    missing_requirements: missingRequirements,
    ...(productionRelapseVerdict ? {
      production_failed_count: productionFailedCount,
      production_relapse_verdict: productionRelapseVerdict,
      production_failed_requirements: productionFailedRequirements,
    } : {}),
  }
}

export function buildDefaultFiveChapterLaneTemplateProductionRelapseVerdict(args: {
  template: AnyRecord
  validationChapterNos: number[]
  riskCount: number
  coreRiskCount: number
  payoffDebtCount: number
  readerPullRiskCount: number
}) {
  const review = normalizeDefaultFiveChapterLaneTemplateProductionRelapseReview(args.template)
  if (!review) return null
  const failureReasons = arrayValue(review.failure_reasons || review.failureReasons)
    .map(item => text(item))
    .filter(Boolean)
  const failedRequirements = arrayValue(review.failed_requirements || review.failedRequirements)
    .map((item: AnyRecord) => ({
      key: text(item?.key),
      label: text(item?.label || item?.key, '模板要求'),
      failure_reason: text(item?.failure_reason || item?.failureReason),
      failed_count: Number(item?.failed_count ?? item?.failedCount ?? 1),
      chapter_nos: arrayValue(item?.chapter_nos || item?.chapterNos).length
        ? arrayValue(item?.chapter_nos || item?.chapterNos)
          .map((chapterNo: any) => Number(chapterNo))
          .filter((chapterNo: number) => chapterNo > 0)
        : args.validationChapterNos,
    }))
    .filter((item: AnyRecord) => item.key || item.label || item.failure_reason)
  const reasonStatuses = failureReasons.map(reason => {
    const riskCount = safeBatchDefaultRecoveryRiskCountForReason(reason, args)
    return {
      reason,
      status: riskCount > 0 ? 'remaining' : 'cleared',
      risk_count: riskCount,
    }
  })
  const remainingFailureReasons = reasonStatuses
    .filter(item => item.status === 'remaining')
    .map(item => item.reason)
  const clearedFailureReasons = reasonStatuses
    .filter(item => item.status === 'cleared')
    .map(item => item.reason)
  const remainingFailedRequirements = failedRequirements
    .filter((item: AnyRecord) => {
      const reason = text(item.failure_reason)
      return !reason || remainingFailureReasons.includes(reason)
    })
  const status = remainingFailureReasons.length ? 'failed' : 'passed'
  const templateVersionId = firstText(
    review.template_version_id,
    review.templateVersionId,
    args.template?.template_version_id,
    args.template?.templateVersionId,
    args.template?.template_version?.id,
    args.template?.templateVersion?.id,
  )
  return {
    visible: true,
    status,
    label: '默认档位模板生产后验判定',
    template_version_id: templateVersionId,
    default_batch_chapter_nos: arrayValue(review.default_batch_chapter_nos || review.defaultBatchChapterNos)
      .map((chapterNo: any) => Number(chapterNo))
      .filter((chapterNo: number) => chapterNo > 0),
    restore_chapter_nos: arrayValue(review.restore_chapter_nos || review.restoreChapterNos)
      .map((chapterNo: any) => Number(chapterNo))
      .filter((chapterNo: number) => chapterNo > 0),
    previous_validation_chapter_nos: arrayValue(review.validation_chapter_nos || review.validationChapterNos)
      .map((chapterNo: any) => Number(chapterNo))
      .filter((chapterNo: number) => chapterNo > 0),
    validation_chapter_nos: args.validationChapterNos,
    failure_reasons: failureReasons,
    cleared_failure_reasons: clearedFailureReasons,
    remaining_failure_reasons: remainingFailureReasons,
    failure_reason_statuses: reasonStatuses,
    failed_count: remainingFailedRequirements.length,
    failed_requirements: remainingFailedRequirements,
    summary: status === 'passed'
      ? `默认档位模板生产后验已修复：${clearedFailureReasons.join('、') || '真实生产失败维度'}已清零，${compactChapterNoEvidence(args.validationChapterNos)}可作为版本级验证证据。`
      : `默认档位模板生产后验仍复发：${remainingFailureReasons.join('、')}未清零，${compactChapterNoEvidence(args.validationChapterNos)}不能作为当前模板版本恢复证据。`,
  }
}

export function defaultFiveChapterLaneTemplateRepairAction(requirement: AnyRecord) {
  const label = text(requirement?.label || requirement?.key, '模板缺项')
  const chapterText = compactChapterNoEvidence(
    arrayValue(requirement?.chapter_nos || requirement?.chapterNos)
      .map((chapterNo: any) => Number(chapterNo))
      .filter((chapterNo: number) => chapterNo > 0),
  )
  const key = text(requirement?.key)
  if (key === 'default_lane_segment_duty') return `段位职责修复：${chapterText}必须明确本章在默认5章档位里的前段/中段/后段职责，不能只写单章事件。`
  if (key === 'default_lane_conflict_rotation') return `冲突轮换修复：${chapterText}必须换掉重复冲突来源，写清本章使用规则压迫、人物对抗或信息误导中的哪一类。`
  if (key === 'default_lane_payoff_density') return `回报密度修复：${chapterText}必须补出显性回报，至少让读者看到一个可感知收益、反制结果或阶段结算。`
  if (key === 'default_lane_ending_hook_template') return `章末追读模板修复：${chapterText}最后300字必须落触发事件、读者问题和下一章风险。`
  return `${label}修复：${chapterText}必须补成正文可见模板回执。`
}

export function buildDefaultFiveChapterLaneTemplateRepair(verdict?: AnyRecord | null) {
  if (!verdict || verdict.visible === false) return null
  const missingRequirements = arrayValue(verdict.missing_requirements || verdict.missingRequirements)
    .map((item: AnyRecord) => {
      const chapterNos = arrayValue(item?.chapter_nos || item?.chapterNos)
        .map((chapterNo: any) => Number(chapterNo))
        .filter((chapterNo: number) => chapterNo > 0)
      return {
        key: text(item?.key),
        label: text(item?.label || item?.key, '模板缺项'),
        chapter_nos: chapterNos,
      }
    })
    .filter((item: AnyRecord) => item.key || item.label || item.chapter_nos.length)
  const productionRelapseVerdict = verdict.production_relapse_verdict
    || verdict.productionRelapseVerdict
    || null
  const productionFailedRequirements = arrayValue(verdict.production_failed_requirements || verdict.productionFailedRequirements || productionRelapseVerdict?.failed_requirements || productionRelapseVerdict?.failedRequirements)
    .map((item: AnyRecord) => {
      const chapterNos = arrayValue(item?.chapter_nos || item?.chapterNos).length
        ? arrayValue(item?.chapter_nos || item?.chapterNos)
          .map((chapterNo: any) => Number(chapterNo))
          .filter((chapterNo: number) => chapterNo > 0)
        : arrayValue(verdict.validation_chapter_nos || verdict.validationChapterNos)
          .map((chapterNo: any) => Number(chapterNo))
          .filter((chapterNo: number) => chapterNo > 0)
      return {
        key: text(item?.key),
        label: text(item?.label || item?.key, '模板缺项'),
        failure_reason: text(item?.failure_reason || item?.failureReason),
        chapter_nos: chapterNos,
      }
    })
    .filter((item: AnyRecord) => item.key || item.label || item.failure_reason || item.chapter_nos.length)
  if (!missingRequirements.length && !productionFailedRequirements.length) return null
  const missingText = missingRequirements
    .map((item: AnyRecord) => `${compactChapterNoEvidence(item.chapter_nos)}缺${item.label}`)
    .join('；')
  const productionFailedText = productionFailedRequirements
    .map((item: AnyRecord) => `${item.label}${item.failure_reason ? `/${item.failure_reason}` : ''}`)
    .join('；')
  const repairActions = missingRequirements
    .map(defaultFiveChapterLaneTemplateRepairAction)
    .concat(productionFailedRequirements.map((item: AnyRecord) => {
      const action = defaultFiveChapterLaneTemplateRepairAction(item)
      return item.failure_reason ? `${action} 生产后验失败维度：${item.failure_reason}。` : action
    }))
    .filter(Boolean)
  const repairSummary = [
    missingText,
    productionFailedText ? `生产后验仍复发：${productionFailedText}` : '',
  ].filter(Boolean).join('；')
  return {
    visible: true,
    status: 'failed',
    label: '默认档位模板验证缺项',
    summary: text(verdict.summary, `默认档位模板回检未通过：${repairSummary}，下一轮结构修复必须写入任务书。`),
    validation_chapter_nos: arrayValue(verdict.validation_chapter_nos || verdict.validationChapterNos)
      .map((chapterNo: any) => Number(chapterNo))
      .filter((chapterNo: number) => chapterNo > 0),
    requirements: arrayValue(verdict.requirements).map((item: AnyRecord) => ({
      key: text(item?.key),
      label: text(item?.label || item?.key),
      status: text(item?.status || 'fulfilled'),
    })).filter((item: AnyRecord) => item.key || item.label),
    missing_count: Number(verdict.missing_count ?? verdict.missingCount ?? missingRequirements.length),
    missing_requirements: missingRequirements,
    ...(productionRelapseVerdict ? { production_relapse_verdict: productionRelapseVerdict } : {}),
    ...(productionFailedRequirements.length ? {
      production_failed_count: productionFailedRequirements.length,
      production_failed_requirements: productionFailedRequirements,
    } : {}),
    repair_actions: repairActions,
    repair_summary: repairSummary,
  }
}

export function defaultFiveChapterLaneTemplateRedesignInstruction(requirement: AnyRecord) {
  const key = text(requirement?.key)
  if (key === 'default_lane_segment_duty') return '重写每章在5章档位中的前段/中段/后段职责，明确这一章承担抛压、转折、兑现或留钩中的哪一段。'
  if (key === 'default_lane_conflict_rotation') return '重写规则压迫、人物对抗、信息误导的轮换顺序，避免验证批连续使用同一冲突来源。'
  if (key === 'default_lane_payoff_density') return '重写每章显性回报预算，规定每章至少交付收益、反制结果或阶段结算，避免连续铺垫。'
  if (key === 'default_lane_ending_hook_template') return '重写最后300字触发事件、读者问题和下一章风险，让章末追读模板逐章可验证。'
  return '重写该模板项，并给下一轮验证批设置逐章可回填的交付标准。'
}

export function buildDefaultFiveChapterLaneTemplateRedesignQueue(profile?: AnyRecord | null) {
  if (!profile || profile.visible === false) return null
  const recommendation = text(profile.recommendation)
  const status = text(profile.status)
  if (recommendation !== 'escalate_template_redesign' && status !== 'redesign') return null

  const requirementStats = arrayValue(profile.requirements || profile.template_requirements || profile.templateRequirements)
    .map((item: AnyRecord) => ({
      key: text(item?.key),
      label: text(item?.label || item?.key, '模板项'),
      failed_count: Number(item?.failed_count ?? item?.failedCount ?? 0),
      passed_count: Number(item?.passed_count ?? item?.passedCount ?? 0),
      latest_status: text(item?.latest_status || item?.latestStatus),
    }))
    .filter((item: AnyRecord) => item.key || item.label)
  const explicitTop = profile.top_failed_requirement || profile.topFailedRequirement || null
  const topSource = explicitTop && typeof explicitTop === 'object' && !Array.isArray(explicitTop)
    ? explicitTop
    : requirementStats
      .filter((item: AnyRecord) => item.failed_count > 0)
      .sort((a: AnyRecord, b: AnyRecord) => b.failed_count - a.failed_count)[0] || null
  const topFailedRequirement = topSource ? {
    key: text(topSource.key),
    label: text(topSource.label || topSource.key, '模板缺项'),
    failed_count: Number(topSource.failed_count ?? topSource.failedCount ?? 0),
  } : null
  const topFailureText = topFailedRequirement
    ? `${topFailedRequirement.label}失败 ${topFailedRequirement.failed_count} 次`
    : '同项模板反复失败'
  const latestTemplateVersionProfile = profile.latest_template_version_profile
    || profile.latestTemplateVersionProfile
    || null
  const redesignRequirements = DEFAULT_FIVE_CHAPTER_LANE_TEMPLATE_REQUIREMENTS.map(requirement => {
    const stat = requirementStats.find((item: AnyRecord) => item.key === requirement.key)
    return {
      key: requirement.key,
      label: text(stat?.label, requirement.label),
      failed_count: Number(stat?.failed_count || 0),
      instruction: defaultFiveChapterLaneTemplateRedesignInstruction(requirement),
    }
  })

  return {
    visible: true,
    status: 'redesign',
    label: '默认档位模板重构队列',
    source: 'default_five_chapter_lane_template_stability_profile',
    recommendation: 'escalate_template_redesign',
    summary: text(profile.summary, `默认档位模板同项复发，${topFailureText}，需要升级模板重构。`),
    latest_chapter_nos: arrayValue(profile.latest_chapter_nos || profile.latestChapterNos)
      .map((chapterNo: any) => Number(chapterNo))
      .filter((chapterNo: number) => chapterNo > 0),
    validation_batch_count: Number(profile.validation_batch_count ?? profile.validationBatchCount ?? 0),
    failed_batch_count: Number(profile.failed_batch_count ?? profile.failedBatchCount ?? 0),
    ...(latestTemplateVersionProfile ? { latest_template_version_profile: latestTemplateVersionProfile } : {}),
    ...(topFailedRequirement ? { top_failed_requirement: topFailedRequirement } : {}),
    redesign_requirements: redesignRequirements,
    validation_standard: [
      '下一轮3章验证批必须逐章回填 default_lane_*_delivered。',
      '连续2批模板全过后才能恢复默认5章档位。',
    ],
  }
}

export function buildDefaultFiveChapterLaneTemplateProductionRelapseQueue(regression?: AnyRecord | null) {
  if (!regression || regression.visible === false) return null
  const templateVersion = regression.template_version || regression.templateVersion || null
  const templateVersionId = text(regression.template_version_id || regression.templateVersionId || templateVersion?.id)
  if (!templateVersionId) return null
  const failedRequirements = arrayValue(regression.template_version_failed_requirements || regression.templateVersionFailedRequirements)
    .map((item: AnyRecord) => ({
      key: text(item?.key),
      label: text(item?.label || item?.key, '模板要求'),
      failure_reason: text(item?.failure_reason || item?.failureReason),
      failed_count: Number(item?.failed_count ?? item?.failedCount ?? 1),
      instruction: defaultFiveChapterLaneTemplateRedesignInstruction({
        key: text(item?.key),
        label: text(item?.label || item?.key, '模板要求'),
      }),
    }))
    .filter((item: AnyRecord) => item.key || item.label)
  if (!failedRequirements.length) return null
  const topFailedRequirement = failedRequirements
    .slice()
    .sort((a, b) => b.failed_count - a.failed_count)[0] || null
  const productionRelapseCount = Number(templateVersion?.production_relapse_count ?? templateVersion?.productionRelapseCount ?? 1)
  const defaultBatchChapterNos = arrayValue(regression.default_batch_chapter_nos || regression.defaultBatchChapterNos)
    .map((chapterNo: any) => Number(chapterNo))
    .filter((chapterNo: number) => chapterNo > 0)
  const restoreChapterNos = arrayValue(regression.restore_chapter_nos || regression.restoreChapterNos)
    .map((chapterNo: any) => Number(chapterNo))
    .filter((chapterNo: number) => chapterNo > 0)
  const validationChapterNos = arrayValue(regression.validation_chapter_nos || regression.validationChapterNos)
    .map((chapterNo: any) => Number(chapterNo))
    .filter((chapterNo: number) => chapterNo > 0)
  const failureReasons = arrayValue(regression.failure_reasons || regression.failureReasons)
    .map((reason: any) => text(reason))
    .filter(Boolean)
  const repeated = regression.repeated_hotspot_segment || regression.repeatedHotspotSegment || null
  return {
    visible: true,
    status: productionRelapseCount >= 2 ? 'redesign' : 'relapsed',
    label: '默认档位模板生产复发队列',
    source: 'default_five_chapter_lane_production_relapse',
    recommendation: 'redesign_template_after_production_relapse',
    summary: `默认档位模板版本 ${templateVersionId} 在真实5章生产复发：${failedRequirements.map(item => `${item.label}/${item.failure_reason}`).join('、')}，需要把失败维度回写到当前版本模板。`,
    template_version_id: templateVersionId,
    template_version: templateVersion ? { ...templateVersion, id: templateVersionId } : { id: templateVersionId },
    production_relapse_count: Math.max(1, Number.isFinite(productionRelapseCount) ? productionRelapseCount : 1),
    production_relapse_review: {
      template_version_id: templateVersionId,
      default_batch_chapter_nos: defaultBatchChapterNos,
      restore_chapter_nos: restoreChapterNos,
      validation_chapter_nos: validationChapterNos,
      failure_reasons: failureReasons,
      failed_requirements: failedRequirements,
      ...(repeated ? {
        repeated_hotspot_segment: {
          key: text(repeated.key),
          label: text(repeated.label || repeated.key),
          risk_count: Number(repeated.risk_count ?? repeated.riskCount ?? repeated.count ?? 0),
        },
      } : {}),
      summary: text(regression.summary),
    },
    failed_requirements: failedRequirements,
    ...(topFailedRequirement ? {
      top_failed_requirement: {
        key: topFailedRequirement.key,
        label: topFailedRequirement.label,
        failure_reason: topFailedRequirement.failure_reason,
        failed_count: topFailedRequirement.failed_count,
      },
    } : {}),
    redesign_requirements: DEFAULT_FIVE_CHAPTER_LANE_TEMPLATE_REQUIREMENTS.map(requirement => {
      const failed = failedRequirements.find((item: AnyRecord) => item.key === requirement.key)
      return {
        key: requirement.key,
        label: requirement.label,
        failed_count: Number(failed?.failed_count || 0),
        failure_reason: text(failed?.failure_reason),
        instruction: defaultFiveChapterLaneTemplateRedesignInstruction(requirement),
      }
    }),
    validation_standard: [
      '下一轮3章验证批必须逐章回填 default_lane_*_delivered。',
      '默认档位真实生产批必须记录 template_version_id 并做版本级后验复盘。',
      '当前版本连续验证与生产后验都稳定后才能恢复默认5章档位。',
    ],
  }
}

export function buildSafeBatchExpansionStructureValidationResult(args: {
  preflight?: AnyRecord | null
  chapterRisks: AnyRecord[]
  chapters?: AnyRecord[]
}) {
  const verification = safeBatchExpansionStructureVerificationFromPreflight(args.preflight)
  if (!verification) {
    return {
      visible: false,
      status: 'ok' as const,
      label: '扩批结构验证',
      summary: '当前批次没有扩批结构验证要求。',
      source: '',
      repeated_hotspot_segment: null,
      validation_chapter_nos: [],
      failed_chapter_nos: [],
      risk_count: 0,
      core_risk_count: 0,
      payoff_debt_count: 0,
      reader_pull_risk_count: 0,
      fixed_segment_role: '',
      conflict_rotation: '',
      explicit_payoff: '',
      ending_hook_requirement: '',
      structure_actions: [],
    }
  }
  const validationChapterNos = arrayValue(verification.validation_chapter_nos || verification.validationChapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const validationNoSet = new Set(validationChapterNos)
  const chapterRisks = arrayValue(args.chapterRisks)
    .filter(chapter => validationNoSet.size === 0 || validationNoSet.has(Number(chapter?.chapterNo || chapter?.chapter_no || 0)))
  const deliveryRiskCount = chapterRisks.reduce((sum, chapter) => sum + Number(chapter?.riskCount || chapter?.risk_count || 0), 0)
  const coreRiskCount = chapterRisks.reduce((sum, chapter) => sum + Number(chapter?.coreRiskCount || chapter?.core_risk_count || 0), 0)
  const payoffDebtCount = chapterRisks.reduce((sum, chapter) => sum + Number(chapter?.payoffDebtCount || chapter?.payoff_debt_count || 0), 0)
  const readerPullRiskCount = chapterRisks.reduce((sum, chapter) => sum + Number(chapter?.readerPullRiskCount || chapter?.reader_pull_risk_count || 0), 0)
  const failedChapterNos = chapterRisks
    .filter(chapter => Number(chapter?.riskCount || chapter?.risk_count || 0) > 0)
    .map(chapter => Number(chapter?.chapterNo || chapter?.chapter_no || 0))
    .filter(chapterNo => chapterNo > 0)
  const repeated = verification.repeated_hotspot_segment || verification.repeatedHotspotSegment || null
  const repeatedSegment = repeated ? {
    key: text(repeated?.key),
    label: text(repeated?.label, text(repeated?.key, '复发段位')),
    count: Number(repeated?.count || 0),
  } : null
  const validationNos = validationChapterNos.length
    ? validationChapterNos
    : chapterRisks.map(chapter => Number(chapter?.chapterNo || chapter?.chapter_no || 0)).filter(chapterNo => chapterNo > 0)
  const defaultFiveChapterLaneTemplateVerdict = buildDefaultFiveChapterLaneTemplateVerdict({
    verification,
    validationChapterNos: validationNos,
    chapters: arrayValue(args.chapters),
    riskCount: deliveryRiskCount,
    coreRiskCount,
    payoffDebtCount,
    readerPullRiskCount,
  })
  const templateRiskCount = Number(defaultFiveChapterLaneTemplateVerdict?.missing_count || 0)
  const riskCount = deliveryRiskCount + templateRiskCount
  const allFailedChapterNos = Array.from(new Set([
    ...failedChapterNos,
    ...arrayValue(defaultFiveChapterLaneTemplateVerdict?.missing_requirements)
      .flatMap((item: AnyRecord) => arrayValue(item?.chapter_nos))
      .map((chapterNo: any) => Number(chapterNo))
      .filter((chapterNo: number) => chapterNo > 0),
  ])).sort((a, b) => a - b)
  const label = text(verification.label, '扩批结构验证')
  const summary = riskCount > 0
    ? templateRiskCount > 0 && deliveryRiskCount === 0
      ? `${label}批未通过：${text(defaultFiveChapterLaneTemplateVerdict?.summary)}`
      : `${label}批未通过：第${allFailedChapterNos.join('、') || validationNos.join('、')}章仍有 ${riskCount} 项核心/回报/追读或模板回执风险，结构修复不能恢复5章扩批。`
    : `${label}批通过：第${validationNos.join('、')}章核心守恒、显性回报和章末追读稳定，可作为恢复5章扩批证据。`
  const defaultFiveChapterRecoveryVerdict = buildDefaultFiveChapterRecoveryVerdict({
    verification,
    validationChapterNos: validationNos,
    riskCount,
    coreRiskCount,
    payoffDebtCount,
    readerPullRiskCount,
  })
  return {
    visible: true,
    status: riskCount > 0 ? 'warn' as const : 'ok' as const,
    label,
    summary,
    source: text(verification.source, 'safe_batch_expansion_structure_repair'),
    repeated_hotspot_segment: repeatedSegment,
    validation_chapter_nos: validationNos,
    failed_chapter_nos: allFailedChapterNos,
    risk_count: riskCount,
    core_risk_count: coreRiskCount,
    payoff_debt_count: payoffDebtCount,
    reader_pull_risk_count: readerPullRiskCount,
    fixed_segment_role: text(verification.fixed_segment_role || verification.fixedSegmentRole),
    conflict_rotation: text(verification.conflict_rotation || verification.conflictRotation),
    explicit_payoff: text(verification.explicit_payoff || verification.explicitPayoff),
    ending_hook_requirement: text(verification.ending_hook_requirement || verification.endingHookRequirement),
    structure_actions: arrayValue(verification.structure_actions || verification.structureActions).map(item => text(item)).filter(Boolean),
    ...(defaultFiveChapterRecoveryVerdict ? { default_five_chapter_recovery_verdict: defaultFiveChapterRecoveryVerdict } : {}),
    ...(defaultFiveChapterLaneTemplateVerdict ? { default_five_chapter_lane_template_verdict: defaultFiveChapterLaneTemplateVerdict } : {}),
  }
}

export function safeBatchExpansionStructureDecisionFromContext(args: {
  nextBatchBrief?: AnyRecord | null
  batchPreflight?: AnyRecord | null
}) {
  const brief = args.nextBatchBrief
    || args.batchPreflight?.next_batch_brief
    || args.batchPreflight?.nextBatchBrief
    || null
  const raw = brief?.expansion_structure_decision
    || brief?.expansionStructureDecision
    || args.batchPreflight?.expansion_structure_decision
    || args.batchPreflight?.expansionStructureDecision
    || null
  if (!raw || raw.visible === false) return null
  const recommendation = firstText(raw.recommendation)
  const instruction = firstText(raw.instruction)
  const summary = firstText(raw.summary)
  const observationMetrics = arrayValue(raw.observation_metrics || raw.observationMetrics)
    .map(item => text(item))
    .filter(Boolean)
  const defaultFiveChapterLaneRedesign = defaultFiveChapterLaneRedesignFromDecision(raw)
  if (!recommendation && !instruction && !summary && observationMetrics.length === 0 && !defaultFiveChapterLaneRedesign) return null
  return {
    visible: true,
    label: firstText(raw.label, '结构修复决策'),
    recommendation,
    target_chapter_count: numberValue(raw.target_chapter_count ?? raw.targetChapterCount) ?? 0,
    mode_label: firstText(raw.mode_label, raw.modeLabel),
    segment_key: firstText(raw.segment_key, raw.segmentKey),
    segment_label: firstText(raw.segment_label, raw.segmentLabel),
    summary,
    instruction,
    source_run_id: raw.source_run_id ?? raw.sourceRunId ?? null,
    observation_metrics: observationMetrics,
    ...(defaultFiveChapterLaneRedesign ? { default_five_chapter_lane_redesign: defaultFiveChapterLaneRedesign } : {}),
  }
}

export function defaultFiveChapterLaneRedesignFromDecision(decision: AnyRecord | null | undefined) {
  const raw = decision?.default_five_chapter_lane_redesign || decision?.defaultFiveChapterLaneRedesign || null
  if (!raw || typeof raw !== 'object') return null
  const repeatedFailureReasons = arrayValue(raw.repeated_failure_reasons || raw.repeatedFailureReasons)
    .map(item => text(item?.reason || item?.label || item))
    .filter(Boolean)
  const normalized = {
    reason: text(raw.reason),
    label: text(raw.label, '默认5章档位结构重构'),
    summary: text(raw.summary),
    relapse_count: Number(raw.relapse_count ?? raw.relapseCount ?? 0),
    repeated_failure_reasons: repeatedFailureReasons,
    segment_duty_rewrite: text(raw.segment_duty_rewrite || raw.segmentDutyRewrite),
    conflict_rotation: text(raw.conflict_rotation || raw.conflictRotation),
    payoff_density: text(raw.payoff_density || raw.payoffDensity),
    ending_hook_template: text(raw.ending_hook_template || raw.endingHookTemplate),
  }
  return normalized.reason
    || normalized.summary
    || normalized.relapse_count > 0
    || normalized.repeated_failure_reasons.length
    || normalized.segment_duty_rewrite
    || normalized.conflict_rotation
    || normalized.payoff_density
    || normalized.ending_hook_template
    ? normalized
    : null
}

export function expansionStructureDecisionRequiresRedesign(decision: AnyRecord) {
  return text(decision?.recommendation) === 'escalate_structure_redesign'
    || Number(decision?.target_chapter_count || 0) === 1
    || /单章重构|结构重构|重写批次设计|重构原则/.test([
      decision?.mode_label,
      decision?.summary,
      decision?.instruction,
    ].map(item => text(item)).join(' '))
}

export function expansionStructureDecisionRequirements(decision: AnyRecord) {
  const segmentLabel = text(decision?.segment_label, '段位')
  const defaultLaneRedesign = defaultFiveChapterLaneRedesignFromDecision(decision)
  const requirements = [
    {
      key: 'segment_role',
      label: `${segmentLabel}职责`,
      planned: firstText(decision?.instruction, decision?.summary, `${segmentLabel}职责必须写成可见事件。`),
    },
    {
      key: 'observation_metrics',
      label: '观察指标',
      planned: arrayValue(decision?.observation_metrics).join('；') || '通过率、失败主因和同段复发必须有正文证据。',
    },
  ]
  if (expansionStructureDecisionRequiresRedesign(decision)) {
    requirements.push({
      key: 'redesign_principles',
      label: '重构原则',
      planned: '单章重构时必须先落实批次结构设计原则，再推进正文。',
    })
  }
  if (defaultLaneRedesign) {
    requirements.push(
      {
        key: 'default_lane_segment_duty',
        label: '默认档位段位职责',
        planned: firstText(defaultLaneRedesign.segment_duty_rewrite, '默认 5 章档位必须回填前段、中段、后段的段位职责模板。'),
      },
      {
        key: 'default_lane_conflict_rotation',
        label: '冲突轮换',
        planned: firstText(defaultLaneRedesign.conflict_rotation, '默认 5 章档位必须回填冲突来源轮换模板。'),
      },
      {
        key: 'default_lane_payoff_density',
        label: '回报密度',
        planned: firstText(defaultLaneRedesign.payoff_density, '默认 5 章档位必须回填逐章显性回报密度模板。'),
      },
      {
        key: 'default_lane_ending_hook_template',
        label: '章末追读模板',
        planned: firstText(defaultLaneRedesign.ending_hook_template, '默认 5 章档位必须回填最后 300 字追读模板。'),
      },
    )
  }
  return requirements
}

export function latestExpansionStructureDecisionSyncReview(reviews: AnyRecord[], chapter: AnyRecord, chapterNo: number) {
  return [
    latestReviewForChapter(reviews, chapter, chapterNo, 'safe_batch_expansion_structure_decision_sync'),
    latestReviewForChapter(reviews, chapter, chapterNo, 'expansion_structure_decision_sync'),
  ].filter(Boolean).sort((a, b) => recordTime(b || {}) - recordTime(a || {}))[0] || null
}

export function expansionStructureDecisionSyncPayload(review: AnyRecord | null) {
  const payload = reviewPayload(review)
  return payload?.safe_batch_expansion_structure_decision_sync
    || payload?.expansion_structure_decision_sync
    || payload?.result?.safe_batch_expansion_structure_decision_sync
    || payload?.result?.expansion_structure_decision_sync
    || payload?.result
    || payload
}

export function chapterExpansionStructureDecisionReceipts(chapter: AnyRecord | null) {
  const raw = parsePayload(chapter?.raw_payload || chapter?.rawPayload, { owner: chapter, kind: 'chapter', field: chapter?.raw_payload ? 'raw_payload' : 'rawPayload' }) || chapter?.raw_payload || chapter?.rawPayload || {}
  const topLevel = [
    raw?.expansion_structure_decision_execution,
    raw?.expansionStructureDecisionExecution,
    raw?.expansion_structure_execution,
    raw?.expansionStructureExecution,
    raw?.context_package?.chapter_target?.expansion_structure_decision_execution,
    raw?.pre_draft_brief?.expansion_structure_decision_execution,
  ]
  const sceneReceipts = [
    ...arrayValue(chapter?.scene_breakdown || chapter?.sceneBreakdown),
    ...arrayValue(raw?.generated_scene_breakdown || raw?.generatedSceneBreakdown),
  ].flatMap(scene => [
    scene?.expansion_structure_decision_execution,
    scene?.expansionStructureDecisionExecution,
    scene?.expansion_structure_execution,
    scene?.expansionStructureExecution,
  ])
  return [...topLevel, ...sceneReceipts].filter(receipt => receipt && typeof receipt === 'object')
}

export function expansionStructureDecisionRequirementDelivered(args: {
  key: string
  payload: AnyRecord
  receipts: AnyRecord[]
}) {
  const keys = args.key === 'segment_role'
    ? ['segment_role_delivered', 'segmentRoleDelivered', 'segment_role_evidence', 'segmentRoleEvidence']
    : args.key === 'observation_metrics'
      ? ['observation_metrics_delivered', 'observationMetricsDelivered', 'observation_metric_evidence', 'observationMetricEvidence']
      : args.key === 'default_lane_segment_duty'
        ? ['default_lane_segment_duty_delivered', 'defaultLaneSegmentDutyDelivered', 'segment_duty_rewrite_delivered', 'segmentDutyRewriteDelivered', 'default_lane_segment_duty_evidence', 'defaultLaneSegmentDutyEvidence']
        : args.key === 'default_lane_conflict_rotation'
          ? ['default_lane_conflict_rotation_delivered', 'defaultLaneConflictRotationDelivered', 'conflict_rotation_delivered', 'conflictRotationDelivered', 'default_lane_conflict_rotation_evidence', 'defaultLaneConflictRotationEvidence']
          : args.key === 'default_lane_payoff_density'
            ? ['default_lane_payoff_density_delivered', 'defaultLanePayoffDensityDelivered', 'payoff_density_delivered', 'payoffDensityDelivered', 'default_lane_payoff_density_evidence', 'defaultLanePayoffDensityEvidence']
            : args.key === 'default_lane_ending_hook_template'
              ? ['default_lane_ending_hook_template_delivered', 'defaultLaneEndingHookTemplateDelivered', 'ending_hook_template_delivered', 'endingHookTemplateDelivered', 'default_lane_ending_hook_template_evidence', 'defaultLaneEndingHookTemplateEvidence']
              : ['redesign_principles_delivered', 'redesignPrinciplesDelivered', 'redesign_principle_evidence', 'redesignPrincipleEvidence']
  const nestedSources = [args.payload, ...args.receipts].flatMap(source => [
    source,
    source?.default_five_chapter_lane_redesign_execution,
    source?.defaultFiveChapterLaneRedesignExecution,
  ]).filter(Boolean)
  for (const source of nestedSources) {
    for (const key of keys) {
      const explicit = boolValue(source?.[key])
      if (explicit !== null) return explicit
      if (arrayValue(source?.[key]).map(item => text(item)).filter(Boolean).length > 0) return true
      if (text(source?.[key])) return true
    }
  }
  return null
}

export function buildSafeBatchExpansionStructureDecisionExecutionReview(args: {
  nextBatchBrief?: AnyRecord | null
  batchPreflight?: AnyRecord | null
  items: AutoCreationBatchReviewItem[]
  chapters: AnyRecord[]
  reviews: AnyRecord[]
}) {
  const decision = safeBatchExpansionStructureDecisionFromContext({
    nextBatchBrief: args.nextBatchBrief,
    batchPreflight: args.batchPreflight,
  })
  if (!decision) {
    return {
      visible: false,
      status: 'ok' as const,
      label: '扩批结构决策',
      summary: '当前批次没有扩批结构决策。',
      recommendation: '',
      target_chapter_count: 0,
      segment_label: '',
      observation_metrics: [],
      risk_count: 0,
      missed_chapter_nos: [],
      failed_items: [],
      chapters: [],
    }
  }
  const requirements = expansionStructureDecisionRequirements(decision)
  const defaultFiveChapterLaneRedesign = defaultFiveChapterLaneRedesignFromDecision(decision)
  const successfulItems = args.items.filter(item => item.status === 'success')
  const chapterReviews = successfulItems.map(item => {
    const chapter = findChapter(args.chapters, item)
    const syncReview = chapter ? latestExpansionStructureDecisionSyncReview(args.reviews, chapter, item.chapterNo) : null
    const payload = expansionStructureDecisionSyncPayload(syncReview)
    const receipts = chapterExpansionStructureDecisionReceipts(chapter)
    const explicitMissed = arrayValue(payload?.missed || payload?.misses || payload?.failed_items || payload?.failedItems)
      .map((missed: any) => ({
        chapter_no: item.chapterNo,
        chapter_id: item.chapterId || null,
        key: firstText(missed?.key, missed?.type, missed?.kind, 'expansion_structure_decision'),
        label: firstText(missed?.label, missed?.title, missed?.key, '扩批结构决策'),
        text: firstText(missed?.text, missed?.description, missed?.reason, missed?.issue),
      }))
      .filter((missed: AnyRecord) => missed.label || missed.text)
    const payloadStatus = text(payload?.status).toLowerCase()
    const passed = ['ok', 'pass', 'passed', 'success'].includes(payloadStatus) || payload?.passed === true
    const missing = passed
      ? []
      : explicitMissed.length > 0
        ? explicitMissed
        : requirements
          .filter(requirement => expansionStructureDecisionRequirementDelivered({
            key: requirement.key,
            payload,
            receipts,
          }) !== true)
          .map(requirement => ({
            chapter_no: item.chapterNo,
            chapter_id: item.chapterId || null,
            key: requirement.key,
            label: requirement.label,
            text: requirement.planned,
          }))
    return {
      chapter_no: item.chapterNo,
      chapter_id: item.chapterId || null,
      title: item.title,
      status: missing.length > 0 ? 'warn' as const : 'ok' as const,
      missed: missing,
      evidence: [
        ...arrayValue(payload?.evidence).map(item => text(item)).filter(Boolean),
        ...receipts.flatMap(receipt => arrayValue(receipt?.evidence).map(item => text(item)).filter(Boolean)),
      ].slice(0, 6),
    }
  })
  const failedItems = chapterReviews.flatMap(review => review.missed)
  const missedChapterNos = Array.from(new Set(failedItems.map(item => Number(item.chapter_no || 0)).filter(chapterNo => chapterNo > 0)))
  return {
    visible: true,
    status: failedItems.length > 0 ? 'warn' as const : 'ok' as const,
    label: '扩批结构决策',
    summary: failedItems.length > 0
      ? `${decision.label}未落地：第${missedChapterNos.join('、')}章有 ${failedItems.length} 项段位职责、观察指标或重构原则缺口。`
      : `${decision.label}已落地：本批章节均提供段位职责和观察指标执行证据。`,
    recommendation: decision.recommendation,
    target_chapter_count: decision.target_chapter_count,
    mode_label: decision.mode_label,
    segment_key: decision.segment_key,
    segment_label: decision.segment_label,
    source_run_id: decision.source_run_id,
    instruction: decision.instruction,
    observation_metrics: decision.observation_metrics,
    ...(defaultFiveChapterLaneRedesign ? { default_five_chapter_lane_redesign: defaultFiveChapterLaneRedesign } : {}),
    risk_count: failedItems.length,
    missed_chapter_nos: missedChapterNos,
    failed_items: failedItems,
    requirements,
    chapters: chapterReviews,
  }
}

export function safeBatchExpansionStructureDecisionEntryEvaluation(args: {
  entry: AnyRecord
  chapters: AnyRecord[]
  reviews: AnyRecord[]
}) {
  const review = buildSafeBatchExpansionStructureDecisionExecutionReview({
    nextBatchBrief: args.entry.input?.next_batch_brief || args.entry.input?.nextBatchBrief || null,
    batchPreflight: args.entry.preflight,
    items: args.entry.items,
    chapters: args.chapters,
    reviews: args.reviews,
  })
  return {
    review,
    latestBatchCreatedAt: text(args.entry.run?.created_at),
    latestChapterNos: arrayValue(args.entry.items).map(item => Number(item?.chapterNo || 0)).filter(Boolean),
  }
}

export function buildSafeBatchExpansionStructureDecisionTrend(args: {
  decisionEvaluations: AnyRecord[]
}) {
  const evaluations = arrayValue(args.decisionEvaluations)
    .filter(evaluation => evaluation?.review?.visible)
    .sort((a, b) => Date.parse(text(b?.latestBatchCreatedAt)) - Date.parse(text(a?.latestBatchCreatedAt)))
  if (!evaluations.length) return null

  const failedEvaluations = evaluations.filter(evaluation => Number(evaluation?.review?.risk_count || 0) > 0)
  const latest = evaluations[0]
  const latestReview = latest.review || {}
  const latestStatus = Number(latestReview.risk_count || 0) > 0 ? 'warn' as const : 'ok' as const
  const recommendationCounts = new Map<string, AnyRecord>()
  const requirementCounts = new Map<string, AnyRecord>()
  const segmentCounts = new Map<string, AnyRecord>()
  failedEvaluations.forEach(evaluation => {
    const review = evaluation.review || {}
    const recommendationKey = text(review.recommendation, 'unknown')
    const recommendationRecord = recommendationCounts.get(recommendationKey) || {
      key: recommendationKey,
      label: text(review.mode_label, recommendationKey === 'unknown' ? '结构决策' : recommendationKey),
      count: 0,
    }
    recommendationRecord.count += 1
    recommendationCounts.set(recommendationKey, recommendationRecord)

    const segmentKey = text(review.segment_key, 'unknown')
    const segmentRecord = segmentCounts.get(segmentKey) || {
      key: segmentKey,
      label: text(review.segment_label, segmentKey === 'unknown' ? '复发段位' : segmentKey),
      count: 0,
    }
    segmentRecord.count += 1
    segmentCounts.set(segmentKey, segmentRecord)

    arrayValue(review.failed_items).forEach(item => {
      const key = text(item?.key, 'expansion_structure_decision')
      const record = requirementCounts.get(key) || {
        key,
        label: text(item?.label, key),
        count: 0,
      }
      record.count += 1
      requirementCounts.set(key, record)
    })
  })
  const byCountDesc = (a: AnyRecord, b: AnyRecord) => Number(b.count || 0) - Number(a.count || 0)
  const topFailedRecommendation = Array.from(recommendationCounts.values()).sort(byCountDesc)[0] || null
  const topFailedRequirement = Array.from(requirementCounts.values()).sort(byCountDesc)[0] || null
  const failedRequirements = Array.from(requirementCounts.values()).sort(byCountDesc)
  const topFailedSegment = Array.from(segmentCounts.values()).sort(byCountDesc)[0] || null
  const latestDefaultFiveChapterLaneRedesign = failedEvaluations
    .map(evaluation => evaluation?.review?.default_five_chapter_lane_redesign || evaluation?.review?.defaultFiveChapterLaneRedesign)
    .find(Boolean) || null
  const defaultLaneFailedRequirements = failedRequirements
    .filter(item => text(item?.key).startsWith('default_lane_'))
  const defaultFiveChapterLaneRedesign = (latestDefaultFiveChapterLaneRedesign || defaultLaneFailedRequirements.length)
    ? {
      ...(latestDefaultFiveChapterLaneRedesign || {}),
      visible: true,
      label: text(latestDefaultFiveChapterLaneRedesign?.label, '默认档位模板漏项'),
      missed_requirements: defaultLaneFailedRequirements,
      summary: text(
        latestDefaultFiveChapterLaneRedesign?.summary,
        defaultLaneFailedRequirements.length
          ? `默认5章档位模板漏项：${defaultLaneFailedRequirements.map(item => text(item?.label)).filter(Boolean).join('、')}。`
          : '默认5章档位结构重构需要补齐模板回执。',
      ),
    }
    : null
  const suggestedTargetChapterCount = latestStatus === 'warn'
    ? Boolean(defaultLaneFailedRequirements.length) || text(topFailedRecommendation?.key) === 'escalate_structure_redesign'
      ? 1
      : 3
    : 5
  const suggestedTargetLabel = suggestedTargetChapterCount <= 1
    ? '1章单章治理'
    : `${suggestedTargetChapterCount}章小批验证`
  const summary = latestStatus === 'warn'
    ? `结构决策执行趋势未稳：${text(topFailedRecommendation?.label, '结构决策')}最近复盘仍有漏项，${text(topFailedRequirement?.label, '执行要求')}累计 ${Number(topFailedRequirement?.count || 0)} 次未落地；下一批先保持 ${suggestedTargetLabel}。`
    : failedEvaluations.length > 0
      ? `结构决策执行趋势已恢复：最近批次已落地，但历史仍需关注${text(topFailedRequirement?.label, '执行要求')}漏项。`
      : `结构决策执行趋势稳定：近 ${evaluations.length} 批均按推荐动作、段位职责和观察指标落地。`

  return {
    visible: true,
    status: latestStatus,
    label: '扩批结构决策执行趋势',
    summary,
    total_batch_count: evaluations.length,
    passed_batch_count: evaluations.length - failedEvaluations.length,
    failed_batch_count: failedEvaluations.length,
    latest_status: latestStatus,
    latest_batch_created_at: text(latest.latestBatchCreatedAt),
    latest_chapter_nos: arrayValue(latest.latestChapterNos).map(chapterNo => Number(chapterNo)).filter(chapterNo => chapterNo > 0),
    latest_segment_key: text(latestReview.segment_key),
    latest_segment_label: text(latestReview.segment_label),
    top_failed_recommendation: topFailedRecommendation,
    top_failed_requirement: topFailedRequirement,
    failed_requirements: failedRequirements,
    top_failed_segment: topFailedSegment,
    ...(defaultFiveChapterLaneRedesign ? {
      default_five_chapter_lane_redesign: defaultFiveChapterLaneRedesign,
    } : {}),
    suggested_target_chapter_count: suggestedTargetChapterCount,
  }
}

export function buildSafeBatchExpansionSegmentReview(args: {
  preflight?: AnyRecord | null
  chapterRisks: AnyRecord[]
}) {
  const policy = safeBatchExpansionPolicyFromPreflight(args.preflight)
  const chapterRisks = arrayValue(args.chapterRisks)
  if (!policy || chapterRisks.length < 5) {
    return {
      visible: false,
      status: 'ok',
      label: '扩批分段复盘',
      summary: '当前批次不是 5 章扩批批次。',
      targetChapterCount: Number(policy?.targetChapterCount || 0),
      actualChapterCount: chapterRisks.length,
      riskCount: 0,
      segments: [],
      hotspots: [],
      rollbackPolicy: safeBatchExpansionRollbackPolicy({ riskCount: 0, coreRiskCount: 0, hotspotLabel: '' }),
    }
  }

  const segmentMap = new Map<string, AnyRecord>()
  chapterRisks.forEach((chapter, index) => {
    const segmentKey = safeBatchExpansionSegmentKey(index, chapterRisks.length)
    const current = segmentMap.get(segmentKey.key) || {
      key: segmentKey.key,
      label: segmentKey.label,
      chapterNos: [] as number[],
      riskCount: 0,
      coreRiskCount: 0,
      payoffDebtCount: 0,
      readerPullRiskCount: 0,
    }
    current.chapterNos.push(Number(chapter.chapterNo || 0))
    current.coreRiskCount += Number(chapter.coreRiskCount || 0)
    current.payoffDebtCount += Number(chapter.payoffDebtCount || 0)
    current.readerPullRiskCount += Number(chapter.readerPullRiskCount || 0)
    current.riskCount += Number(chapter.riskCount || 0)
    segmentMap.set(segmentKey.key, current)
  })

  const segments = Array.from(segmentMap.values()).map(segment => ({
    ...segment,
    status: segment.riskCount > 0 ? 'warn' : 'ok',
    summary: segment.riskCount > 0
      ? `${segment.label}第${segment.chapterNos.join('、')}章存在 ${segment.riskCount} 项扩批风险：核心 ${segment.coreRiskCount}、回报 ${segment.payoffDebtCount}、拉力 ${segment.readerPullRiskCount}。`
      : `${segment.label}第${segment.chapterNos.join('、')}章核心、回报和追读拉力稳定。`,
  }))
  const hotspots = segments.filter(segment => segment.riskCount > 0).sort((a, b) => b.riskCount - a.riskCount)
  const riskCount = segments.reduce((sum, segment) => sum + Number(segment.riskCount || 0), 0)
  const coreRiskCount = segments.reduce((sum, segment) => sum + Number(segment.coreRiskCount || 0), 0)
  const topHotspot = hotspots[0] || null
  const rollbackPolicy = safeBatchExpansionRollbackPolicy({
    riskCount,
    coreRiskCount,
    hotspotLabel: topHotspot ? `${topHotspot.label}第${topHotspot.chapterNos.join('、')}章` : '',
  })

  return {
    visible: true,
    status: riskCount > 0 ? 'warn' : 'ok',
    label: '扩批分段复盘',
    summary: riskCount > 0
      ? `5章扩批${topHotspot?.label || '批次'}出现 ${riskCount} 项核心/回报/追读热区；${rollbackPolicy.summary}`
      : `5章扩批分段验收通过：前段、中段、后段核心守恒、读者回报和追读拉力稳定。`,
    targetChapterCount: policy.targetChapterCount,
    actualChapterCount: chapterRisks.length,
    riskCount,
    segments,
    hotspots,
    rollbackPolicy,
  }
}

export function safeBatchExpansionFeedbackSnapshot(feedback: AnyRecord) {
  return {
    visible: Boolean(feedback?.visible),
    status: text(feedback?.status, 'none'),
    label: text(feedback?.label, '扩批热区反馈'),
    summary: text(feedback?.summary),
    target_chapter_count: Number(feedback?.targetChapterCount || 0),
    latest_batch_created_at: text(feedback?.latestBatchCreatedAt),
    latest_chapter_nos: arrayValue(feedback?.latestChapterNos).map(chapterNo => Number(chapterNo)).filter(chapterNo => chapterNo > 0),
    risk_count: Number(feedback?.riskCount || 0),
    stable_pass_streak: Number(feedback?.stablePassStreak || 0),
    recent_expanded_batch_count: Number(feedback?.recentExpandedBatchCount || 0),
    repeated_hotspot_segment: feedback?.repeatedHotspotSegment ? {
      key: text(feedback.repeatedHotspotSegment?.key),
      label: text(feedback.repeatedHotspotSegment?.label),
      count: Number(feedback.repeatedHotspotSegment?.count || 0),
      summary: text(feedback.repeatedHotspotSegment?.summary),
      ...(text(feedback.repeatedHotspotSegment?.source) ? { source: text(feedback.repeatedHotspotSegment?.source) } : {}),
    } : null,
    ...(feedback?.recoveryRestoreStabilityEvidence ? {
      recovery_restore_stability_evidence: feedback.recoveryRestoreStabilityEvidence,
    } : {}),
    ...(feedback?.defaultFiveChapterRegression ? {
      default_five_chapter_regression: feedback.defaultFiveChapterRegression,
    } : {}),
    ...(feedback?.defaultFiveChapterRecoveryVerdictRelapse ? {
      default_five_chapter_recovery_verdict_relapse: feedback.defaultFiveChapterRecoveryVerdictRelapse,
    } : {}),
    rollback_policy: feedback?.rollbackPolicy ? {
      mode: text(feedback.rollbackPolicy?.mode),
      target_chapter_count: Number(feedback.rollbackPolicy?.targetChapterCount || 0),
      label: text(feedback.rollbackPolicy?.label),
      summary: text(feedback.rollbackPolicy?.summary),
    } : null,
    ...(feedback?.expansionStructureValidationResult ? {
      expansion_structure_validation_result: feedback.expansionStructureValidationResult,
    } : {}),
    ...(feedback?.expansionStructureValidationTrend ? {
      expansion_structure_validation_trend: feedback.expansionStructureValidationTrend,
    } : {}),
    ...(feedback?.defaultFiveChapterLaneTemplateStabilityProfile ? {
      default_five_chapter_lane_template_stability_profile: feedback.defaultFiveChapterLaneTemplateStabilityProfile,
    } : {}),
    ...(feedback?.expansionStructureRepairEffectiveness ? {
      expansion_structure_repair_effectiveness: feedback.expansionStructureRepairEffectiveness,
    } : {}),
    ...(feedback?.expansionStructureDecisionTrend ? {
      expansion_structure_decision_trend: feedback.expansionStructureDecisionTrend,
    } : {}),
  }
}

export function safeBatchExpansionItemsFromOutput(output: AnyRecord): AutoCreationBatchReviewItem[] {
  return arrayValue(output?.chapters).map(chapter => ({
    chapterId: chapter?.id ?? chapter?.chapter_id ?? null,
    chapterNo: Number(chapter?.chapter_no ?? chapter?.chapterNo ?? 0),
    title: text(chapter?.title, `第${Number(chapter?.chapter_no ?? chapter?.chapterNo ?? 0)}章`),
    status: text(chapter?.status) === 'failed' ? 'failed' as const : 'success' as const,
    score: Number.isFinite(Number(chapter?.score)) ? Number(chapter?.score) : null,
    wordCount: Number.isFinite(Number(chapter?.word_count ?? chapter?.wordCount)) ? Number(chapter?.word_count ?? chapter?.wordCount) : null,
    revised: Boolean(chapter?.revised),
    delivered: false,
    error: text(chapter?.error),
  })).filter(item => item.chapterNo > 0)
}

export function safeBatchExpansionChapterRisks(args: {
  items: AutoCreationBatchReviewItem[]
  chapters: AnyRecord[]
  reviews: AnyRecord[]
  resolvedIssueKeys?: Set<string>
}) {
  return arrayValue(args.items)
    .filter(item => item.status === 'success')
    .map(item => {
      const chapter = findChapter(args.chapters, item)
      if (!chapter) {
        return {
          chapterNo: item.chapterNo,
          title: item.title,
          coreRiskCount: 0,
          payoffDebtCount: 0,
          readerPullRiskCount: 0,
          riskCount: 0,
        }
      }
      const coreReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'chapter_core_drift')
      const payoffReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'reader_payoff_sync')
      const expectationReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'reader_expectation_sync')
      const retentionReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'reader_retention_sync')
      const coreCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'core_drift') ? 0 : coreRiskCount(coreReview)
      const payoffCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'reader_payoff_debt') ? 0 : payoffDebtCount(payoffReview)
      const readerPullCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'reader_pull_missed')
        ? 0
        : expectationRiskCount(expectationReview) + retentionRiskCount(retentionReview)
      return {
        chapterNo: item.chapterNo,
        title: item.title,
        coreRiskCount: coreCount,
        payoffDebtCount: payoffCount,
        readerPullRiskCount: readerPullCount,
        riskCount: coreCount + payoffCount + readerPullCount,
      }
    })
}

export function safeBatchExpansionSegmentResolvedForItems(
  resolvedIssueKeys: Set<string> | undefined,
  items: AutoCreationBatchReviewItem[],
  review: AnyRecord,
) {
  if (!resolvedIssueKeys || !items.length) return false
  const hotspotChapterNos = new Set(
    arrayValue(review?.hotspots)
      .flatMap(hotspot => arrayValue(hotspot?.chapterNos ?? hotspot?.chapter_nos))
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0),
  )
  const hotspotItems = hotspotChapterNos.size
    ? items.filter(item => hotspotChapterNos.has(Number(item.chapterNo || 0)))
    : []
  const candidates = hotspotItems.length ? hotspotItems : items
  return candidates.some(item => batchRiskIssueResolved(resolvedIssueKeys, item, 'safe_batch_expansion_segment_hotspot'))
    || items.some(item => batchRiskIssueResolved(resolvedIssueKeys, item, 'safe_batch_expansion_segment_hotspot'))
}

export function safeBatchExpansionEntryEvaluation(args: {
  entry: AnyRecord
  runRecords: AnyRecord[]
  chapters: AnyRecord[]
  reviews: AnyRecord[]
}) {
  const rawReview = buildSafeBatchExpansionSegmentReview({
    preflight: args.entry.preflight,
    chapterRisks: safeBatchExpansionChapterRisks({
      items: args.entry.items,
      chapters: args.chapters,
      reviews: args.reviews,
    }),
  })
  const resolvedIssueKeys = buildResolvedBatchRiskIssueKeys({
    runRecords: args.runRecords,
    batchCreatedAt: text(args.entry.run?.created_at),
    chapters: args.chapters,
    reviews: args.reviews,
  })
  let effectiveReview = buildSafeBatchExpansionSegmentReview({
    preflight: args.entry.preflight,
    chapterRisks: safeBatchExpansionChapterRisks({
      items: args.entry.items,
      chapters: args.chapters,
      reviews: args.reviews,
      resolvedIssueKeys,
    }),
  })
  const segmentResolved = safeBatchExpansionSegmentResolvedForItems(resolvedIssueKeys, args.entry.items, rawReview)
  if (segmentResolved && effectiveReview.visible) {
    effectiveReview = {
      ...effectiveReview,
      status: 'ok' as const,
      riskCount: 0,
      hotspots: [],
      summary: '5章扩批分段热区已修复并通过复检。',
    }
  }
  const rawRiskCount = Number(rawReview.riskCount || 0)
  const effectiveRiskCount = Number(effectiveReview.riskCount || 0)
  const topHotspot = arrayValue(rawReview.hotspots)[0] || null
  return {
    source: text(args.entry.input?.source),
    recoveryRestoreConfirmation: safeBatchRecoveryRestoreConfirmationFromEntry(args.entry),
    recoveryRestoreValidationSegment: safeBatchRecoveryRestoreValidationSegmentFromEntry(args.entry),
    defaultFiveChapterLane: defaultFiveChapterLaneFromEntry(args.entry),
    defaultFiveChapterRecoveryVerdict: defaultFiveChapterRecoveryVerdictFromEntry(args.entry),
    rawReview,
    effectiveReview,
    segmentResolved,
    rawRiskCount,
    effectiveRiskCount,
    topHotspot,
    latestBatchCreatedAt: text(args.entry.run?.created_at),
    latestChapterNos: arrayValue(args.entry.items).map(item => Number(item?.chapterNo || 0)).filter(Boolean),
  }
}

export function safeBatchExpansionStructureValidationEntryEvaluation(args: {
  entry: AnyRecord
  runRecords: AnyRecord[]
  chapters: AnyRecord[]
  reviews: AnyRecord[]
}) {
  const resolvedIssueKeys = buildResolvedBatchRiskIssueKeys({
    runRecords: args.runRecords,
    batchCreatedAt: text(args.entry.run?.created_at),
    chapters: args.chapters,
    reviews: args.reviews,
  })
  const result = buildSafeBatchExpansionStructureValidationResult({
    preflight: args.entry.preflight,
    chapters: args.chapters,
    chapterRisks: safeBatchExpansionChapterRisks({
      items: args.entry.items,
      chapters: args.chapters,
      reviews: args.reviews,
      resolvedIssueKeys,
    }),
  })
  return {
    result,
    latestBatchCreatedAt: text(args.entry.run?.created_at),
    latestChapterNos: arrayValue(args.entry.items).map(item => Number(item?.chapterNo || 0)).filter(Boolean),
  }
}

export function buildSafeBatchExpansionStructureValidationTrend(args: {
  validationEvaluations: AnyRecord[]
  expansionEvaluations: AnyRecord[]
}) {
  const validations = arrayValue(args.validationEvaluations)
    .filter(evaluation => evaluation?.result?.visible)
    .map(evaluation => {
      const result = evaluation.result || {}
      const repeated = result.repeated_hotspot_segment || result.repeatedHotspotSegment || null
      const segmentKey = text(repeated?.key, 'unknown')
      const segmentLabel = text(repeated?.label, segmentKey === 'unknown' ? '复发段位' : segmentKey)
      return {
        result,
        segmentKey,
        segmentLabel,
        createdAt: text(evaluation.latestBatchCreatedAt),
        chapterNos: arrayValue(evaluation.latestChapterNos || result.validation_chapter_nos || result.validationChapterNos)
          .map(chapterNo => Number(chapterNo))
          .filter(chapterNo => chapterNo > 0),
        riskCount: Number(result.risk_count || result.riskCount || 0),
        coreRiskCount: Number(result.core_risk_count || result.coreRiskCount || 0),
        payoffDebtCount: Number(result.payoff_debt_count || result.payoffDebtCount || 0),
        readerPullRiskCount: Number(result.reader_pull_risk_count || result.readerPullRiskCount || 0),
      }
    })
    .filter(record => record.segmentKey || record.segmentLabel)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
  if (!validations.length) return null

  const latestSegmentKey = validations[0].segmentKey
  const segmentRecords = validations.filter(record => record.segmentKey === latestSegmentKey)
  const validationBatchCount = segmentRecords.length
  const passedBatchCount = segmentRecords.filter(record => record.riskCount <= 0).length
  const failedBatchCount = validationBatchCount - passedBatchCount
  const passRate = Math.round((passedBatchCount / Math.max(1, validationBatchCount)) * 100)
  const coreFailureCount = segmentRecords.reduce((sum, record) => sum + record.coreRiskCount, 0)
  const payoffFailureCount = segmentRecords.reduce((sum, record) => sum + record.payoffDebtCount, 0)
  const readerPullFailureCount = segmentRecords.reduce((sum, record) => sum + record.readerPullRiskCount, 0)
  const failureReasons = [
    { key: 'core', label: '核心偏移', count: coreFailureCount },
    { key: 'payoff', label: '回报欠账', count: payoffFailureCount },
    { key: 'reader_pull', label: '追读拉力', count: readerPullFailureCount },
  ].filter(item => item.count > 0)
  const latest = segmentRecords[0]
  const latestStatus = latest.riskCount > 0 ? 'warn' as const : 'ok' as const
  const latestPassed = segmentRecords.find(record => record.riskCount <= 0) || null
  const restoreTime = latestPassed ? Date.parse(latestPassed.createdAt) : 0
  const expandedAfterRestore = latestPassed
    ? arrayValue(args.expansionEvaluations)
      .filter(evaluation => Date.parse(text(evaluation?.latestBatchCreatedAt)) > restoreTime)
      .sort((a, b) => Date.parse(text(a?.latestBatchCreatedAt)) - Date.parse(text(b?.latestBatchCreatedAt)))
    : []
  const recurrenceIndex = expandedAfterRestore.findIndex(evaluation => {
    const hotspot = evaluation?.topHotspot || null
    return Number(evaluation?.rawRiskCount || 0) > 0 && text(hotspot?.key) === latestSegmentKey
  })
  const recurrenceEvaluation = recurrenceIndex >= 0 ? expandedAfterRestore[recurrenceIndex] : null
  const recurrenceHotspot = recurrenceEvaluation?.topHotspot || null
  const recurrenceAfterRestore = recurrenceEvaluation ? {
    visible: true,
    interval_batch_count: recurrenceIndex + 1,
    interval_label: `恢复5章后第${recurrenceIndex + 1}个扩批批次复发`,
    restored_batch_created_at: latestPassed?.createdAt || '',
    recurrence_batch_created_at: text(recurrenceEvaluation.latestBatchCreatedAt),
    recurrence_chapter_nos: arrayValue(recurrenceEvaluation.latestChapterNos)
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0),
    repeated_hotspot_segment: {
      key: text(recurrenceHotspot?.key, latestSegmentKey),
      label: text(recurrenceHotspot?.label, latest.segmentLabel),
      count: Number(recurrenceHotspot?.riskCount || 0),
    },
  } : {
    visible: false,
    interval_batch_count: 0,
    interval_label: latestPassed ? '恢复5章后暂无同段复发' : '尚无通过的结构验证批',
    restored_batch_created_at: latestPassed?.createdAt || '',
    recurrence_batch_created_at: '',
    recurrence_chapter_nos: [],
    repeated_hotspot_segment: null,
  }
  const defaultRecoveryVerdictRelapseRecords = expandedAfterRestore
    .map(evaluation => {
      const relapse = evaluation?.defaultFiveChapterRecoveryVerdictRelapse
        || evaluation?.default_five_chapter_recovery_verdict_relapse
        || safeBatchDefaultFiveChapterRecoveryVerdictRelapse(evaluation)
        || null
      if (!relapse || relapse.visible === false) return null
      const hotspot = relapse.repeated_hotspot_segment || relapse.repeatedHotspotSegment || evaluation?.topHotspot || null
      const segmentKey = text(hotspot?.key)
      if (segmentKey && latestSegmentKey && segmentKey !== latestSegmentKey) return null
      const relapsedFailureReasons = arrayValue(relapse.relapsed_failure_reasons || relapse.relapsedFailureReasons)
        .map(item => text(item))
        .filter(Boolean)
      return {
        relapse,
        createdAt: text(evaluation?.latestBatchCreatedAt || relapse.relapse_batch_created_at || relapse.relapseBatchCreatedAt),
        chapterNos: arrayValue(relapse.relapse_batch_chapter_nos || relapse.relapseBatchChapterNos || evaluation?.latestChapterNos)
          .map(chapterNo => Number(chapterNo))
          .filter(chapterNo => chapterNo > 0),
        relapsedFailureReasons,
      }
    })
    .filter((item): item is AnyRecord => Boolean(item))
  const defaultRelapseReasonCounts = new Map<string, number>()
  defaultRecoveryVerdictRelapseRecords.forEach(record => {
    arrayValue(record.relapsedFailureReasons).forEach(reason => {
      const key = text(reason)
      if (!key) return
      defaultRelapseReasonCounts.set(key, (defaultRelapseReasonCounts.get(key) || 0) + 1)
    })
  })
  const defaultRecoveryVerdictRelapseTrend = defaultRecoveryVerdictRelapseRecords.length ? {
    visible: true,
    relapse_count: defaultRecoveryVerdictRelapseRecords.length,
    relapsed_failure_reasons: Array.from(defaultRelapseReasonCounts.keys()),
    repeated_failure_reasons: Array.from(defaultRelapseReasonCounts.entries())
      .map(([reason, count]) => ({ reason, count })),
    latest_relapse_batch_created_at: text(defaultRecoveryVerdictRelapseRecords[defaultRecoveryVerdictRelapseRecords.length - 1]?.createdAt),
    latest_relapse_chapter_nos: arrayValue(defaultRecoveryVerdictRelapseRecords[defaultRecoveryVerdictRelapseRecords.length - 1]?.chapterNos)
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0),
    summary: `恢复判定失效 ${defaultRecoveryVerdictRelapseRecords.length} 次：${Array.from(defaultRelapseReasonCounts.keys()).join('、') || '同维风险复发'}。`,
  } : null
  const failureSummary = failureReasons.length
    ? `，失败主因：${failureReasons.map(item => `${item.label}${item.count}`).join('、')}`
    : ''
  const recurrenceSummary = recurrenceAfterRestore.visible
    ? `，${recurrenceAfterRestore.interval_label}`
    : latestPassed
      ? '，恢复5章后暂无同段复发'
      : '，尚无通过的结构验证批'
  const defaultRelapseSummary = defaultRecoveryVerdictRelapseTrend
    ? `，${defaultRecoveryVerdictRelapseTrend.summary.replace(/。$/, '')}`
    : ''

  return {
    visible: true,
    status: latestStatus === 'warn' || recurrenceAfterRestore.visible ? 'warn' as const : 'ok' as const,
    label: '扩批结构验证趋势',
    summary: `${latest.segmentLabel}验证通过率 ${passRate}%（${passedBatchCount}/${validationBatchCount}批）${failureSummary}${recurrenceSummary}${defaultRelapseSummary}。`,
    segment_key: latestSegmentKey,
    segment_label: latest.segmentLabel,
    validation_batch_count: validationBatchCount,
    passed_batch_count: passedBatchCount,
    failed_batch_count: failedBatchCount,
    pass_rate: passRate,
    latest_status: latestStatus,
    latest_batch_created_at: latest.createdAt,
    latest_chapter_nos: latest.chapterNos,
    failure_reasons: failureReasons,
    recurrence_after_restore: recurrenceAfterRestore,
    ...(defaultRecoveryVerdictRelapseTrend ? {
      default_five_chapter_recovery_verdict_relapse_trend: defaultRecoveryVerdictRelapseTrend,
    } : {}),
  }
}

export function buildDefaultFiveChapterLaneTemplateStabilityProfile(args: {
  validationEvaluations: AnyRecord[]
  expansionEvaluations?: AnyRecord[]
}) {
  const verdictEvents = arrayValue(args.validationEvaluations)
    .map(evaluation => {
      const result = evaluation?.result || {}
      const verdict = result.default_five_chapter_lane_template_verdict
        || result.defaultFiveChapterLaneTemplateVerdict
        || null
      if (!verdict || verdict.visible === false) return null
      const status = text(verdict.status) === 'failed' ? 'failed' : 'passed'
      const missingRequirements = arrayValue(verdict.missing_requirements || verdict.missingRequirements)
        .map((item: AnyRecord) => ({
          key: text(item?.key),
          label: text(item?.label || item?.key, '模板缺项'),
          chapter_nos: arrayValue(item?.chapter_nos || item?.chapterNos)
            .map((chapterNo: any) => Number(chapterNo))
            .filter((chapterNo: number) => chapterNo > 0),
        }))
        .filter((item: AnyRecord) => item.key || item.label || item.chapter_nos.length)
      const productionRelapseVerdict = verdict.production_relapse_verdict
        || verdict.productionRelapseVerdict
        || null
      const productionFailedRequirements = arrayValue(verdict.production_failed_requirements || verdict.productionFailedRequirements || productionRelapseVerdict?.failed_requirements || productionRelapseVerdict?.failedRequirements)
        .map((item: AnyRecord) => ({
          key: text(item?.key),
          label: text(item?.label || item?.key, '模板缺项'),
          failure_reason: text(item?.failure_reason || item?.failureReason),
          chapter_nos: arrayValue(item?.chapter_nos || item?.chapterNos)
            .map((chapterNo: any) => Number(chapterNo))
            .filter((chapterNo: number) => chapterNo > 0),
        }))
        .filter((item: AnyRecord) => item.key || item.label || item.failure_reason || item.chapter_nos.length)
      const requirements = arrayValue(verdict.requirements)
        .map((item: AnyRecord) => ({
          key: text(item?.key),
          label: text(item?.label || item?.key, '模板要求'),
          status: text(item?.status, 'fulfilled'),
        }))
        .filter((item: AnyRecord) => item.key || item.label)
      const templateVersion = normalizeDefaultFiveChapterLaneTemplateVersion(
        verdict.template_version
        || verdict.templateVersion
        || verdict.default_five_chapter_lane_template
        || verdict.defaultFiveChapterLaneTemplate,
      )
      return {
        status,
        createdAt: text(evaluation.latestBatchCreatedAt),
        chapterNos: arrayValue(evaluation.latestChapterNos || verdict.validation_chapter_nos || verdict.validationChapterNos)
          .map((chapterNo: any) => Number(chapterNo))
          .filter((chapterNo: number) => chapterNo > 0),
        summary: text(verdict.summary),
        missingCount: Number(verdict.missing_count ?? verdict.missingCount ?? missingRequirements.reduce((sum: number, item: AnyRecord) => sum + item.chapter_nos.length, 0)),
        missingRequirements,
        productionRelapseVerdict,
        productionFailedRequirements,
        requirements,
        templateVersion,
      }
    })
    .filter(Boolean)

  if (!verdictEvents.length) return null

  const latest = verdictEvents[0]
  const productionRelapses = arrayValue(args.expansionEvaluations)
    .map(evaluation => safeBatchDefaultFiveChapterRegression(evaluation))
    .filter((regression: AnyRecord | null) => regression && regression.visible !== false && text(regression.template_version_id || regression.templateVersionId)) as AnyRecord[]
  const latestProductionRelapse = productionRelapses
    .slice()
    .sort((a, b) => Date.parse(text(b.default_batch_created_at || b.defaultBatchCreatedAt)) - Date.parse(text(a.default_batch_created_at || a.defaultBatchCreatedAt)))[0] || null
  let passStreak = 0
  for (const event of verdictEvents) {
    if (event.status !== 'passed') break
    passStreak += 1
  }
  const validationBatchCount = verdictEvents.length
  const passedBatchCount = verdictEvents.filter(event => event.status === 'passed').length
  const failedBatchCount = validationBatchCount - passedBatchCount
  const requiredPassStreak = 2
  const allRequirementLabels = new Map(
    DEFAULT_FIVE_CHAPTER_LANE_TEMPLATE_REQUIREMENTS.map(requirement => [requirement.key, requirement.label]),
  )
  verdictEvents.forEach(event => {
    arrayValue(event.requirements).forEach((requirement: AnyRecord) => {
      const key = text(requirement?.key)
      if (key) allRequirementLabels.set(key, text(requirement?.label, key))
    })
    arrayValue(event.missingRequirements).forEach((requirement: AnyRecord) => {
      const key = text(requirement?.key)
      if (key) allRequirementLabels.set(key, text(requirement?.label, key))
    })
    arrayValue(event.productionFailedRequirements).forEach((requirement: AnyRecord) => {
      const key = text(requirement?.key)
      if (key) allRequirementLabels.set(key, text(requirement?.label, key))
    })
  })
  const requirementStats = Array.from(allRequirementLabels.entries()).map(([key, label]) => {
    const failedEvents = verdictEvents.filter(event => (
      arrayValue(event.missingRequirements).some((item: AnyRecord) => text(item?.key) === key)
      || arrayValue(event.productionFailedRequirements).some((item: AnyRecord) => text(item?.key) === key)
    ))
    const latestRequirement = arrayValue(latest.requirements).find((item: AnyRecord) => text(item?.key) === key)
    return {
      key,
      label,
      passed_count: validationBatchCount - failedEvents.length,
      failed_count: failedEvents.length,
      latest_status: text(latestRequirement?.status, failedEvents.some(event => event === latest) ? 'missing' : 'fulfilled'),
      latest_missing_chapter_nos: arrayValue(latest.missingRequirements)
        .filter((item: AnyRecord) => text(item?.key) === key)
        .flatMap((item: AnyRecord) => arrayValue(item.chapter_nos))
        .map((chapterNo: any) => Number(chapterNo))
        .filter((chapterNo: number) => chapterNo > 0),
      latest_failure_reason: text(arrayValue(latest.productionFailedRequirements).find((item: AnyRecord) => text(item?.key) === key)?.failure_reason),
    }
  })
  const failedRequirementCount = requirementStats.reduce((sum, item) => sum + item.failed_count, 0)
  const topFailedRequirement = requirementStats
    .filter(item => item.failed_count > 0)
    .sort((a, b) => b.failed_count - a.failed_count)[0] || null
  const templateVersionProfiles = Array.from(new Set([
    ...verdictEvents
      .map(event => text(event.templateVersion?.id))
      .filter(Boolean),
    ...productionRelapses
      .map(regression => text(regression.template_version_id || regression.templateVersionId))
      .filter(Boolean),
  ])).map(versionId => {
    const versionEvents = verdictEvents.filter(event => text(event.templateVersion?.id) === versionId)
    const latestVersionEvent = versionEvents[0]
    const versionProductionRelapses = productionRelapses
      .filter(regression => text(regression.template_version_id || regression.templateVersionId) === versionId)
      .sort((a, b) => Date.parse(text(b.default_batch_created_at || b.defaultBatchCreatedAt)) - Date.parse(text(a.default_batch_created_at || a.defaultBatchCreatedAt)))
    const latestVersionProductionRelapse = versionProductionRelapses[0] || null
    let versionPassStreak = 0
    for (const event of versionEvents) {
      if (event.status !== 'passed') break
      versionPassStreak += 1
    }
    const versionPassedBatchCount = versionEvents.filter(event => event.status === 'passed').length
    const versionFailedBatchCount = versionEvents.length - versionPassedBatchCount
    const versionFailedRequirementStats = DEFAULT_FIVE_CHAPTER_LANE_TEMPLATE_REQUIREMENTS.map(requirement => {
      const failedEvents = versionEvents.filter(event => (
        arrayValue(event.missingRequirements).some((item: AnyRecord) => text(item?.key) === requirement.key)
        || arrayValue(event.productionFailedRequirements).some((item: AnyRecord) => text(item?.key) === requirement.key)
      ))
      const latestProductionFailure = arrayValue(latestVersionEvent?.productionFailedRequirements)
        .find((item: AnyRecord) => text(item?.key) === requirement.key)
      return {
        key: requirement.key,
        label: requirement.label,
        failed_count: failedEvents.length,
        failure_reason: text(latestProductionFailure?.failure_reason),
      }
    })
    const versionTopFailedRequirement = versionFailedRequirementStats
      .filter(item => item.failed_count > 0)
      .sort((a, b) => b.failed_count - a.failed_count)[0] || null
    const productionFailedRequirements = arrayValue(latestVersionProductionRelapse?.template_version_failed_requirements || latestVersionProductionRelapse?.templateVersionFailedRequirements)
      .map((item: AnyRecord) => ({
        key: text(item?.key),
        label: text(item?.label || item?.key, '模板要求'),
        failure_reason: text(item?.failure_reason || item?.failureReason),
      }))
      .filter((item: AnyRecord) => item.key || item.label || item.failure_reason)
    const latestVersionStatus = latestVersionEvent?.status || ''
    const versionProductionValidationFailures = versionEvents
      .filter(event => text(event.productionRelapseVerdict?.status) === 'failed')
    const productionRelapseIsLatest = latestVersionProductionRelapse
      && (!latestVersionEvent || Date.parse(text(latestVersionProductionRelapse.default_batch_created_at || latestVersionProductionRelapse.defaultBatchCreatedAt)) > Date.parse(text(latestVersionEvent.createdAt)))
    const versionStatus = productionRelapseIsLatest
      ? versionProductionRelapses.length >= 2 ? 'redesign' : 'relapsed'
      : latestVersionStatus === 'passed'
        ? versionPassStreak >= requiredPassStreak ? 'ready' : 'observing'
        : versionFailedBatchCount >= 2 ? 'redesign' : 'relapsed'
    return {
      ...(latestVersionEvent?.templateVersion || latestVersionProductionRelapse?.template_version || latestVersionProductionRelapse?.templateVersion || {}),
      id: versionId,
      status: versionStatus,
      latest_status: productionRelapseIsLatest ? 'production_relapsed' : latestVersionStatus,
      latest_batch_created_at: productionRelapseIsLatest
        ? text(latestVersionProductionRelapse?.default_batch_created_at || latestVersionProductionRelapse?.defaultBatchCreatedAt)
        : text(latestVersionEvent?.createdAt),
      latest_chapter_nos: arrayValue(productionRelapseIsLatest
        ? latestVersionProductionRelapse?.default_batch_chapter_nos || latestVersionProductionRelapse?.defaultBatchChapterNos
        : latestVersionEvent?.chapterNos)
        .map((chapterNo: any) => Number(chapterNo))
        .filter((chapterNo: number) => chapterNo > 0),
      validation_batch_count: versionEvents.length,
      passed_batch_count: versionPassedBatchCount,
      failed_batch_count: versionFailedBatchCount,
      pass_streak: versionPassStreak,
      required_pass_streak: requiredPassStreak,
      production_relapse_count: versionProductionRelapses.length,
      production_validation_failed_count: versionProductionValidationFailures.length,
      ...(latestVersionEvent?.productionRelapseVerdict ? {
        latest_production_relapse_verdict: latestVersionEvent.productionRelapseVerdict,
      } : {}),
      ...(latestVersionProductionRelapse ? {
        latest_production_relapse: {
          default_batch_created_at: text(latestVersionProductionRelapse.default_batch_created_at || latestVersionProductionRelapse.defaultBatchCreatedAt),
          default_batch_chapter_nos: arrayValue(latestVersionProductionRelapse.default_batch_chapter_nos || latestVersionProductionRelapse.defaultBatchChapterNos)
            .map((chapterNo: any) => Number(chapterNo))
            .filter((chapterNo: number) => chapterNo > 0),
          failure_reasons: arrayValue(latestVersionProductionRelapse.failure_reasons || latestVersionProductionRelapse.failureReasons)
            .map((reason: any) => text(reason))
            .filter(Boolean),
          failed_requirements: productionFailedRequirements,
          summary: text(latestVersionProductionRelapse.summary),
        },
      } : {}),
      ...(versionTopFailedRequirement ? { top_failed_requirement: versionTopFailedRequirement } : {}),
      ...(arrayValue(latestVersionEvent?.productionFailedRequirements).length ? {
        production_validation_failed_requirements: latestVersionEvent.productionFailedRequirements,
      } : {}),
      ...(productionFailedRequirements.length ? { production_failed_requirements: productionFailedRequirements } : {}),
    }
  })
  const latestTemplateVersionProfile = latestProductionRelapse
    ? templateVersionProfiles.find(item => text(item.id) === text(latestProductionRelapse.template_version_id || latestProductionRelapse.templateVersionId)) || null
    : latest.templateVersion
      ? templateVersionProfiles.find(item => text(item.id) === text(latest.templateVersion?.id)) || null
      : null
  const productionRelapseIsLatest = latestProductionRelapse
    && Date.parse(text(latestProductionRelapse.default_batch_created_at || latestProductionRelapse.defaultBatchCreatedAt)) > Date.parse(text(latest.createdAt))
  const latestStatus = productionRelapseIsLatest ? 'production_relapsed' : latest.status
  const repeatedLatestFailure = latestStatus === 'failed'
    && arrayValue(latest.missingRequirements).some((item: AnyRecord) => {
      const key = text(item?.key)
      return key && (requirementStats.find(requirement => requirement.key === key)?.failed_count || 0) >= 2
    })
  const status = productionRelapseIsLatest
    ? 'relapsed'
    : latestStatus === 'passed'
    ? passStreak >= requiredPassStreak ? 'ready' : 'observing'
    : repeatedLatestFailure ? 'redesign' : 'relapsed'
  const recommendation = status === 'ready'
    ? 'restore_default_lane'
    : status === 'observing'
      ? 'continue_validation'
      : status === 'redesign'
        ? 'escalate_template_redesign'
        : 'repair_template'
  const latestChapterText = compactChapterNoEvidence(latest.chapterNos)
  const topFailureText = topFailedRequirement ? `${topFailedRequirement.label}失败 ${topFailedRequirement.failed_count} 次` : ''
  const latestVersionText = latestTemplateVersionProfile?.id
    ? `版本 ${latestTemplateVersionProfile.id} 连过 ${latestTemplateVersionProfile.pass_streak}/${latestTemplateVersionProfile.required_pass_streak} 批；`
    : ''
  const summary = productionRelapseIsLatest
    ? `默认档位模板版本 ${text(latestTemplateVersionProfile?.id, '当前版本')} 在真实5章生产复发，${arrayValue(latestProductionRelapse?.failure_reasons || latestProductionRelapse?.failureReasons).map(item => text(item)).filter(Boolean).join('、') || '核心/回报/追读'}需要回写版本画像和模板重构队列。`
    : status === 'ready'
    ? `默认档位模板连续 ${passStreak} 批通过，${latestChapterText}四项模板稳定，可作为恢复默认5章档位证据。`
    : status === 'observing'
      ? `默认档位模板最近通过，${latestVersionText}但历史仍有${topFailureText || '模板缺项'}；继续3章观察 ${passStreak}/${requiredPassStreak} 批，确认四项模板不复发后再恢复默认5章。`
      : status === 'redesign'
        ? `默认档位模板同项复发，${topFailureText || '模板缺项'}需要升级模板重构，暂缓恢复默认5章档位。`
        : `默认档位模板最近复发，${text(latest.summary, topFailureText || '模板缺项未清')}；先修复模板缺项并回到3章验证批。`

  return {
    visible: true,
    status,
    label: '默认档位模板稳定性',
    summary,
    latest_status: latestStatus,
    latest_batch_created_at: productionRelapseIsLatest
      ? text(latestProductionRelapse?.default_batch_created_at || latestProductionRelapse?.defaultBatchCreatedAt)
      : latest.createdAt,
    latest_chapter_nos: productionRelapseIsLatest
      ? arrayValue(latestProductionRelapse?.default_batch_chapter_nos || latestProductionRelapse?.defaultBatchChapterNos)
        .map((chapterNo: any) => Number(chapterNo))
        .filter((chapterNo: number) => chapterNo > 0)
      : latest.chapterNos,
    validation_batch_count: validationBatchCount,
    passed_batch_count: passedBatchCount,
    failed_batch_count: failedBatchCount,
    pass_streak: passStreak,
    required_pass_streak: requiredPassStreak,
    failed_requirement_count: failedRequirementCount,
    recommendation,
    requirements: requirementStats,
    ...(topFailedRequirement ? { top_failed_requirement: topFailedRequirement } : {}),
    ...(templateVersionProfiles.length ? { template_version_profiles: templateVersionProfiles } : {}),
    ...(latestTemplateVersionProfile ? { latest_template_version_profile: latestTemplateVersionProfile } : {}),
  }
}

export function safeBatchExpansionStructureTrendFailureCount(trend?: AnyRecord | null) {
  return arrayValue(trend?.failure_reasons || trend?.failureReasons)
    .reduce((sum, item) => sum + Number(item?.count || 0), 0)
}

export function safeBatchDefaultRecoveryVerdictRelapseTrend(trend?: AnyRecord | null) {
  const relapseTrend = trend?.default_five_chapter_recovery_verdict_relapse_trend
    || trend?.defaultFiveChapterRecoveryVerdictRelapseTrend
    || null
  if (!relapseTrend || relapseTrend.visible === false) return null
  return relapseTrend
}

export function safeBatchDefaultRecoveryVerdictRelapseTrendCount(trend?: AnyRecord | null) {
  const relapseTrend = safeBatchDefaultRecoveryVerdictRelapseTrend(trend)
  return relapseTrend ? Number(relapseTrend.relapse_count ?? relapseTrend.relapseCount ?? 0) : 0
}

export function safeBatchDefaultRecoveryVerdictRelapseReasonCounts(trend?: AnyRecord | null) {
  const relapseTrend = safeBatchDefaultRecoveryVerdictRelapseTrend(trend)
  const counts = new Map<string, number>()
  if (!relapseTrend) return counts
  arrayValue(relapseTrend.repeated_failure_reasons || relapseTrend.repeatedFailureReasons).forEach(item => {
    const reason = text(item?.reason || item?.label || item)
    if (!reason) return
    const count = Number(item?.count ?? 1)
    counts.set(reason, (counts.get(reason) || 0) + Math.max(1, Number.isFinite(count) ? count : 1))
  })
  arrayValue(relapseTrend.relapsed_failure_reasons || relapseTrend.relapsedFailureReasons).forEach(item => {
    const reason = text(item)
    if (!reason || counts.has(reason)) return
    counts.set(reason, 1)
  })
  return counts
}

export function safeBatchExpansionStructureTrendRecurrenceInterval(trend?: AnyRecord | null) {
  const recurrence = trend?.recurrence_after_restore || trend?.recurrenceAfterRestore || null
  return recurrence?.visible ? Number(recurrence?.interval_batch_count ?? recurrence?.intervalBatchCount ?? 0) : 0
}

export function latestResolvedSafeBatchExpansionStructureRepairWithTrend(runRecords: AnyRecord[]) {
  const repairEntries = arrayValue(runRecords)
    .filter(run => text(run?.run_type) === 'longform_production_repair')
    .map(run => ({
      run,
      input: parsePayload(run?.input_ref, { owner: run, kind: 'run', field: 'input_ref' }) || {},
      output: parsePayload(run?.output_ref, { owner: run, kind: 'run', field: 'output_ref' }) || {},
    }))
    .filter(entry => text(entry.input?.source) === 'auto_creation_safe_batch_risk')
    .filter(entry => isCompletedRepairRun(entry.run))
    .sort((a, b) => recordTime(b.run) - recordTime(a.run))

  for (const entry of repairEntries) {
    const tasks = [
      ...arrayValue(entry.output?.tasks),
      ...arrayValue(entry.output?.repairTasks),
    ]
    for (const task of tasks) {
      if (text(task?.issue_type ?? task?.issueType) !== 'safe_batch_expansion_structure_repair') continue
      if (!isResolvedTaskStatus(task?.task_status ?? task?.status)) continue
      const review = task?.safe_batch_expansion_structure_review
        || task?.safeBatchExpansionStructureReview
        || task?.structure_review
        || task?.structureReview
        || {}
      const trend = review?.expansion_structure_validation_trend
        || review?.expansionStructureValidationTrend
        || task?.expansion_structure_validation_trend
        || task?.expansionStructureValidationTrend
        || null
      if (!trend || trend.visible === false) continue
      const repeated = review?.repeated_hotspot_segment
        || review?.repeatedHotspotSegment
        || trend?.repeated_hotspot_segment
        || trend?.repeatedHotspotSegment
        || null
      const segmentKey = text(trend?.segment_key || trend?.segmentKey || repeated?.key, 'unknown')
      const segmentLabel = text(trend?.segment_label || trend?.segmentLabel || repeated?.label, segmentKey === 'unknown' ? '复发段位' : segmentKey)
      return {
        sourceRunId: entry.run?.id ?? null,
        repairedAt: text(entry.run?.completed_at || entry.run?.finished_at || entry.run?.updated_at || entry.run?.created_at),
        segmentKey,
        segmentLabel,
        trend,
      }
    }
  }
  return null
}

export function buildSafeBatchExpansionStructureRepairEffectiveness(args: {
  runRecords: AnyRecord[]
  validationEvaluations: AnyRecord[]
  expansionEvaluations: AnyRecord[]
}) {
  const repair = latestResolvedSafeBatchExpansionStructureRepairWithTrend(args.runRecords)
  if (!repair) return null
  const repairedAtMs = Date.parse(repair.repairedAt)
  if (!Number.isFinite(repairedAtMs)) return null
  const segmentKey = repair.segmentKey
  const postValidationEvaluations = arrayValue(args.validationEvaluations)
    .filter(evaluation => Date.parse(text(evaluation?.latestBatchCreatedAt)) > repairedAtMs)
    .filter(evaluation => {
      const repeated = evaluation?.result?.repeated_hotspot_segment || evaluation?.result?.repeatedHotspotSegment || null
      return text(repeated?.key, 'unknown') === segmentKey
    })
  if (!postValidationEvaluations.length) return null
  const postExpansionEvaluations = arrayValue(args.expansionEvaluations)
    .filter(evaluation => Date.parse(text(evaluation?.latestBatchCreatedAt)) > repairedAtMs)
  const currentTrend = buildSafeBatchExpansionStructureValidationTrend({
    validationEvaluations: postValidationEvaluations,
    expansionEvaluations: postExpansionEvaluations,
  })
  if (!currentTrend) return null

  const baselinePassRate = Number(repair.trend?.pass_rate ?? repair.trend?.passRate ?? 0)
  const currentPassRate = Number(currentTrend.pass_rate || 0)
  const baselineFailureReasonCount = safeBatchExpansionStructureTrendFailureCount(repair.trend)
  const currentFailureReasonCount = safeBatchExpansionStructureTrendFailureCount(currentTrend)
  const baselineRecurrenceInterval = safeBatchExpansionStructureTrendRecurrenceInterval(repair.trend)
  const currentRecurrenceInterval = safeBatchExpansionStructureTrendRecurrenceInterval(currentTrend)
  const baselineRelapseCount = safeBatchDefaultRecoveryVerdictRelapseTrendCount(repair.trend)
  const currentRelapseCount = safeBatchDefaultRecoveryVerdictRelapseTrendCount(currentTrend)
  const baselineRelapseReasonCounts = safeBatchDefaultRecoveryVerdictRelapseReasonCounts(repair.trend)
  const currentRelapseReasonCounts = safeBatchDefaultRecoveryVerdictRelapseReasonCounts(currentTrend)
  const repeatedRelapseReasons = Array.from(new Set([
    ...baselineRelapseReasonCounts.keys(),
    ...currentRelapseReasonCounts.keys(),
  ]))
    .filter(reason => (baselineRelapseReasonCounts.get(reason) || 0) > 0 && (currentRelapseReasonCounts.get(reason) || 0) > 0)
    .map(reason => ({
      reason,
      count: (baselineRelapseReasonCounts.get(reason) || 0) + (currentRelapseReasonCounts.get(reason) || 0),
    }))
  const repeatedRelapseCount = repeatedRelapseReasons.length > 0 ? baselineRelapseCount + currentRelapseCount : 0
  const defaultRecoveryVerdictRelapseRepeated = repeatedRelapseCount >= 2 && repeatedRelapseReasons.length > 0
  const currentRecurrence = currentTrend.recurrence_after_restore || null
  const passRateDelta = currentPassRate - baselinePassRate
  const failureReasonDelta = currentFailureReasonCount - baselineFailureReasonCount
  const recurrenceImproved = baselineRecurrenceInterval > 0
    ? !currentRecurrence?.visible || currentRecurrenceInterval > baselineRecurrenceInterval
    : !currentRecurrence?.visible
  const improved = passRateDelta > 0 || failureReasonDelta < 0 || recurrenceImproved
  const regressed = passRateDelta < 0 || failureReasonDelta > 0 || (currentRecurrence?.visible && currentRecurrenceInterval > 0 && currentRecurrenceInterval <= baselineRecurrenceInterval)
  const status = defaultRecoveryVerdictRelapseRepeated ? 'warn' as const : improved && !regressed ? 'ok' as const : 'warn' as const
  const recommendation = defaultRecoveryVerdictRelapseRepeated
    ? 'escalate_structure_redesign'
    : status === 'ok' && currentPassRate >= 100 && currentFailureReasonCount <= 0 && !currentRecurrence?.visible
    ? 'restore_five_chapter'
    : status === 'ok'
      ? 'continue_small_validation'
      : 'escalate_structure_redesign'
  const recurrenceSummary = currentRecurrence?.visible
    ? `修复后${currentRecurrence.interval_label || `第${currentRecurrenceInterval}个扩批批次复发`}`
    : '修复后暂无同段复发'
  const defaultRecoveryVerdictRelapseTrend = baselineRelapseCount > 0 || currentRelapseCount > 0 ? {
    visible: true,
    baseline_relapse_count: baselineRelapseCount,
    current_relapse_count: currentRelapseCount,
    repeated_relapse_count: repeatedRelapseCount,
    repeated_failure_reasons: repeatedRelapseReasons,
    recommendation: defaultRecoveryVerdictRelapseRepeated ? 'escalate_structure_redesign' : 'continue_validation',
    summary: defaultRecoveryVerdictRelapseRepeated
      ? `连续 ${repeatedRelapseCount} 次恢复判定失效：${repeatedRelapseReasons.map(item => item.reason).join('、')}同维复发，默认档位结构重构。`
      : `恢复判定失效观察：修复前 ${baselineRelapseCount} 次，修复后 ${currentRelapseCount} 次。`,
  } : null
  const defaultRelapseSummary = defaultRecoveryVerdictRelapseRepeated
    ? `，${text(defaultRecoveryVerdictRelapseTrend?.summary, `连续 ${repeatedRelapseCount} 次恢复判定失效，默认档位结构重构。`).replace(/。$/, '')}`
    : ''

  return {
    visible: true,
    status,
    label: '结构修复有效性',
    summary: `${repair.segmentLabel}结构修复有效性：通过率 ${baselinePassRate}% -> ${currentPassRate}%，失败主因 ${baselineFailureReasonCount} -> ${currentFailureReasonCount}，${recurrenceSummary}${defaultRelapseSummary}。`,
    source_run_id: repair.sourceRunId,
    repaired_at: repair.repairedAt,
    segment_key: segmentKey,
    segment_label: repair.segmentLabel,
    baseline_pass_rate: baselinePassRate,
    current_pass_rate: currentPassRate,
    pass_rate_delta: passRateDelta,
    baseline_failure_reason_count: baselineFailureReasonCount,
    current_failure_reason_count: currentFailureReasonCount,
    failure_reason_delta: failureReasonDelta,
    baseline_recurrence_interval_batch_count: baselineRecurrenceInterval,
    current_recurrence_interval_batch_count: currentRecurrenceInterval,
    recommendation,
    baseline_trend: repair.trend,
    current_trend: currentTrend,
    ...(defaultRecoveryVerdictRelapseTrend ? {
      default_five_chapter_recovery_verdict_relapse_trend: defaultRecoveryVerdictRelapseTrend,
    } : {}),
  }
}

export function isSafeBatchGenerationSource(source: string) {
  return source === 'auto_creation_safe_batch'
    || source === 'safe_batch_recovery_validation_batch'
    || source === 'safe_batch_recovery_restore_five_batch'
}

export function safeBatchRecoveryRestoreConfirmationFromEntry(entry: AnyRecord) {
  return entry?.input?.recovery_restore_confirmation
    || entry?.input?.recoveryRestoreConfirmation
    || entry?.preflight?.safe_batch_recovery_restore_confirmation
    || entry?.preflight?.safeBatchRecoveryRestoreConfirmation
    || null
}

export function safeBatchRecoveryRestoreValidationSegmentFromEntry(entry: AnyRecord) {
  const policy = entry?.preflight?.safe_batch_expansion_policy || entry?.preflight?.safeBatchExpansionPolicy || null
  const feedback = policy?.expansion_feedback || policy?.expansionFeedback || null
  const validation = feedback?.expansion_structure_validation_result
    || feedback?.expansionStructureValidationResult
    || null
  const segment = validation?.repeated_hotspot_segment
    || validation?.repeatedHotspotSegment
    || feedback?.repeated_hotspot_segment
    || feedback?.repeatedHotspotSegment
    || null
  if (!segment) return null
  const key = text(segment?.key)
  const label = text(segment?.label, key || '复发段位')
  return {
    key,
    label,
    count: Math.max(0, Number(segment?.count || 0)),
  }
}

export function defaultFiveChapterRecoveryVerdictFromSource(source?: AnyRecord | null) {
  if (!source) return null
  const verdict = source.default_five_chapter_recovery_verdict
    || source.defaultFiveChapterRecoveryVerdict
    || null
  if (!verdict || verdict.visible === false) return null
  return verdict
}

export function defaultFiveChapterRecoveryVerdictFromEntry(entry: AnyRecord) {
  const input = entry?.input || {}
  const preflight = entry?.preflight || {}
  const policy = preflight.safe_batch_expansion_policy || preflight.safeBatchExpansionPolicy || null
  const feedback = policy?.expansion_feedback || policy?.expansionFeedback || null
  const sources = [
    input,
    input.recovery_restore_confirmation || input.recoveryRestoreConfirmation,
    input.recovery_restore_stability_evidence || input.recoveryRestoreStabilityEvidence,
    input.default_five_chapter_lane || input.defaultFiveChapterLane,
    preflight.safe_batch_recovery_restore_confirmation || preflight.safeBatchRecoveryRestoreConfirmation,
    preflight.safe_batch_recovery_restore_stability_lane || preflight.safeBatchRecoveryRestoreStabilityLane,
    feedback?.recovery_restore_stability_evidence || feedback?.recoveryRestoreStabilityEvidence,
    feedback?.expansion_structure_validation_result || feedback?.expansionStructureValidationResult,
  ]
  for (const source of sources) {
    const verdict = defaultFiveChapterRecoveryVerdictFromSource(source)
    if (verdict) return verdict
  }
  return null
}

export function defaultFiveChapterLaneFromEntry(entry: AnyRecord) {
  return entry?.input?.default_five_chapter_lane
    || entry?.input?.defaultFiveChapterLane
    || entry?.preflight?.safe_batch_recovery_restore_stability_lane
    || entry?.preflight?.safeBatchRecoveryRestoreStabilityLane
    || null
}

export function safeBatchRecoveryRestoreStabilityEvidence(evaluation: AnyRecord | null | undefined, stablePassStreak: number) {
  if (!evaluation || text(evaluation.source) !== 'safe_batch_recovery_restore_five_batch') return null
  const validationChapterNos = arrayValue(evaluation.recoveryRestoreConfirmation?.validation_chapter_nos || evaluation.recoveryRestoreConfirmation?.validationChapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const restoreChapterNos = arrayValue(evaluation.latestChapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const defaultFiveChapterRecoveryVerdict = defaultFiveChapterRecoveryVerdictFromSource(evaluation.recoveryRestoreConfirmation)
    || evaluation.defaultFiveChapterRecoveryVerdict
    || null
  return {
    status: Number(evaluation.rawRiskCount || 0) > 0 ? 'relapsed' : 'passed',
    source: 'safe_batch_recovery_restore_five_batch',
    restored_batch_created_at: text(evaluation.latestBatchCreatedAt),
    restore_chapter_nos: restoreChapterNos,
    validation_chapter_nos: validationChapterNos,
    stable_pass_streak: Math.max(0, Number(stablePassStreak || 0)),
    summary: Number(evaluation.rawRiskCount || 0) > 0
      ? `恢复5章扩批稳定观察发现复发：${compactChapterNoEvidence(restoreChapterNos)}仍有核心/回报/追读热区。`
      : `恢复5章扩批稳定观察通过：${compactChapterNoEvidence(validationChapterNos)}验证批之后，${compactChapterNoEvidence(restoreChapterNos)}继续保持核心守恒、显性回报和章末追读稳定。`,
    ...(defaultFiveChapterRecoveryVerdict ? {
      default_five_chapter_recovery_verdict: defaultFiveChapterRecoveryVerdict,
    } : {}),
  }
}

export function safeBatchDefaultFiveChapterRecoveryVerdictRelapse(evaluation: AnyRecord | null | undefined) {
  if (!evaluation || Number(evaluation.rawRiskCount || 0) <= 0 || !evaluation.topHotspot) return null
  const verdict = evaluation.defaultFiveChapterRecoveryVerdict
    || defaultFiveChapterRecoveryVerdictFromSource(evaluation.defaultFiveChapterLane)
    || defaultFiveChapterRecoveryVerdictFromSource(evaluation.recoveryRestoreConfirmation)
    || null
  if (!verdict || text(verdict.status) !== 'passed') return null
  const failureReasons = arrayValue(verdict.cleared_failure_reasons || verdict.clearedFailureReasons)
    .concat(arrayValue(verdict.failure_reasons || verdict.failureReasons))
    .map(item => text(item))
    .filter(Boolean)
  const uniqueFailureReasons = Array.from(new Set(failureReasons))
  if (!uniqueFailureReasons.length) return null
  const hotspot = evaluation.topHotspot || {}
  const counts = {
    riskCount: Number(hotspot.riskCount || hotspot.risk_count || 0),
    coreRiskCount: Number(hotspot.coreRiskCount || hotspot.core_risk_count || 0),
    payoffDebtCount: Number(hotspot.payoffDebtCount || hotspot.payoff_debt_count || 0),
    readerPullRiskCount: Number(hotspot.readerPullRiskCount || hotspot.reader_pull_risk_count || 0),
  }
  const reasonStatuses = uniqueFailureReasons.map(reason => {
    const riskCount = safeBatchDefaultRecoveryRiskCountForReason(reason, counts)
    return {
      reason,
      status: riskCount > 0 ? 'relapsed' : 'stable',
      risk_count: riskCount,
    }
  })
  const relapsedFailureReasons = reasonStatuses
    .filter(item => item.status === 'relapsed')
    .map(item => item.reason)
  if (!relapsedFailureReasons.length) return null
  const stableFailureReasons = reasonStatuses
    .filter(item => item.status === 'stable')
    .map(item => item.reason)
  const relapseBatchChapterNos = arrayValue(evaluation.latestChapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const relapsedChapterNos = arrayValue(hotspot.chapterNos || hotspot.chapter_nos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const validationChapterNos = arrayValue(verdict.validation_chapter_nos || verdict.validationChapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const segmentLabel = text(hotspot.label, text(hotspot.key, '复发段位'))
  const relapseChapterText = relapsedChapterNos.length ? compactChapterNoEvidence(relapsedChapterNos) : compactChapterNoEvidence(relapseBatchChapterNos)
  return {
    visible: true,
    status: 'relapsed',
    label: '恢复判定失效',
    source: 'default_five_chapter_recovery_verdict',
    summary: `恢复判定失效 -> 回到3章验证批：${relapsedFailureReasons.join('、')}在${segmentLabel}${relapseChapterText}复发，${compactChapterNoEvidence(validationChapterNos)}清零证据失效。`,
    default_batch_chapter_nos: arrayValue(verdict.default_batch_chapter_nos || verdict.defaultBatchChapterNos)
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0),
    restore_chapter_nos: arrayValue(verdict.restore_chapter_nos || verdict.restoreChapterNos)
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0),
    previous_validation_chapter_nos: arrayValue(verdict.previous_validation_chapter_nos || verdict.previousValidationChapterNos)
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0),
    validation_chapter_nos: validationChapterNos,
    relapse_batch_chapter_nos: relapseBatchChapterNos,
    relapsed_chapter_nos: relapsedChapterNos,
    repeated_hotspot_segment: {
      key: text(hotspot.key),
      label: segmentLabel,
      risk_count: counts.riskCount,
      core_risk_count: counts.coreRiskCount,
      payoff_debt_count: counts.payoffDebtCount,
      reader_pull_risk_count: counts.readerPullRiskCount,
    },
    failure_reasons: uniqueFailureReasons,
    cleared_failure_reasons: uniqueFailureReasons,
    relapsed_failure_reasons: relapsedFailureReasons,
    stable_failure_reasons: stableFailureReasons,
    failure_reason_statuses: reasonStatuses,
  }
}

export function defaultFiveChapterLaneTemplateVersionFromLane(lane: AnyRecord | null | undefined) {
  if (!lane) return null
  const rawVersion = lane.latest_template_version_profile
    || lane.latestTemplateVersionProfile
    || lane.template_version
    || lane.templateVersion
    || null
  const normalizedProfile = latestDefaultFiveChapterLaneTemplateVersionProfile({ latest_template_version_profile: rawVersion })
  const normalizedTemplate = normalizeDefaultFiveChapterLaneTemplateVersion(rawVersion)
  const explicitId = firstText(lane.template_version_id, lane.templateVersionId)
  const version = normalizedProfile || normalizedTemplate || null
  const id = explicitId || text(version?.id)
  if (!id && !version) return null
  return {
    ...(version || {}),
    id: id || text(version?.id),
    label: firstText(version?.label, '默认5章档位模板版本'),
  }
}

export function defaultFiveChapterLaneTemplateRequirementForFailureReason(reason: string) {
  if (reason === '核心偏移') {
    return {
      key: 'default_lane_segment_duty',
      label: '默认档位段位职责',
      failure_reason: reason,
    }
  }
  if (reason === '回报欠账') {
    return {
      key: 'default_lane_payoff_density',
      label: '回报密度',
      failure_reason: reason,
    }
  }
  if (reason === '追读拉力') {
    return {
      key: 'default_lane_ending_hook_template',
      label: '章末追读模板',
      failure_reason: reason,
    }
  }
  return {
    key: 'default_lane_conflict_rotation',
    label: '冲突轮换',
    failure_reason: reason,
  }
}

export function defaultFiveChapterLaneTemplateRequirementsForFailureReasons(reasons: string[]) {
  const byKey = new Map<string, AnyRecord>()
  reasons.forEach(reason => {
    const requirement = defaultFiveChapterLaneTemplateRequirementForFailureReason(reason)
    byKey.set(requirement.key, requirement)
  })
  return Array.from(byKey.values())
}

export function safeBatchDefaultFiveChapterRegression(evaluation: AnyRecord | null | undefined) {
  if (!evaluation || text(evaluation.source) !== 'auto_creation_safe_batch') return null
  const lane = evaluation.defaultFiveChapterLane || null
  if (!lane || Number(evaluation.rawRiskCount || 0) <= 0 || !evaluation.topHotspot) return null
  const defaultReady = lane.default_five_chapter_ready ?? lane.defaultFiveChapterReady
  if (defaultReady === false || text(lane.status) !== 'ready') return null
  const defaultBatchChapterNos = arrayValue(evaluation.latestChapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const restoreChapterNos = arrayValue(lane.restore_chapter_nos || lane.restoreChapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const validationChapterNos = arrayValue(lane.validation_chapter_nos || lane.validationChapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const hotspot = evaluation.topHotspot || {}
  const failureReasons = [
    Number(hotspot.coreRiskCount || hotspot.core_risk_count || 0) > 0 ? '核心偏移' : '',
    Number(hotspot.payoffDebtCount || hotspot.payoff_debt_count || 0) > 0 ? '回报欠账' : '',
    Number(hotspot.readerPullRiskCount || hotspot.reader_pull_risk_count || 0) > 0 ? '追读拉力' : '',
  ].filter(Boolean)
  const segmentLabel = text(hotspot.label, text(hotspot.key, '复发段位'))
  const stablePassStreak = Number(lane.stable_pass_streak ?? lane.stablePassStreak ?? 0)
  const requiredStablePassStreak = Number(lane.required_stable_pass_streak ?? lane.requiredStablePassStreak ?? 2)
  const riskText = failureReasons.length ? `失效证据：${failureReasons.join('、')}。` : '核心/回报/追读证据失效。'
  const defaultRecoveryVerdictRelapse = safeBatchDefaultFiveChapterRecoveryVerdictRelapse(evaluation)
  const templateVersion = defaultFiveChapterLaneTemplateVersionFromLane(lane)
  const templateVersionId = text(templateVersion?.id)
  const templateVersionFailedRequirements = defaultFiveChapterLaneTemplateRequirementsForFailureReasons(failureReasons)
  const templateVersionText = templateVersionId ? `版本 ${templateVersionId} ` : ''

  return {
    visible: true,
    status: 'regressed',
    label: '默认5章档位回退原因',
    source: 'default_five_chapter_lane',
    stable_pass_streak: stablePassStreak,
    required_stable_pass_streak: Number.isFinite(requiredStablePassStreak) && requiredStablePassStreak > 0 ? requiredStablePassStreak : 2,
    default_five_chapter_ready: false,
    default_batch_created_at: text(evaluation.latestBatchCreatedAt),
    default_batch_chapter_nos: defaultBatchChapterNos,
    restore_chapter_nos: restoreChapterNos,
    validation_chapter_nos: validationChapterNos,
    repeated_hotspot_segment: {
      key: text(hotspot.key),
      label: segmentLabel,
      count: 1,
      chapter_nos: arrayValue(hotspot.chapterNos || hotspot.chapter_nos).map(chapterNo => Number(chapterNo)).filter(chapterNo => chapterNo > 0),
      risk_count: Number(hotspot.riskCount || hotspot.risk_count || 0),
      core_risk_count: Number(hotspot.coreRiskCount || hotspot.core_risk_count || 0),
      payoff_debt_count: Number(hotspot.payoffDebtCount || hotspot.payoff_debt_count || 0),
      reader_pull_risk_count: Number(hotspot.readerPullRiskCount || hotspot.reader_pull_risk_count || 0),
      summary: text(hotspot.summary),
    },
    failure_reasons: failureReasons,
    ...(templateVersionId ? { template_version_id: templateVersionId } : {}),
    ...(templateVersion ? { template_version: templateVersion } : {}),
    ...(templateVersionFailedRequirements.length ? {
      template_version_failed_requirements: templateVersionFailedRequirements,
    } : {}),
    summary: defaultRecoveryVerdictRelapse
      ? `${defaultRecoveryVerdictRelapse.summary} ${templateVersionText}默认5章档位在${segmentLabel}复发，先回到扩批结构修复层。`
      : `默认5章档位回退原因：连续 ${stablePassStreak} 批恢复稳定后，${compactChapterNoEvidence(defaultBatchChapterNos)}${templateVersionText}默认档位在${segmentLabel}复发，${riskText}先回到3章验证批或扩批结构修复层。`,
    ...(defaultRecoveryVerdictRelapse ? {
      default_five_chapter_recovery_verdict_relapse: defaultRecoveryVerdictRelapse,
    } : {}),
  }
}

export function latestDefaultFiveChapterLaneTemplateVersionProfile(profileLike: AnyRecord | null | undefined) {
  const profile = profileLike?.latest_template_version_profile
    || profileLike?.latestTemplateVersionProfile
    || null
  if (!profile || profile.visible === false) return null
  const id = firstText(profile.id, profile.template_version_id, profile.templateVersionId, profile.version_id, profile.versionId)
  const passStreak = Number(profile.pass_streak ?? profile.passStreak ?? 0)
  const requiredPassStreak = Number(profile.required_pass_streak ?? profile.requiredPassStreak ?? profileLike?.required_pass_streak ?? profileLike?.requiredPassStreak ?? 2)
  const latestStatus = firstText(profile.latest_status, profile.latestStatus)
  const status = firstText(profile.status)
  if (!id && !status && !latestStatus && passStreak <= 0) return null
  return {
    ...profile,
    id,
    label: firstText(profile.label, '默认5章档位模板版本'),
    status,
    latest_status: latestStatus,
    pass_streak: Number.isFinite(passStreak) ? passStreak : 0,
    required_pass_streak: Number.isFinite(requiredPassStreak) && requiredPassStreak > 0 ? requiredPassStreak : 2,
  }
}

export function defaultFiveChapterLaneTemplateVersionReady(profile: AnyRecord | null | undefined) {
  if (!profile) return true
  const status = text(profile.status)
  const latestStatus = text(profile.latest_status || profile.latestStatus)
  if (['relapsed', 'redesign'].includes(status) || latestStatus === 'failed') return false
  const passStreak = Number(profile.pass_streak ?? profile.passStreak ?? 0)
  const requiredPassStreak = Number(profile.required_pass_streak ?? profile.requiredPassStreak ?? 2)
  if (status === 'ready') return true
  return passStreak >= Math.max(1, Number.isFinite(requiredPassStreak) ? requiredPassStreak : 2)
}

export function buildSafeBatchRecoveryRestoreStabilityLane(policy: AnyRecord | null | undefined) {
  if (!policy?.visible || text(policy.status) !== 'expanded' || Number(policy.targetChapterCount ?? policy.target_chapter_count ?? 0) < 5) return null
  const feedback = policy.expansionFeedback || policy.expansion_feedback || null
  const evidence = feedback?.recoveryRestoreStabilityEvidence
    || feedback?.recovery_restore_stability_evidence
    || null
  const templateStabilityProfile = feedback?.defaultFiveChapterLaneTemplateStabilityProfile
    || feedback?.default_five_chapter_lane_template_stability_profile
    || null
  const latestTemplateVersionProfile = latestDefaultFiveChapterLaneTemplateVersionProfile(templateStabilityProfile)
  const templateVersionReady = defaultFiveChapterLaneTemplateVersionReady(latestTemplateVersionProfile)
  const validationResult = feedback?.expansionStructureValidationResult
    || feedback?.expansion_structure_validation_result
    || null
  const defaultFiveChapterRecoveryVerdict = defaultFiveChapterRecoveryVerdictFromSource(evidence)
    || defaultFiveChapterRecoveryVerdictFromSource(validationResult)
    || null
  const stablePassStreak = Number(evidence?.stable_pass_streak ?? evidence?.stablePassStreak ?? 0)
  if (!evidence || text(evidence.status) !== 'passed' || stablePassStreak <= 0) return null
  const restoreChapterNos = arrayValue(evidence.restore_chapter_nos || evidence.restoreChapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const validationChapterNos = arrayValue(evidence.validation_chapter_nos || evidence.validationChapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const requiredStablePassStreak = 2
  const restoreStableReady = stablePassStreak >= requiredStablePassStreak
  const defaultReady = restoreStableReady && templateVersionReady
  const templateVersionId = text(latestTemplateVersionProfile?.id)
  const templateVersionPassText = latestTemplateVersionProfile
    ? `模板版本 ${templateVersionId || text(latestTemplateVersionProfile.label, '当前版本')} 连过 ${Number(latestTemplateVersionProfile.pass_streak || 0)}/${Number(latestTemplateVersionProfile.required_pass_streak || 2)}`
    : ''
  const summary = defaultReady
    ? `恢复5章扩批连续 ${stablePassStreak} 批稳定，${templateVersionPassText ? `${templateVersionPassText}，` : ''}${compactChapterNoEvidence(restoreChapterNos)}已可作为默认5章档位证据。`
    : restoreStableReady && latestTemplateVersionProfile
      ? `恢复5章扩批连续 ${stablePassStreak} 批稳定，但当前${templateVersionPassText}；继续5章观察批，确认当前模板版本不复发后再把5章连写设为默认档位。`
      : `恢复5章扩批已稳定 ${stablePassStreak}/${requiredStablePassStreak} 批，${compactChapterNoEvidence(restoreChapterNos)}通过后仍需继续观察 1-2 批，再把5章连写设为默认档位。`
  const label = defaultReady ? '默认5章档位' : '5章观察批'
  return {
    visible: true,
    status: defaultReady ? 'ready' : 'observing',
    label,
    source: 'recovery_restore_stability_evidence',
    stable_pass_streak: stablePassStreak,
    required_stable_pass_streak: requiredStablePassStreak,
    default_five_chapter_ready: defaultReady,
    restore_chapter_nos: restoreChapterNos,
    validation_chapter_nos: validationChapterNos,
    summary,
    task_center_filter_label: templateVersionId
      ? `批次复盘筛选：${label} / 当前模板版本 ${templateVersionId}`
      : `批次复盘筛选：${label}`,
    ...(latestTemplateVersionProfile ? {
      latest_template_version_profile: latestTemplateVersionProfile,
    } : {}),
    ...(defaultFiveChapterRecoveryVerdict ? {
      default_five_chapter_recovery_verdict: defaultFiveChapterRecoveryVerdict,
    } : {}),
  }
}

export function latestProductionRelapseVerdictFromExpansionPolicy(policy: AnyRecord | null | undefined) {
  const feedback = policy?.expansionFeedback || policy?.expansion_feedback || null
  const validation = feedback?.expansionStructureValidationResult
    || feedback?.expansion_structure_validation_result
    || null
  const templateVerdict = validation?.defaultFiveChapterLaneTemplateVerdict
    || validation?.default_five_chapter_lane_template_verdict
    || null
  const productionRelapseVerdict = templateVerdict?.productionRelapseVerdict
    || templateVerdict?.production_relapse_verdict
    || null
  if (productionRelapseVerdict?.visible === false) return null
  const hasProductionRelapseEvidence = Boolean(
    text(productionRelapseVerdict?.template_version_id || productionRelapseVerdict?.templateVersionId)
    || arrayValue(productionRelapseVerdict?.failure_reasons || productionRelapseVerdict?.failureReasons).length
    || arrayValue(productionRelapseVerdict?.default_batch_chapter_nos || productionRelapseVerdict?.defaultBatchChapterNos).length
    || arrayValue(productionRelapseVerdict?.restore_chapter_nos || productionRelapseVerdict?.restoreChapterNos).length
  )
  return hasProductionRelapseEvidence ? productionRelapseVerdict : null
}

export function productionRelapseReviewCtaPayload(cta: AnyRecord) {
  return {
    kind: text(cta.kind),
    label: text(cta.label),
    summary: text(cta.summary),
    target_chapter_count: Number(cta.target_chapter_count || cta.targetChapterCount || 0),
    remaining_failure_reasons: arrayValue(cta.remaining_failure_reasons || cta.remainingFailureReasons).map(item => text(item)).filter(Boolean),
    cleared_failure_reasons: arrayValue(cta.cleared_failure_reasons || cta.clearedFailureReasons).map(item => text(item)).filter(Boolean),
    production_relapse_verdict: cta.production_relapse_verdict || cta.productionRelapseVerdict || null,
  }
}

export function productionRelapseCtaExecutionPayload(cta: AnyRecord | null | undefined, source: string) {
  if (!cta) return null
  const verdict = cta.production_relapse_verdict || cta.productionRelapseVerdict || {}
  const templateVersionId = text(
    verdict.template_version_id
    || verdict.templateVersionId
    || cta.template_version_id
    || cta.templateVersionId,
  )
  const remainingFailureReasons = arrayValue(cta.remaining_failure_reasons || cta.remainingFailureReasons || verdict.remaining_failure_reasons || verdict.remainingFailureReasons)
    .map(item => text(item))
    .filter(Boolean)
  const clearedFailureReasons = arrayValue(cta.cleared_failure_reasons || cta.clearedFailureReasons || verdict.cleared_failure_reasons || verdict.clearedFailureReasons)
    .map(item => text(item))
    .filter(Boolean)
  return {
    source,
    kind: text(cta.kind),
    label: text(cta.label),
    summary: text(cta.summary),
    template_version_id: templateVersionId,
    default_batch_chapter_nos: arrayValue(verdict.default_batch_chapter_nos || verdict.defaultBatchChapterNos)
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0),
    restore_chapter_nos: arrayValue(verdict.restore_chapter_nos || verdict.restoreChapterNos)
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0),
    validation_chapter_nos: arrayValue(verdict.validation_chapter_nos || verdict.validationChapterNos)
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0),
    remaining_failure_reasons: remainingFailureReasons,
    cleared_failure_reasons: clearedFailureReasons,
    target_chapter_count: Number(cta.target_chapter_count || cta.targetChapterCount || 0),
    close_condition: remainingFailureReasons.length
      ? 'repair remaining_failure_reasons, then rerun production_relapse_verdict.status=passed'
      : 'production_relapse_verdict.status=passed && remaining_failure_reasons empty',
  }
}

export function buildProductionRelapseReviewCta(policy: AnyRecord | null | undefined, recoveryRestoreStabilityLane: AnyRecord | null | undefined) {
  const verdict = latestProductionRelapseVerdictFromExpansionPolicy(policy)
  const status = text(verdict?.status)
  if (!verdict || !status) return null
  const remainingFailureReasons = arrayValue(verdict.remaining_failure_reasons || verdict.remainingFailureReasons)
    .map(item => text(item))
    .filter(Boolean)
  const clearedFailureReasons = arrayValue(verdict.cleared_failure_reasons || verdict.clearedFailureReasons)
    .map(item => text(item))
    .filter(Boolean)
  if (status === 'passed') {
    const readyForDefault = Boolean(recoveryRestoreStabilityLane?.default_five_chapter_ready || recoveryRestoreStabilityLane?.defaultFiveChapterReady)
    const label = readyForDefault ? '恢复默认5章档位' : '进入5章观察批'
    return productionRelapseReviewCtaPayload({
      kind: readyForDefault ? 'restore_default_lane' : 'enter_five_chapter_observation',
      label,
      summary: readyForDefault
        ? `生产后验已修复：${clearedFailureReasons.join('、') || '真实生产失败维度'}已清零，可恢复默认5章档位。`
        : `生产后验已修复：${clearedFailureReasons.join('、') || '真实生产失败维度'}已清零，先进入5章观察批确认默认档位稳定。`,
      target_chapter_count: 5,
      remaining_failure_reasons: remainingFailureReasons,
      cleared_failure_reasons: clearedFailureReasons,
      production_relapse_verdict: verdict,
    })
  }
  if (status === 'failed') {
    return productionRelapseReviewCtaPayload({
      kind: 'repair_production_relapse',
      label: '修生产后验',
      summary: `生产后验验证批仍复发：${remainingFailureReasons.join('、') || '真实生产失败维度'}；下一步只按 remaining_failure_reasons 生成修生产后验任务。`,
      target_chapter_count: Math.max(1, Number(policy?.baseChapterCount || policy?.base_chapter_count || 3)),
      remaining_failure_reasons: remainingFailureReasons,
      cleared_failure_reasons: clearedFailureReasons,
      production_relapse_verdict: verdict,
    })
  }
  return null
}

export function safeBatchRecoveryRestoreObservationConfirmation(lane: AnyRecord | null | undefined, targetChapterCount: number) {
  if (!lane) return null
  const defaultFiveChapterRecoveryVerdict = defaultFiveChapterRecoveryVerdictFromSource(lane)
  const latestTemplateVersionProfile = lane.latest_template_version_profile
    || lane.latestTemplateVersionProfile
    || null
  return {
    status: text(lane.status, 'observing'),
    label: text(lane.label, '5章观察批'),
    summary: text(lane.summary),
    validation_chapter_nos: arrayValue(lane.validation_chapter_nos || lane.validationChapterNos),
    target_chapter_count: Math.max(5, Number(targetChapterCount || 5)),
    risk_count: 0,
    source: 'recovery_restore_stability_evidence',
    evidence: [text(lane.summary)].filter(Boolean),
    ...(latestTemplateVersionProfile ? {
      latest_template_version_profile: latestTemplateVersionProfile,
    } : {}),
    ...(defaultFiveChapterRecoveryVerdict ? {
      default_five_chapter_recovery_verdict: defaultFiveChapterRecoveryVerdict,
    } : {}),
  }
}

export function safeBatchRecoveryRestoreRelapseSegment(evaluation: AnyRecord | null | undefined) {
  if (!evaluation || text(evaluation.source) !== 'safe_batch_recovery_restore_five_batch') return null
  if (Number(evaluation.rawRiskCount || 0) <= 0 || !evaluation.topHotspot) return null
  const validationSegment = evaluation.recoveryRestoreValidationSegment || null
  const hotspotKey = text(evaluation.topHotspot?.key)
  if (validationSegment?.key && hotspotKey && validationSegment.key !== hotspotKey) return null
  const label = text(validationSegment?.label, text(evaluation.topHotspot?.label, hotspotKey || '复发段位'))
  const count = Math.max(2, Number(validationSegment?.count || 1) + 1)
  return {
    key: hotspotKey || text(validationSegment?.key),
    label,
    count,
    source: 'safe_batch_recovery_restore_five_batch',
    summary: `恢复5章后${label}再次复发，说明验证批通过后的批次结构仍会放大同段热区，先回到扩批结构修复层。`,
  }
}

export function buildSafeBatchExpansionFeedback(args: {
  runRecords: AnyRecord[]
  chapters: AnyRecord[]
  reviews: AnyRecord[]
}) {
  const expandedEntries = arrayValue(args.runRecords)
    .filter(run => text(run?.run_type) === 'batch_generate_prose')
    .map(run => ({
      run,
      input: parsePayload(run?.input_ref, { owner: run, kind: 'run', field: 'input_ref' }) || {},
      output: parsePayload(run?.output_ref, { owner: run, kind: 'run', field: 'output_ref' }) || {},
    }))
    .filter(entry => isSafeBatchGenerationSource(text(entry.input?.source)))
    .map(entry => ({
      ...entry,
      preflight: entry.input?.batch_preflight || entry.input?.batchPreflight || null,
      items: safeBatchExpansionItemsFromOutput(entry.output),
    }))
    .filter(entry => {
      const policy = safeBatchExpansionPolicyFromPreflight(entry.preflight)
      return Boolean(policy && entry.items.filter(item => item.status === 'success').length >= 5)
    })
    .sort((a, b) => recordTime(b.run) - recordTime(a.run))
  const structureValidationEntries = arrayValue(args.runRecords)
    .filter(run => text(run?.run_type) === 'batch_generate_prose')
    .map(run => ({
      run,
      input: parsePayload(run?.input_ref, { owner: run, kind: 'run', field: 'input_ref' }) || {},
      output: parsePayload(run?.output_ref, { owner: run, kind: 'run', field: 'output_ref' }) || {},
    }))
    .filter(entry => isSafeBatchGenerationSource(text(entry.input?.source)))
    .map(entry => ({
      ...entry,
      preflight: entry.input?.batch_preflight || entry.input?.batchPreflight || null,
      items: safeBatchExpansionItemsFromOutput(entry.output),
    }))
    .filter(entry => Boolean(safeBatchExpansionStructureVerificationFromPreflight(entry.preflight)))
    .sort((a, b) => recordTime(b.run) - recordTime(a.run))
  const structureDecisionEntries = arrayValue(args.runRecords)
    .filter(run => text(run?.run_type) === 'batch_generate_prose')
    .map(run => ({
      run,
      input: parsePayload(run?.input_ref, { owner: run, kind: 'run', field: 'input_ref' }) || {},
      output: parsePayload(run?.output_ref, { owner: run, kind: 'run', field: 'output_ref' }) || {},
    }))
    .filter(entry => isSafeBatchGenerationSource(text(entry.input?.source)))
    .map(entry => ({
      ...entry,
      preflight: entry.input?.batch_preflight || entry.input?.batchPreflight || null,
      items: safeBatchExpansionItemsFromOutput(entry.output),
    }))
    .filter(entry => Boolean(safeBatchExpansionStructureDecisionFromContext({
      nextBatchBrief: entry.input?.next_batch_brief || entry.input?.nextBatchBrief || null,
      batchPreflight: entry.preflight,
    })))
    .sort((a, b) => recordTime(b.run) - recordTime(a.run))

  const evaluations = expandedEntries
    .slice(0, 5)
    .map(entry => safeBatchExpansionEntryEvaluation({
      entry,
      runRecords: args.runRecords,
      chapters: args.chapters,
      reviews: args.reviews,
    }))
    .filter(evaluation => evaluation.rawReview.visible)
  const latest = evaluations[0]
  const structureValidationEvaluations = structureValidationEntries
    .slice(0, 12)
    .map(entry => safeBatchExpansionStructureValidationEntryEvaluation({
      entry,
      runRecords: args.runRecords,
      chapters: args.chapters,
      reviews: args.reviews,
    }))
  const expansionEvaluationsForTrend = expandedEntries
    .slice(0, 12)
    .map(entry => safeBatchExpansionEntryEvaluation({
      entry,
      runRecords: args.runRecords,
      chapters: args.chapters,
      reviews: args.reviews,
    }))
    .filter(evaluation => evaluation.rawReview.visible)
  const latestStructureValidation = structureValidationEvaluations
    .find(evaluation => evaluation.result.visible) || null
  const expansionStructureValidationTrend = buildSafeBatchExpansionStructureValidationTrend({
    validationEvaluations: structureValidationEvaluations,
    expansionEvaluations: expansionEvaluationsForTrend,
  })
  const defaultFiveChapterLaneTemplateStabilityProfile = buildDefaultFiveChapterLaneTemplateStabilityProfile({
    validationEvaluations: structureValidationEvaluations,
    expansionEvaluations: expansionEvaluationsForTrend,
  })
  const expansionStructureRepairEffectiveness = buildSafeBatchExpansionStructureRepairEffectiveness({
    runRecords: args.runRecords,
    validationEvaluations: structureValidationEvaluations,
    expansionEvaluations: expansionEvaluationsForTrend,
  })
  const expansionStructureDecisionTrend = buildSafeBatchExpansionStructureDecisionTrend({
    decisionEvaluations: structureDecisionEntries
      .slice(0, 12)
      .map(entry => safeBatchExpansionStructureDecisionEntryEvaluation({
        entry,
        chapters: args.chapters,
        reviews: args.reviews,
      })),
  })
  if (!latest) {
    if (latestStructureValidation) {
      const result = latestStructureValidation.result
      const riskCount = Number(result.risk_count || 0)
      const rollbackPolicy = safeBatchExpansionRollbackPolicy({
        riskCount,
        coreRiskCount: Number(result.core_risk_count || 0),
        hotspotLabel: text(result.repeated_hotspot_segment?.label),
      })
      return {
        visible: true,
        status: riskCount > 0 ? 'rollback_to_small_batch' : 'recovered',
        label: '扩批热区反馈',
        summary: riskCount > 0 ? `${result.summary}${rollbackPolicy.summary}` : result.summary,
        targetChapterCount: riskCount > 0 ? Number(rollbackPolicy.targetChapterCount || 3) : 5,
        latestBatchCreatedAt: latestStructureValidation.latestBatchCreatedAt,
        latestChapterNos: latestStructureValidation.latestChapterNos,
        riskCount,
        stablePassStreak: 0,
        recentExpandedBatchCount: 0,
        repeatedHotspotSegment: result.repeated_hotspot_segment || null,
        rollbackPolicy: riskCount > 0 ? rollbackPolicy : null,
        expansionStructureValidationResult: result,
        expansionStructureValidationTrend,
        defaultFiveChapterLaneTemplateStabilityProfile,
        expansionStructureRepairEffectiveness,
        expansionStructureDecisionTrend,
      }
    }
    return {
      visible: false,
      status: 'none',
      label: '扩批热区反馈',
      summary: '尚未产生5章扩批分段复盘。',
      targetChapterCount: 0,
      latestBatchCreatedAt: '',
      latestChapterNos: [],
      riskCount: 0,
      stablePassStreak: 0,
      recentExpandedBatchCount: 0,
      repeatedHotspotSegment: null,
      rollbackPolicy: null,
      expansionStructureValidationTrend,
      defaultFiveChapterLaneTemplateStabilityProfile,
      expansionStructureRepairEffectiveness,
      expansionStructureDecisionTrend,
    }
  }

  let stablePassStreak = 0
  for (const evaluation of evaluations) {
    if (evaluation.rawRiskCount > 0) break
    stablePassStreak += 1
  }
  const recentExpandedBatchCount = evaluations.length
  const repeatedHotspotCount = latest.topHotspot
    ? evaluations.filter(evaluation => text(evaluation.topHotspot?.key) === text(latest.topHotspot?.key)).length
    : 0
  const recoveryRestoreRelapseSegment = safeBatchRecoveryRestoreRelapseSegment(latest)
  const defaultFiveChapterRecoveryVerdictRelapse = safeBatchDefaultFiveChapterRecoveryVerdictRelapse(latest)
  const defaultFiveChapterRegression = safeBatchDefaultFiveChapterRegression(latest)
  const repeatedHotspotSegment = recoveryRestoreRelapseSegment
    || defaultFiveChapterRegression?.repeated_hotspot_segment
    || (latest.topHotspot && repeatedHotspotCount >= 2
      ? {
        key: text(latest.topHotspot.key),
        label: text(latest.topHotspot.label),
        count: repeatedHotspotCount,
        summary: `${text(latest.topHotspot.label)}连续 ${repeatedHotspotCount} 次扩批热区，先做${text(latest.topHotspot.label)}固定段落治理和批次结构改写。`,
      }
      : null)
  const recoveryRestoreStabilityEvidence = safeBatchRecoveryRestoreStabilityEvidence(latest, stablePassStreak)
  const feedbackBase = {
    stablePassStreak,
    recentExpandedBatchCount,
    repeatedHotspotSegment,
    recoveryRestoreStabilityEvidence,
    defaultFiveChapterRegression,
    defaultFiveChapterRecoveryVerdictRelapse,
    defaultFiveChapterLaneTemplateStabilityProfile,
  }
  const validationIsNewerThanLatestExpansion = latestStructureValidation
    ? Date.parse(text(latestStructureValidation.latestBatchCreatedAt)) > Date.parse(text(latest.latestBatchCreatedAt))
    : false
  if (latestStructureValidation && validationIsNewerThanLatestExpansion) {
    const result = latestStructureValidation.result
    const riskCount = Number(result.risk_count || 0)
    const rollbackPolicy = safeBatchExpansionRollbackPolicy({
      riskCount,
      coreRiskCount: Number(result.core_risk_count || 0),
      hotspotLabel: text(result.repeated_hotspot_segment?.label),
    })
    return {
      visible: true,
      status: riskCount > 0 ? 'rollback_to_small_batch' : 'recovered',
      label: '扩批热区反馈',
      summary: riskCount > 0 ? `${result.summary}${rollbackPolicy.summary}` : result.summary,
      targetChapterCount: riskCount > 0 ? Number(rollbackPolicy.targetChapterCount || 3) : 5,
      latestBatchCreatedAt: latestStructureValidation.latestBatchCreatedAt,
      latestChapterNos: latestStructureValidation.latestChapterNos,
      riskCount,
      ...feedbackBase,
      repeatedHotspotSegment: result.repeated_hotspot_segment || repeatedHotspotSegment,
      rollbackPolicy: riskCount > 0 ? rollbackPolicy : null,
      expansionStructureValidationResult: result,
      expansionStructureValidationTrend,
      expansionStructureRepairEffectiveness,
      expansionStructureDecisionTrend,
    }
  }

  if (latest.rawRiskCount <= 0) {
    const summary = recoveryRestoreStabilityEvidence
      ? `${recoveryRestoreStabilityEvidence.summary} 已沉淀为长期扩批稳定证据。`
      : stablePassStreak > 1
        ? `连续 ${stablePassStreak} 批5章扩批通过，前段、中段、后段核心/回报/追读稳定，可继续观察 5 章安全连写。`
        : '最近一次5章扩批分段复盘通过，前段、中段、后段核心/回报/追读稳定。'
    return {
      visible: true,
      status: 'passed',
      label: '扩批热区反馈',
      summary,
      targetChapterCount: 5,
      latestBatchCreatedAt: latest.latestBatchCreatedAt,
      latestChapterNos: latest.latestChapterNos,
      riskCount: 0,
      ...feedbackBase,
      rollbackPolicy: null,
      expansionStructureValidationTrend,
      expansionStructureRepairEffectiveness,
      expansionStructureDecisionTrend,
    }
  }
  if (latest.segmentResolved && latest.effectiveRiskCount <= 0) {
    return {
      visible: true,
      status: 'recovered',
      label: '扩批热区反馈',
      summary: '扩批分段热区已修复并通过复检。',
      targetChapterCount: 5,
      latestBatchCreatedAt: latest.latestBatchCreatedAt,
      latestChapterNos: latest.latestChapterNos,
      riskCount: 0,
      ...feedbackBase,
      rollbackPolicy: null,
      expansionStructureValidationTrend,
      expansionStructureRepairEffectiveness,
      expansionStructureDecisionTrend,
    }
  }

  const rollbackPolicy = latest.rawReview.rollbackPolicy || safeBatchExpansionRollbackPolicy({
    riskCount: latest.rawRiskCount,
    coreRiskCount: Number(latest.rawReview.coreRiskCount || 0),
    hotspotLabel: '',
  })
  const summary = defaultFiveChapterRegression
    ? `${defaultFiveChapterRegression.summary}${text(rollbackPolicy?.summary)}`
    : defaultFiveChapterRecoveryVerdictRelapse
    ? `${defaultFiveChapterRecoveryVerdictRelapse.summary}${text(rollbackPolicy?.summary)}`
    : repeatedHotspotSegment
    ? `${repeatedHotspotSegment.summary}${text(rollbackPolicy?.summary)}`
    : text(rollbackPolicy?.summary, '扩批分段热区未闭环，下一轮回退到小批量安全连写。')
  return {
    visible: true,
    status: text(rollbackPolicy?.mode, 'rollback_to_small_batch'),
    label: '扩批热区反馈',
    summary,
    targetChapterCount: Number(rollbackPolicy?.targetChapterCount || 3),
    latestBatchCreatedAt: latest.latestBatchCreatedAt,
    latestChapterNos: latest.latestChapterNos,
    riskCount: latest.rawRiskCount,
    ...feedbackBase,
    rollbackPolicy,
    expansionStructureValidationTrend,
    expansionStructureRepairEffectiveness,
    expansionStructureDecisionTrend,
  }
}

export function recoveryEvidenceRegovernanceActionForItem(item: AnyRecord) {
  const sourceAction = text(item?.source_action || item?.sourceAction)
  const gateSource = text(item?.production_gate_source || item?.productionGateSource)
  if (gateSource === 'single_chapter_governance_recheck' || sourceAction === 'single_chapter_governance_recheck') {
    return {
      source: 'single_chapter_governance_recheck',
      sourceLabel: '单章治理复查',
      actionKey: 'recheck_single_chapter',
      actionLabel: '复检单章',
    }
  }
  if (gateSource === 'safe_batch_recovery_recheck' || sourceAction === 'safe_batch_recovery_recheck') {
    return {
      source: 'safe_batch_recovery_recheck',
      sourceLabel: '批次恢复复查',
      actionKey: 'recheck_safe_batch',
      actionLabel: '复盘批次',
    }
  }
  return {
    source: 'recovery_evidence_release_summary',
    sourceLabel: '安全连写放行摘要',
    actionKey: 'review_governance_closure',
    actionLabel: '治理复查台',
  }
}

export function buildRecoveryEvidenceRegovernanceQueue(args: {
  preflight?: AnyRecord | null
  review: AnyRecord
}) {
  const failedItems = arrayValue(args.review?.failed_items || args.review?.failedItems)
    .filter(item => text(item?.source) === 'recovery_evidence_release_summary')
  if (!failedItems.length) return null

  const releaseSummary = recoveryEvidenceReleaseSummaryFromPreflight(args.preflight)
  const releaseSources = arrayValue(releaseSummary?.cleared_sources || releaseSummary?.clearedSources)
  const sourceByKey = new Map(releaseSources.map(source => [text(source?.source || source?.sourceMode), source]))
  const allowedChapterNos = [
    ...arrayValue(releaseSummary?.allowed_chapter_nos),
    ...arrayValue(releaseSummary?.allowedChapterNos),
  ].map(item => finiteNumberOrNull(item)).filter((item): item is number => item !== null)
  const nextBatchLabel = firstText(releaseSummary?.next_batch_label, releaseSummary?.nextBatchLabel)

  const tasks = failedItems.map((item, index) => {
    const action = recoveryEvidenceRegovernanceActionForItem(item)
    const sourceRecord = sourceByKey.get(action.source) || {}
    const evidence = text(item?.evidence)
    const chapterNos = [
      ...arrayValue(item?.chapter_nos || item?.chapterNos),
      ...arrayValue(sourceRecord?.chapter_nos || sourceRecord?.chapterNos),
      ...(action.actionKey === 'recheck_single_chapter' ? allowedChapterNos.slice(0, 1) : []),
    ].map(value => finiteNumberOrNull(value)).filter((value): value is number => value !== null)
    const sourceTaskIndices = [
      ...arrayValue(item?.source_task_indices || item?.sourceTaskIndices),
      ...arrayValue(sourceRecord?.source_task_indices || sourceRecord?.sourceTaskIndices),
    ].map(value => finiteNumberOrNull(value)).filter((value): value is number => value !== null)
    const executionMeta = recoveryEvidenceGovernanceQueueExecutionMeta({
      source: action.source,
      source_task_indices: sourceTaskIndices,
      chapter_nos: chapterNos,
      source_tasks: [{
        source_task_index: sourceTaskIndices[0],
        chapter_no: chapterNos[0],
      }],
    }, action.actionKey)
    return {
      issue_type: 'recovery_evidence_governance_queue',
      severity: action.actionKey === 'review_governance_closure' ? 'medium' : 'high',
      task_status: 'needs_review',
      source: action.source,
      source_label: action.sourceLabel,
      source_status: 'failed_after_release',
      source_status_label: '放行后未继承',
      action_key: action.actionKey,
      action_label: action.actionLabel,
      evidence,
      failed_evidence: [evidence],
      ...executionMeta,
      title: `${action.sourceLabel}：${action.actionLabel}`,
      message: `放行摘要验收失败：${evidence}`,
      action: `${action.actionLabel}后刷新恢复依据审计，确认该放行依据重新被正文继承。`,
      recovery_evidence_review: {
        status: 'warn',
        summary: `放行摘要验收失败：${evidence}`,
        failed_evidence: [evidence],
        failed_items: [item],
      },
      acceptance_criteria: [
        '恢复依据审计重新生成',
        '对应来源不再出现在放行摘要失效清单',
        '下一轮批次复盘的 recovery_evidence_review 为 ok',
      ],
      queue_index: index,
    }
  })

  return {
    source: 'recovery_evidence_release_summary',
    status: 'needs_followup',
    label: '安全连写放行摘要再治理',
    summary: nextBatchLabel
      ? `${nextBatchLabel} 放行摘要验收未通过，需回到恢复依据治理队列重新闭环。`
      : '安全连写放行摘要验收未通过，需回到恢复依据治理队列重新闭环。',
    source_count: releaseSources.length || tasks.length,
    task_count: tasks.length,
    failed_evidence: failedItems.map(item => text(item?.evidence)).filter(Boolean),
    next_batch_label: nextBatchLabel,
    allowed_chapter_nos: allowedChapterNos,
    main_action: {
      action: text(tasks[0]?.action_key, 'review_governance_closure'),
      label: text(tasks[0]?.action_label, '治理复查台'),
      source: text(tasks[0]?.source, 'recovery_evidence_release_summary'),
      sourceLabel: text(tasks[0]?.source_label, '安全连写放行摘要'),
      status: 'failed_after_release',
      residualEvidence: failedItems.map(item => text(item?.evidence)).filter(Boolean),
    },
    next_cycle: {
      type: 'release_summary_regovernance',
      label: '放行摘要验收再治理',
    },
    tasks,
    recommendations: [
      '先把放行摘要失效项沉淀为下一轮恢复依据治理队列，不要直接扩大安全连写。',
      '按来源执行治理复查台、复检单章或复盘批次后，再刷新恢复依据审计。',
      '审计重新闭环后，再恢复 2-3 章安全连写并观察下一批正文继承情况。',
    ],
  }
}

export function recoveryEvidenceProfileSourceMeta(source: string, fallbackLabel = '') {
  if (source === 'single_chapter_governance_recheck') return { source, label: '单章治理复查' }
  if (source === 'safe_batch_recovery_recheck') return { source, label: '批次恢复复查' }
  if (source === 'recovery_evidence_release_summary') return { source, label: '安全连写放行摘要' }
  return { source: source || 'recovery_evidence_release_summary', label: fallbackLabel || '恢复依据来源' }
}

export function recoveryEvidenceProfileSourceFromItem(item: AnyRecord) {
  const gateSource = text(item?.production_gate_source || item?.productionGateSource)
  const sourceAction = text(item?.source_action || item?.sourceAction)
  if (gateSource) return recoveryEvidenceProfileSourceMeta(gateSource)
  if (sourceAction === 'single_chapter_governance_recheck' || sourceAction === 'safe_batch_recovery_recheck') {
    return recoveryEvidenceProfileSourceMeta(sourceAction)
  }
  return recoveryEvidenceProfileSourceMeta(text(item?.source || item?.sourceMode), text(item?.source_label || item?.sourceLabel))
}

export function recoveryEvidenceReleaseFailureEventsFromTask(task: AnyRecord, run: AnyRecord, taskIndex: number) {
  if (text(task?.issue_type || task?.issueType) !== 'recovery_evidence_mismatch') return []
  const events: AnyRecord[] = []
  const review = task?.recovery_evidence_review || task?.recoveryEvidenceReview || {}
  arrayValue(review?.failed_items || review?.failedItems)
    .filter(item => text(item?.source || item?.sourceMode) === 'recovery_evidence_release_summary')
    .forEach(item => {
      const sourceMeta = recoveryEvidenceProfileSourceFromItem(item)
      events.push({
        source: sourceMeta.source,
        label: sourceMeta.label,
        evidence: text(item?.evidence),
        run_id: run?.id ?? null,
        task_index: taskIndex,
        failed_at: text(run?.created_at || run?.updated_at),
      })
    })

  const queue = task?.recovery_evidence_regovernance_queue
    || task?.recoveryEvidenceRegovernanceQueue
    || task?.recoveryEvidenceGovernanceQueue
    || null
  arrayValue(queue?.tasks)
    .filter(item => text(item?.issue_type || item?.issueType) === 'recovery_evidence_governance_queue')
    .forEach(item => {
      const sourceMeta = recoveryEvidenceProfileSourceMeta(text(item?.source || item?.sourceMode), text(item?.source_label || item?.sourceLabel))
      events.push({
        source: sourceMeta.source,
        label: sourceMeta.label,
        evidence: text(item?.evidence || arrayValue(item?.failed_evidence || item?.failedEvidence)[0]),
        run_id: run?.id ?? null,
        task_index: taskIndex,
        failed_at: text(run?.created_at || run?.updated_at),
      })
    })
  return events.filter(item => item.source && item.evidence)
}

export function recoveryEvidenceEventTime(value: any) {
  const timestamp = Date.parse(text(value))
  return Number.isFinite(timestamp) ? timestamp : 0
}

export function isRecoveryEvidenceDeepRepairAction(actionKey: string) {
  return actionKey === 'deep_repair_single_brief' || actionKey === 'deep_repair_batch_brief'
}

export function recoveryEvidenceDeepRepairEventsFromTask(task: AnyRecord, run: AnyRecord, taskIndex: number) {
  if (text(task?.issue_type || task?.issueType) !== 'recovery_evidence_governance_queue') return []
  const actionKey = text(task?.action_key || task?.actionKey)
  if (!isRecoveryEvidenceDeepRepairAction(actionKey)) return []
  const sourceMeta = recoveryEvidenceProfileSourceMeta(text(task?.source || task?.sourceMode), text(task?.source_label || task?.sourceLabel))
  const taskStatus = text(task?.task_status || task?.taskStatus)
  const completed = ['resolved', 'closed', 'done', 'passed'].includes(taskStatus)
  const repairedAt = completed
    ? firstText(task?.resolved_at, task?.resolvedAt, task?.completed_at, task?.completedAt, task?.updated_at, task?.updatedAt, run?.completed_at, run?.updated_at, run?.created_at)
    : ''
  const queuedAt = firstText(task?.created_at, task?.createdAt, run?.created_at, run?.updated_at)
  return [{
    source: sourceMeta.source,
    label: sourceMeta.label,
    action_key: actionKey,
    action_label: text(task?.action_label || task?.actionLabel, recoveryEvidenceDeepRepairAction(sourceMeta.source).label),
    deep_repair_level: text(task?.deep_repair_level || task?.deepRepairLevel, 'first_deep_repair'),
    task_status: taskStatus,
    completed,
    run_id: run?.id ?? null,
    task_index: taskIndex,
    repaired_at: repairedAt,
    queued_at: queuedAt,
    event_at: repairedAt || queuedAt,
  }].filter(item => item.source && item.event_at)
}

export function recoveryEvidenceDefaultStrengthenedRepairClosure(label: string, status = 'not_required') {
  const normalizedStatus = status === 'needs_repair' || status === 'pending_recheck' || status === 'converged' || status === 'recurred'
    ? status
    : 'not_required'
  const defaultLabel = normalizedStatus === 'needs_repair'
    ? '待强化深修'
    : normalizedStatus === 'pending_recheck'
      ? '强化深修待复检'
      : normalizedStatus === 'converged'
        ? '强化深修已收敛'
        : normalizedStatus === 'recurred'
          ? '强化深修后仍复发'
          : '无需强化深修'
  const summary = normalizedStatus === 'needs_repair'
    ? `${label}普通深修后仍出现同源放行失败，需要生成强化深修复检。`
    : normalizedStatus === 'pending_recheck'
      ? `${label}强化深修任务已生成，等待执行后复检同源失败是否收敛。`
      : normalizedStatus === 'converged'
        ? `${label}强化深修后暂无新的同源放行后失效，可恢复小批量安全连写并继续观察。`
        : normalizedStatus === 'recurred'
          ? `${label}强化深修后仍出现同源放行失败，继续禁止放宽安全连写。`
          : `${label}尚未触发强化深修。`
  return {
    status: normalizedStatus,
    label: defaultLabel,
    summary,
    latest_repair_run_id: null,
    latest_repair_at: '',
    post_repair_failure_count: 0,
    post_repair_evidence: [],
  }
}

export function recoveryEvidenceDefaultDeepRepairEffect(source: AnyRecord) {
  const label = text(source?.label || source?.source_label || source?.sourceLabel || source?.source, '恢复依据来源')
  return {
    status: 'none',
    label: '未深修',
    summary: `${label}尚未生成深层修复队列。`,
    latest_repair_run_id: null,
    latest_repair_action_label: '',
    latest_repair_at: '',
    post_repair_failure_count: 0,
    post_repair_evidence: [],
    strengthened_repair_closure: recoveryEvidenceDefaultStrengthenedRepairClosure(label),
  }
}

export function buildRecoveryEvidenceStrengthenedRepairClosure(label: string, failures: AnyRecord[], repairs: AnyRecord[]) {
  const completedEscalatedRepairs = repairs
    .filter(event =>
      text(event?.deep_repair_level || event?.deepRepairLevel) === 'escalated_after_recurrence'
      && Boolean(event.completed)
      && recoveryEvidenceEventTime(event.repaired_at) > 0,
    )
    .sort((a, b) => recoveryEvidenceEventTime(b.repaired_at) - recoveryEvidenceEventTime(a.repaired_at))
  const pendingEscalatedRepairs = repairs
    .filter(event =>
      text(event?.deep_repair_level || event?.deepRepairLevel) === 'escalated_after_recurrence'
      && !event.completed,
    )
    .sort((a, b) => recoveryEvidenceEventTime(b.event_at) - recoveryEvidenceEventTime(a.event_at))
  const latestEscalatedRepair = completedEscalatedRepairs[0]

  if (latestEscalatedRepair) {
    const repairTime = recoveryEvidenceEventTime(latestEscalatedRepair.repaired_at)
    const postRepairFailures = failures
      .filter(event => recoveryEvidenceEventTime(event.failed_at) > repairTime)
      .sort((a, b) => recoveryEvidenceEventTime(a.failed_at) - recoveryEvidenceEventTime(b.failed_at))
    if (postRepairFailures.length) {
      return {
        status: 'recurred',
        label: '强化深修后仍复发',
        summary: `${label}最近一次${text(latestEscalatedRepair.action_label, '强化深修')}后又放行失败 ${postRepairFailures.length} 次，不能恢复多章安全连写。`,
        latest_repair_run_id: latestEscalatedRepair.run_id ?? null,
        latest_repair_at: text(latestEscalatedRepair.repaired_at),
        post_repair_failure_count: postRepairFailures.length,
        post_repair_evidence: Array.from(new Set(postRepairFailures.map(event => text(event.evidence)).filter(Boolean))).slice(0, 4),
      }
    }
    return {
      status: 'converged',
      label: '强化深修已收敛',
      summary: `${label}强化深修后暂无新的同源放行后失效，可恢复小批量安全连写并继续观察。`,
      latest_repair_run_id: latestEscalatedRepair.run_id ?? null,
      latest_repair_at: text(latestEscalatedRepair.repaired_at),
      post_repair_failure_count: 0,
      post_repair_evidence: [],
    }
  }

  const pendingEscalatedRepair = pendingEscalatedRepairs[0]
  if (pendingEscalatedRepair) {
    return {
      status: 'pending_recheck',
      label: '强化深修待复检',
      summary: `${label}已有${text(pendingEscalatedRepair.action_label, '强化深修')}任务，等待执行后确认同源失败是否收敛。`,
      latest_repair_run_id: pendingEscalatedRepair.run_id ?? null,
      latest_repair_at: text(pendingEscalatedRepair.event_at),
      post_repair_failure_count: 0,
      post_repair_evidence: [],
    }
  }

  const completedRepairs = repairs.filter(event => Boolean(event.completed) && recoveryEvidenceEventTime(event.repaired_at) > 0)
  const hasRecurrenceAfterRepair = completedRepairs.some(repair => {
    const repairTime = recoveryEvidenceEventTime(repair.repaired_at)
    return failures.some(event => recoveryEvidenceEventTime(event.failed_at) > repairTime)
  })
  if (hasRecurrenceAfterRepair) {
    return recoveryEvidenceDefaultStrengthenedRepairClosure(label, 'needs_repair')
  }

  return recoveryEvidenceDefaultStrengthenedRepairClosure(label)
}

export function buildRecoveryEvidenceDeepRepairEffects(failureEvents: AnyRecord[], deepRepairEvents: AnyRecord[]) {
  const bySource = new Map<string, AnyRecord[]>()
  const repairsBySource = new Map<string, AnyRecord[]>()

  failureEvents.forEach(event => {
    const source = text(event?.source)
    if (!source) return
    bySource.set(source, [...(bySource.get(source) || []), event])
  })
  deepRepairEvents.forEach(event => {
    const source = text(event?.source)
    if (!source) return
    repairsBySource.set(source, [...(repairsBySource.get(source) || []), event])
  })

  const effects = new Map<string, AnyRecord>()
  for (const [source, failures] of bySource.entries()) {
    const label = text(failures[0]?.label || source, '恢复依据来源')
    const repairs = (repairsBySource.get(source) || [])
      .slice()
      .sort((a, b) => recoveryEvidenceEventTime(b.event_at) - recoveryEvidenceEventTime(a.event_at))
    const completedRepairs = repairs
      .filter(event => Boolean(event.completed) && recoveryEvidenceEventTime(event.repaired_at) > 0)
      .sort((a, b) => recoveryEvidenceEventTime(b.repaired_at) - recoveryEvidenceEventTime(a.repaired_at))
    const latestRepair = completedRepairs[0]
    const strengthenedRepairClosure = buildRecoveryEvidenceStrengthenedRepairClosure(label, failures, repairs)

    if (latestRepair) {
      const repairTime = recoveryEvidenceEventTime(latestRepair.repaired_at)
      const postRepairFailures = failures
        .filter(event => recoveryEvidenceEventTime(event.failed_at) > repairTime)
        .sort((a, b) => recoveryEvidenceEventTime(a.failed_at) - recoveryEvidenceEventTime(b.failed_at))
      if (postRepairFailures.length) {
        effects.set(source, {
          status: 'recurred',
          label: '深修后仍失效',
          summary: `${label}最近一次${text(latestRepair.action_label, '深修')}后又放行失败 ${postRepairFailures.length} 次，需要升级任务书修复口径。`,
          latest_repair_run_id: latestRepair.run_id ?? null,
          latest_repair_action_label: text(latestRepair.action_label),
          latest_repair_at: text(latestRepair.repaired_at),
          post_repair_failure_count: postRepairFailures.length,
          post_repair_evidence: Array.from(new Set(postRepairFailures.map(event => text(event.evidence)).filter(Boolean))).slice(0, 4),
          strengthened_repair_closure: strengthenedRepairClosure,
        })
      } else {
        effects.set(source, {
          status: 'observing',
          label: '深修后暂无再失效',
          summary: `${label}最近一次${text(latestRepair.action_label, '深修')}后暂无新的放行后失效，继续观察下一批正文继承。`,
          latest_repair_run_id: latestRepair.run_id ?? null,
          latest_repair_action_label: text(latestRepair.action_label),
          latest_repair_at: text(latestRepair.repaired_at),
          post_repair_failure_count: 0,
          post_repair_evidence: [],
          strengthened_repair_closure: strengthenedRepairClosure,
        })
      }
      continue
    }

    const pendingRepair = repairs[0]
    if (pendingRepair) {
      effects.set(source, {
        status: 'pending',
        label: '深修待复查',
        summary: `${label}已有${text(pendingRepair.action_label, '深修')}任务，等待执行后观察同源是否继续失效。`,
        latest_repair_run_id: pendingRepair.run_id ?? null,
        latest_repair_action_label: text(pendingRepair.action_label),
        latest_repair_at: text(pendingRepair.event_at),
        post_repair_failure_count: 0,
        post_repair_evidence: [],
        strengthened_repair_closure: strengthenedRepairClosure,
      })
    }
  }

  return effects
}

export function buildRecoveryEvidenceSourceRiskProfile(runRecords: AnyRecord[]) {
  const seen = new Set<string>()
  const bySource = new Map<string, AnyRecord>()
  const failureEvents: AnyRecord[] = []
  const deepRepairEvents: AnyRecord[] = []
  runRecords
    .filter(run => text(run?.run_type) === 'longform_production_repair')
    .forEach(run => {
      const output = parsePayload(run?.output_ref, { owner: run, kind: 'run', field: 'output_ref' }) || {}
      const tasks = [
        ...arrayValue(output?.tasks),
        ...arrayValue(output?.repairTasks),
      ]
      tasks.forEach((task, taskIndex) => {
        deepRepairEvents.push(...recoveryEvidenceDeepRepairEventsFromTask(task, run, taskIndex))
        recoveryEvidenceReleaseFailureEventsFromTask(task, run, taskIndex).forEach(event => {
          const eventKey = [event.run_id, event.task_index, event.source, event.evidence].join('|')
          if (seen.has(eventKey)) return
          seen.add(eventKey)
          failureEvents.push(event)
          const current = bySource.get(event.source) || {
            source: event.source,
            label: event.label,
            release_failure_count: 0,
            evidence: [],
            source_run_ids: [],
            latest_failed_at: '',
          }
          current.release_failure_count += 1
          current.evidence = Array.from(new Set([...arrayValue(current.evidence), event.evidence])).slice(0, 6)
          current.source_run_ids = Array.from(new Set([...arrayValue(current.source_run_ids), event.run_id].filter(Boolean))).slice(0, 8)
          current.latest_failed_at = event.failed_at || current.latest_failed_at
          bySource.set(event.source, current)
        })
      })
    })
  const deepRepairEffects = buildRecoveryEvidenceDeepRepairEffects(failureEvents, deepRepairEvents)

  const sources = Array.from(bySource.values())
    .map(source => ({
      ...source,
      deep_repair_effect: deepRepairEffects.get(text(source?.source)) || recoveryEvidenceDefaultDeepRepairEffect(source),
    }))
    .sort((a, b) => Number(b.release_failure_count || 0) - Number(a.release_failure_count || 0))
  const repeatedSources = sources.filter(source => Number(source.release_failure_count || 0) >= 2)
  const unresolvedRepeatedSources = repeatedSources.filter(source =>
    text(source?.deep_repair_effect?.strengthened_repair_closure?.status || source?.deepRepairEffect?.strengthenedRepairClosure?.status) !== 'converged',
  )
  const topUnresolved = unresolvedRepeatedSources[0]
  const topRepeated = topUnresolved || repeatedSources[0]
  const detail = topUnresolved
    ? `${topUnresolved.label}反复放行失败 ${topUnresolved.release_failure_count} 次：${arrayValue(topUnresolved.evidence).slice(0, 2).join('；')}。本轮只允许单章推进，并先复盘更深层创作问题。`
    : topRepeated
      ? `${topRepeated.label}强化深修已收敛，历史 ${topRepeated.release_failure_count} 次放行后失效进入观察；可恢复小批量安全连写。`
    : sources.length
      ? '恢复依据放行后失效来源已有记录，但尚未形成反复失败画像。'
      : '暂无反复放行失败的恢复依据来源。'

  return {
    visible: sources.length > 0,
    status: unresolvedRepeatedSources.length > 0 ? 'warn' as const : 'ok' as const,
    label: '恢复依据画像',
    detail,
    summary: detail,
    source_count: sources.length,
    repeat_source_count: repeatedSources.length,
    total_failure_count: sources.reduce((sum, source) => sum + Number(source.release_failure_count || 0), 0),
    sources,
  }
}

export function recoveryEvidenceDeepRepairDirection(source: string, label: string) {
  if (source === 'single_chapter_governance_recheck') {
    return '深层修复方向：回到单章任务书，确认治理复查证据已经写成正文里的可见冲突、对白动作、读者回报和章末钩子。'
  }
  if (source === 'safe_batch_recovery_recheck') {
    return '深层修复方向：复盘批次任务书，把多章承诺拆回每章冲突职责、回报落点和剧情线推进，再恢复批量连写。'
  }
  if (source === 'review_governance_closure') {
    return '深层修复方向：回到治理复查台，重新确认修后证据、观察项和关闭条件，再让后续正文承接。'
  }
  return `深层修复方向：复查${label || '恢复依据来源'}的关闭条件，把抽象依据改成下一章可执行的事件、选择、代价和回报。`
}

export function normalizeRecoveryEvidenceDeepRepairEffect(effect: AnyRecord | null | undefined, fallbackLabel: string) {
  const status = text(effect?.status)
  const normalizedStatus: AutoCreationRecoveryEvidenceTrendSource['deepRepairEffect']['status'] =
    status === 'pending' || status === 'observing' || status === 'recurred' ? status : 'none'
  const defaultLabel = normalizedStatus === 'recurred'
    ? '深修后仍失效'
    : normalizedStatus === 'observing'
      ? '深修后暂无再失效'
      : normalizedStatus === 'pending'
        ? '深修待复查'
        : '未深修'
  const strengthenedClosure = normalizeRecoveryEvidenceStrengthenedRepairClosure(
    effect?.strengthened_repair_closure || effect?.strengthenedRepairClosure,
    fallbackLabel,
    normalizedStatus,
  )
  return {
    status: normalizedStatus,
    label: text(effect?.label, defaultLabel),
    summary: text(effect?.summary, `${fallbackLabel || '恢复依据来源'}尚未生成深层修复队列。`),
    latestRepairRunId: effect?.latest_repair_run_id ?? effect?.latestRepairRunId ?? null,
    latestRepairActionLabel: text(effect?.latest_repair_action_label || effect?.latestRepairActionLabel),
    latestRepairAt: text(effect?.latest_repair_at || effect?.latestRepairAt),
    postRepairFailureCount: Number(effect?.post_repair_failure_count ?? effect?.postRepairFailureCount ?? 0),
    postRepairEvidence: arrayValue(effect?.post_repair_evidence || effect?.postRepairEvidence).map(item => text(item)).filter(Boolean).slice(0, 4),
    strengthenedClosure,
  }
}

export function normalizeRecoveryEvidenceStrengthenedRepairClosure(
  closure: AnyRecord | null | undefined,
  fallbackLabel: string,
  effectStatus: AutoCreationRecoveryEvidenceTrendSource['deepRepairEffect']['status'],
): AutoCreationRecoveryEvidenceTrendSource['deepRepairEffect']['strengthenedClosure'] {
  const status = text(closure?.status)
  const normalizedStatus: AutoCreationRecoveryEvidenceTrendSource['deepRepairEffect']['strengthenedClosure']['status'] =
    status === 'needs_repair' || status === 'pending_recheck' || status === 'converged' || status === 'recurred'
      ? status
      : effectStatus === 'recurred'
        ? 'needs_repair'
        : 'not_required'
  const defaults = recoveryEvidenceDefaultStrengthenedRepairClosure(fallbackLabel || '恢复依据来源', normalizedStatus)
  return {
    status: normalizedStatus,
    label: text(closure?.label, defaults.label),
    summary: text(closure?.summary, defaults.summary),
    latestRepairRunId: closure?.latest_repair_run_id ?? closure?.latestRepairRunId ?? defaults.latest_repair_run_id,
    latestRepairAt: text(closure?.latest_repair_at || closure?.latestRepairAt || defaults.latest_repair_at),
    postRepairFailureCount: Number(closure?.post_repair_failure_count ?? closure?.postRepairFailureCount ?? defaults.post_repair_failure_count),
    postRepairEvidence: arrayValue(closure?.post_repair_evidence || closure?.postRepairEvidence || defaults.post_repair_evidence).map(item => text(item)).filter(Boolean).slice(0, 4),
  }
}

export function buildRecoveryEvidenceTrend(
  profile: AnyRecord | null | undefined,
  strengthenedAcceptanceTrend: AutoCreationStrengthenedRepairAcceptanceTrend = emptyStrengthenedRepairAcceptanceTrend(),
): AutoCreationRecoveryEvidenceTrend {
  const sources = arrayValue(profile?.sources)
    .map(item => {
      const source = text(item?.source || item?.sourceMode)
      const label = text(item?.label || item?.source_label || item?.sourceLabel || item?.source, '恢复依据来源')
      const releaseFailureCount = Number(item?.release_failure_count || item?.releaseFailureCount || 0)
      const deepRepairEffect = normalizeRecoveryEvidenceDeepRepairEffect(item?.deep_repair_effect || item?.deepRepairEffect, label)
      return {
        source,
        label,
        releaseFailureCount,
        trendLabel: `近${Math.max(1, releaseFailureCount || 1)}轮失败`,
        evidence: arrayValue(item?.evidence).map((entry: any) => text(entry)).filter(Boolean).slice(0, 4),
        sourceRunIds: arrayValue(item?.source_run_ids || item?.sourceRunIds).filter(Boolean).slice(0, 8),
        deepRepairDirection: recoveryEvidenceDeepRepairDirection(source, label),
        deepRepairEffect,
      }
    })
    .filter(item => item.source && item.releaseFailureCount > 0)
    .sort((a, b) => b.releaseFailureCount - a.releaseFailureCount)
  const repeatedSources = sources.filter(item => item.releaseFailureCount >= 2)
  const unresolvedRepeatedSources = repeatedSources.filter(item => item.deepRepairEffect.strengthenedClosure.status !== 'converged')
  const focus = unresolvedRepeatedSources[0] || repeatedSources[0] || sources[0] || null
  const status: AutoCreationBatchGuardrailSignalStatus = unresolvedRepeatedSources.length > 0 || text(profile?.status) === 'warn' && unresolvedRepeatedSources.length > 0
    ? 'warn'
    : 'ok'
  const summary = focus
    ? focus.releaseFailureCount >= 2
      ? focus.deepRepairEffect.strengthenedClosure.status === 'converged'
        ? `${focus.label}强化深修已收敛，可恢复小批量安全连写并继续观察同源继承。`
        : `${focus.label}近${focus.releaseFailureCount}轮放行后失效，任务中心应先处理深层创作修复，再恢复多章安全连写。`
      : `${focus.label}已有放行后失效记录，本轮继续观察来源稳定性。`
    : '暂无恢复依据来源失效趋势。'

  return {
    visible: sources.length > 0,
    status,
    label: '恢复依据画像趋势',
    summary,
    totalFailureCount: Number(profile?.total_failure_count || profile?.totalFailureCount || sources.reduce((sum, item) => sum + item.releaseFailureCount, 0)),
    repeatSourceCount: Number(profile?.repeat_source_count || profile?.repeatSourceCount || repeatedSources.length),
    sources,
    strengthenedAcceptanceTrend,
  }
}

export function recoveryEvidenceDeepRepairAction(source: string) {
  if (source === 'single_chapter_governance_recheck') {
    return { actionKey: 'deep_repair_single_brief', label: '深修单章任务书' }
  }
  if (source === 'safe_batch_recovery_recheck') {
    return { actionKey: 'deep_repair_batch_brief', label: '深修批次任务书' }
  }
  return { actionKey: 'review_governance_closure', label: '治理复查台' }
}

export function buildRecoveryEvidenceDeepRepairQueue(trend: AutoCreationRecoveryEvidenceTrend) {
  const repeatedSources = trend.sources.filter(source => source.releaseFailureCount >= 2)
  const actionableSources = repeatedSources.filter(source =>
    source.deepRepairEffect.status === 'none'
    || (
      source.deepRepairEffect.status === 'recurred'
      && !['pending_recheck', 'converged'].includes(source.deepRepairEffect.strengthenedClosure.status)
    ),
  )
  const tasks = actionableSources.map((source, index) => {
    const action = recoveryEvidenceDeepRepairAction(source.source)
    const escalated = source.deepRepairEffect.status === 'recurred'
    const actionLabel = escalated && action.actionKey === 'deep_repair_single_brief'
      ? '强化单章任务书复盘'
      : escalated && action.actionKey === 'deep_repair_batch_brief'
        ? '强化批次任务书复盘'
        : action.label
    const evidence = source.evidence.length
      ? source.evidence
      : [`${source.label}近${source.releaseFailureCount}轮放行后失效`]
    const executionMeta = recoveryEvidenceGovernanceQueueExecutionMeta({
      source: source.source,
      source_run_ids: source.sourceRunIds,
    }, action.actionKey)

    return {
      issue_type: 'recovery_evidence_governance_queue',
      severity: 'high',
      task_status: 'needs_review',
      source: source.source,
      source_label: source.label,
      source_status: 'repeated_release_failure',
      source_status_label: '反复放行后失效',
      action_key: action.actionKey,
      action_label: actionLabel,
      deep_repair_level: escalated ? 'escalated_after_recurrence' : 'first_deep_repair',
      deep_repair_direction: source.deepRepairDirection,
      deep_repair_effect: source.deepRepairEffect,
      release_failure_count: source.releaseFailureCount,
      trend_label: source.trendLabel,
      source_run_ids: source.sourceRunIds,
      failed_evidence: evidence,
      ...executionMeta,
      title: `${source.label}：${actionLabel}`,
      message: `${source.label}${source.trendLabel}，需要先做深层创作修复，再恢复多章安全连写。`,
      action: escalated
        ? `${source.deepRepairEffect.summary} ${source.deepRepairDirection} 这次需要把任务书修复口径升级到可验收的场景职责。`
        : source.deepRepairDirection,
      recovery_evidence_review: {
        status: 'warn',
        summary: `${source.label}${source.trendLabel}：${evidence.join('；')}`,
        failed_evidence: evidence,
      },
      acceptance_criteria: [
        source.deepRepairDirection,
        '下一轮正文必须可见继承恢复依据，而不是只在审计里声明已处理',
        '恢复依据画像趋势不再出现同来源连续放行后失效',
      ],
      queue_index: index,
    }
  })
  const escalated = tasks.some(task => task.deep_repair_level === 'escalated_after_recurrence')
  const pendingStrengthened = repeatedSources.some(source => source.deepRepairEffect.strengthenedClosure.status === 'pending_recheck')
  const convergedStrengthened = repeatedSources.some(source => source.deepRepairEffect.strengthenedClosure.status === 'converged')

  return {
    source: 'recovery_evidence_source_risk_profile',
    status: tasks.length ? 'needs_followup' : 'ok',
    label: escalated ? '恢复依据画像强化深修' : pendingStrengthened ? '恢复依据画像强化复检' : '恢复依据画像深层修复',
    summary: tasks.length
      ? escalated
        ? `${tasks.length} 类恢复依据来源深修后仍失效，需要升级任务书复盘口径。`
        : `${tasks.length} 类恢复依据来源反复放行后失效，需要先生成深层修复队列。`
      : pendingStrengthened
        ? '强化深修任务已生成，等待复检收敛；暂不重复生成深修队列。'
        : convergedStrengthened
          ? '强化深修已收敛，恢复依据画像进入安全连写观察。'
          : '恢复依据画像来源已进入深修观察或待复查，不重复生成深修队列。',
    source_count: trend.sources.length,
    repeat_source_count: repeatedSources.length,
    total_failure_count: trend.totalFailureCount,
    task_count: tasks.length,
    sources: trend.sources,
    main_action: {
      action: text(tasks[0]?.action_key, 'review_governance_closure'),
      label: text(tasks[0]?.action_label, '治理复查台'),
      source: text(tasks[0]?.source, 'recovery_evidence_source_risk_profile'),
      sourceLabel: text(tasks[0]?.source_label, '恢复依据画像'),
      status: text(tasks[0]?.source_status, 'repeated_release_failure'),
      residualEvidence: arrayValue(tasks[0]?.failed_evidence),
    },
    next_cycle: {
      type: 'recovery_evidence_source_deep_repair',
      label: '恢复依据画像深层修复',
    },
    tasks,
    recommendations: tasks.length
      ? tasks.map(task => `${task.source_label}：${task.deep_repair_direction}`)
      : pendingStrengthened
        ? ['等待强化深修复检回填；复检收敛前只允许单章推进。']
        : ['继续观察恢复依据画像趋势，深修后暂无再失效的来源不重复生成队列。'],
  }
}

export function batchBriefChapterNos(batchBrief: AnyRecord | null | undefined) {
  return new Set(arrayValue(batchBrief?.chapters)
    .map(item => Number(item?.chapter_no ?? item?.chapterNo ?? 0))
    .filter(Boolean))
}

export function batchBriefVisible(batchBrief: AnyRecord | null | undefined) {
  if (!batchBrief) return false
  return Boolean(
    text(batchBrief?.batch_goal || batchBrief?.batchGoal)
    || text(batchBrief?.reader_payoff_plan || batchBrief?.readerPayoffPlan)
    || text(batchBrief?.mainline_focus || batchBrief?.mainlineFocus)
    || text(batchBrief?.forbidden_boundary || batchBrief?.forbiddenBoundary)
    || arrayValue(batchBrief?.start_checklist || batchBrief?.startChecklist).length
    || arrayValue(batchBrief?.chapters).length,
  )
}

export function batchBriefAppliesToItem(batchBrief: AnyRecord | null | undefined, item: AutoCreationBatchReviewItem) {
  if (!batchBriefVisible(batchBrief)) return false
  const plannedNos = batchBriefChapterNos(batchBrief)
  return plannedNos.size === 0 || plannedNos.has(Number(item.chapterNo))
}

export function normalizeBatchBriefChapterPlan(value: any) {
  if (!value) return null
  return {
    chapter_no: Number(value.chapter_no ?? value.chapterNo ?? 0) || null,
    title: firstText(value.title),
    chapter_task: firstText(value.chapter_task, value.chapterTask, value.task),
    conflict: firstText(value.conflict),
    ending_hook: firstText(value.ending_hook, value.endingHook),
    mainline_progress: firstText(value.mainline_progress, value.mainlineProgress),
  }
}

export function buildBatchPlanContext(batchBrief: AnyRecord | null | undefined, item: AutoCreationBatchReviewItem) {
  if (!batchBriefVisible(batchBrief)) return null
  const chapterPlan = arrayValue(batchBrief?.chapters)
    .find(plan => Number(plan?.chapter_no ?? plan?.chapterNo ?? 0) === Number(item.chapterNo))
  return {
    batch_goal: firstText(batchBrief?.batch_goal, batchBrief?.batchGoal),
    reader_payoff_plan: firstText(batchBrief?.reader_payoff_plan, batchBrief?.readerPayoffPlan),
    mainline_focus: firstText(batchBrief?.mainline_focus, batchBrief?.mainlineFocus),
    forbidden_boundary: firstText(batchBrief?.forbidden_boundary, batchBrief?.forbiddenBoundary),
    chapter_plan: normalizeBatchBriefChapterPlan(chapterPlan),
  }
}

export function batchBriefStartChecklist(batchBrief: AnyRecord | null | undefined) {
  return arrayValue(batchBrief?.start_checklist || batchBrief?.startChecklist)
    .map(item => ({
      key: firstText(item?.key, item?.id, item?.type),
      label: firstText(item?.label, item?.name, item?.title, item?.key, '开工项'),
      detail: firstText(item?.detail, item?.summary, item?.description),
      status: firstText(item?.status),
    }))
    .filter(item => item.key || item.label || item.detail)
    .slice(0, 8)
}

export function checklistRiskReasons(key: string, counts: {
  coreRiskTotal: number
  runwayRiskTotal: number
  payoffDebtTotal: number
  readerPullRiskTotal: number
  handoffRiskTotal: number
  storylineRiskTotal: number
  storyDriveRiskTotal: number
  innovationRiskTotal: number
  signatureSceneRiskTotal: number
  chapterAttractionRiskTotal: number
  forbiddenBoundaryRiskTotal: number
  batchPlanRiskTotal: number
}) {
  if (key === 'core_promise') {
    return [
      counts.coreRiskTotal > 0 ? `核心偏移 ${counts.coreRiskTotal}` : '',
      counts.runwayRiskTotal > 0 ? `航线风险 ${counts.runwayRiskTotal}` : '',
    ].filter(Boolean)
  }
  if (key === 'story_drive') {
    return [
      counts.storyDriveRiskTotal > 0 ? `故事力缺口 ${counts.storyDriveRiskTotal}` : '',
      counts.chapterAttractionRiskTotal > 0 ? `吸引力缺口 ${counts.chapterAttractionRiskTotal}` : '',
    ].filter(Boolean)
  }
  if (key === 'reader_payoff') {
    return [
      counts.payoffDebtTotal > 0 ? `回报欠账 ${counts.payoffDebtTotal}` : '',
      counts.readerPullRiskTotal > 0 ? `读者拉力漏项 ${counts.readerPullRiskTotal}` : '',
      counts.handoffRiskTotal > 0 ? `章节交接漏接 ${counts.handoffRiskTotal}` : '',
    ].filter(Boolean)
  }
  if (key === 'innovation') {
    return [
      counts.innovationRiskTotal > 0 ? `创新缺口 ${counts.innovationRiskTotal}` : '',
      counts.signatureSceneRiskTotal > 0 ? `强场面漏写 ${counts.signatureSceneRiskTotal}` : '',
    ].filter(Boolean)
  }
  if (key === 'forbidden_boundary') {
    return [
      counts.forbiddenBoundaryRiskTotal > 0 ? `禁揭触碰 ${counts.forbiddenBoundaryRiskTotal}` : '',
      counts.storylineRiskTotal > 0 ? `剧情线误触/漏推 ${counts.storylineRiskTotal}` : '',
    ].filter(Boolean)
  }
  return counts.batchPlanRiskTotal > 0 ? [`批次计划风险 ${counts.batchPlanRiskTotal}`] : []
}

export function buildBatchChecklistExecution(args: {
  nextBatchBrief?: AnyRecord | null
  counts: {
    coreRiskTotal: number
    runwayRiskTotal: number
    payoffDebtTotal: number
    readerPullRiskTotal: number
    handoffRiskTotal: number
    storylineRiskTotal: number
    storyDriveRiskTotal: number
    innovationRiskTotal: number
    signatureSceneRiskTotal: number
    chapterAttractionRiskTotal: number
    forbiddenBoundaryRiskTotal: number
    batchPlanRiskTotal: number
  }
}): AutoCreationBatchChecklistExecution {
  const checklist = batchBriefStartChecklist(args.nextBatchBrief)
  if (!checklist.length) {
    return {
      visible: false,
      status: 'ok',
      score: 100,
      summary: '本批没有开工清单。',
      items: [],
      missed: [],
    }
  }
  const items: AutoCreationBatchChecklistExecutionItem[] = checklist.map(item => {
    const reasons = checklistRiskReasons(item.key, args.counts)
    const status: AutoCreationBatchRiskStatus = reasons.length > 0 ? 'warn' : 'ok'
    return {
      key: item.key,
      label: item.label,
      status,
      planned: item.detail,
      detail: status === 'warn'
        ? `未完全兑现：${item.detail || item.label}；关联风险：${reasons.join('、')}`
        : `已兑现：${item.detail || item.label}`,
      evidence: reasons,
    }
  })
  const missed = items.filter(item => item.status === 'warn')
  const score = checklist.length > 0 ? clampScore(((items.length - missed.length) / items.length) * 100) : 100
  return {
    visible: true,
    status: missed.length > 0 ? 'warn' : 'ok',
    score,
    summary: missed.length > 0
      ? `批次开工清单 ${items.length - missed.length}/${items.length} 项兑现，${missed.length} 项需要修复。`
      : `批次开工清单 ${items.length}/${items.length} 项兑现。`,
    items,
    missed,
  }
}

export function first30RetentionAppliesToBatch(items: AutoCreationBatchReviewItem[]) {
  return items.some(item => {
    const chapterNo = Number(item.chapterNo || 0)
    return chapterNo > 0 && chapterNo <= 30
  })
}

export function first30RetentionRisk(args: {
  first30Retention?: PlanningWorkspaceModel['first30Retention'] | null
  items: AutoCreationBatchReviewItem[]
}) {
  const retention = args.first30Retention
  const status = text(retention?.status)
  if (!first30RetentionAppliesToBatch(args.items) || !['stale', 'needs_repair', 'blocked'].includes(status)) {
    return {
      count: 0,
      summary: '当前批次不需要前30章留存复诊',
      context: null as AnyRecord | null,
    }
  }
  const risks = arrayValue(retention?.risks)
  const riskyCards = arrayValue(retention?.chapterCards).filter(card => text(card?.riskLevel) && text(card?.riskLevel) !== 'ok')
  const count = Math.max(1, risks.length, riskyCards.length)
  const nextActions = arrayValue(retention?.nextActions).map(action => text(action)).filter(Boolean)
  return {
    count,
    summary: text(retention?.summary, status === 'stale' ? '需重新诊断：前30章内容已更新。' : '前30章留存诊断需要处理。'),
    context: {
      status,
      score: retention?.score ?? null,
      stale: Boolean(retention?.stale),
      summary: text(retention?.summary),
      action_key: text(retention?.actionKey, status === 'stale' ? 'run_first30_retention' : 'create_first30_repair'),
      risks,
      next_actions: nextActions,
      risky_chapters: riskyCards.map(card => ({
        chapter_no: Number(card?.chapterNo ?? card?.chapter_no ?? 0) || null,
        title: text(card?.title),
        score: card?.score ?? null,
        flags: arrayValue(card?.flags).map(flag => text(flag)).filter(Boolean),
        risk_level: text(card?.riskLevel),
      })),
    },
  }
}

export function normalizePostBatchQualityCheck(source: AnyRecord | null | undefined) {
  const raw = source?.post_batch_quality_check || source?.postBatchQualityCheck || source || null
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      visible: false,
      status: 'ok' as AutoCreationBatchRiskStatus,
      source: '',
      warning_count: 0,
      chapter_nos: [] as number[],
      average_score: null as number | null,
      revised_count: 0,
      checks: [] as AnyRecord[],
      summary: '',
    }
  }
  const checks = arrayValue(raw.checks).map((check: AnyRecord) => {
    const status = text(check?.status).toLowerCase()
    const warnCount = Number(check?.warn_count ?? check?.warnCount ?? 0)
    const unknownCount = Number(check?.unknown_count ?? check?.unknownCount ?? 0)
    const warningCount = warnCount > 0 ? warnCount : ['warn', 'warning', 'failed', 'error'].includes(status) ? 1 : 0
    return {
      key: text(check?.key),
      label: text(check?.label || check?.key, '批次质检'),
      status: warningCount > 0 ? 'warn' : unknownCount > 0 || status === 'unknown' ? 'unknown' : status || 'ok',
      checked_count: Number(check?.checked_count ?? check?.checkedCount ?? 0) || 0,
      warn_count: warningCount,
      unknown_count: unknownCount,
      summaries: arrayValue(check?.summaries).map(item => text(item)).filter(Boolean),
    }
  }).filter((check: AnyRecord) => check.key || check.label)
  const warningChecks = checks.filter((check: AnyRecord) => check.warn_count > 0 || ['warn', 'failed', 'error', 'unknown'].includes(text(check.status)))
  const warningCount = warningChecks.reduce((sum: number, check: AnyRecord) => sum + Math.max(1, Number(check.warn_count || 0)), 0)
  const status: AutoCreationBatchRiskStatus = warningCount > 0 || text(raw.status).toLowerCase() === 'warn' ? 'warn' : 'ok'
  const chapterNos = arrayValue(raw.chapter_nos || raw.chapterNos).map(chapterNo => Number(chapterNo)).filter((chapterNo: number) => chapterNo > 0)
  const summaryParts = warningChecks.map((check: AnyRecord) => {
    const detail = arrayValue(check.summaries).slice(0, 1).join('；')
    return detail ? `${check.label}：${detail}` : check.label
  })
  return {
    visible: checks.length > 0 || text(raw.source) || text(raw.status),
    status,
    source: text(raw.source),
    warning_count: warningCount,
    chapter_nos: chapterNos,
    average_score: numberValue(raw.average_score ?? raw.averageScore),
    revised_count: Number(raw.revised_count ?? raw.revisedCount ?? 0) || 0,
    checks: warningChecks,
    summary: summaryParts.slice(0, 3).join('；') || (status === 'warn' ? '批次交稿后质检存在未闭环项。' : '批次交稿后质检通过。'),
  }
}

export function buildResolvedBatchRiskIssueKeys(args: {
  runRecords: AnyRecord[]
  batchCreatedAt: string
  chapters: AnyRecord[]
  reviews: AnyRecord[]
}) {
  const resolvedKeys = new Set<string>()
  const batchCreatedAt = text(args.batchCreatedAt)
  const repairRuns = args.runRecords
    .filter(run => text(run?.run_type) === 'longform_production_repair')
    .map(run => ({
      run,
      input: parsePayload(run?.input_ref, { owner: run, kind: 'run', field: 'input_ref' }) || {},
      output: parsePayload(run?.output_ref, { owner: run, kind: 'run', field: 'output_ref' }) || {},
    }))
    .filter(entry => text(entry.input?.source) === 'auto_creation_safe_batch_risk')
    .filter(entry => !batchCreatedAt || text(entry.input?.batch_created_at) === batchCreatedAt)
    .filter(entry => isCompletedRepairRun(entry.run))

  for (const entry of repairRuns) {
    const runCompletedAt = Date.parse(text(entry.run?.completed_at || entry.run?.finished_at || entry.run?.updated_at || entry.run?.created_at))
    const repairTime = Number.isFinite(runCompletedAt) ? runCompletedAt : recordTime(entry.run)
    const tasks = [
      ...arrayValue(entry.output?.tasks),
      ...arrayValue(entry.output?.repairTasks),
    ]
    for (const task of tasks) {
      if (!isResolvedTaskStatus(task?.task_status ?? task?.status)) continue
      const issueType = repairTaskIssueType(task)
      if (!issueType) continue
      const taskChapterId = task?.chapter_id ?? task?.chapterId ?? null
      const taskChapterNo = Number(task?.chapter_no ?? task?.chapterNo ?? 0)
      const taskResolvedAt = Date.parse(text(task?.resolved_at || task?.updated_at || task?.created_at))
      const resolvedAfter = Number.isFinite(taskResolvedAt) ? Math.max(repairTime, taskResolvedAt) : repairTime
      if (issueType === 'post_batch_quality_warning' && !taskChapterId && !taskChapterNo) {
        const rawQualityCheck = task?.post_batch_quality_check || task?.postBatchQualityCheck || {}
        const targetChapterNos = arrayValue(rawQualityCheck.chapter_nos || rawQualityCheck.chapterNos)
          .map(chapterNo => Number(chapterNo))
          .filter(chapterNo => chapterNo > 0)
        const targetChapters = targetChapterNos
          .map(chapterNo => findChapter(args.chapters, { chapterId: null, chapterNo }))
          .filter(Boolean)
        const allTargetsRechecked = targetChapters.length > 0 && targetChapters.length === targetChapterNos.length && targetChapters.every((chapter: AnyRecord) => {
          const chapterNo = Number(chapter?.chapter_no ?? chapter?.chapterNo ?? 0)
          const latestQuality = latestQualityReviewForChapter(args.reviews, chapter, chapterNo)
          return qualityReviewPassed(latestQuality) && recordTime(latestQuality || {}) > resolvedAfter
        })
        if (allTargetsRechecked) {
          resolvedKeys.add(batchRiskIssueBatchKey(issueType))
          for (const chapter of targetChapters) {
            const chapterNo = Number(chapter?.chapter_no ?? chapter?.chapterNo ?? 0)
            for (const key of batchRiskIssueKeys({ chapterId: chapter?.id ?? chapter?.chapter_id ?? null, chapterNo }, issueType)) {
              resolvedKeys.add(key)
            }
          }
        }
        continue
      }
      const chapter = findChapter(args.chapters, { chapterId: taskChapterId, chapterNo: taskChapterNo })
      if (!chapter) continue
      const chapterNo = Number(chapter?.chapter_no ?? chapter?.chapterNo ?? taskChapterNo)
      const latestQuality = latestQualityReviewForChapter(args.reviews, chapter, chapterNo)
      if (!qualityReviewPassed(latestQuality) || recordTime(latestQuality || {}) <= resolvedAfter) continue
      for (const resolvedIssueType of resolvedBatchRiskIssueTypes(issueType)) {
        for (const key of batchRiskIssueKeys({
          chapterId: chapter?.id ?? chapter?.chapter_id ?? taskChapterId,
          chapterNo,
        }, resolvedIssueType)) {
          resolvedKeys.add(key)
        }
      }
    }
  }

  return resolvedKeys
}

export function buildBatchRiskRadar(args: {
  items: AutoCreationBatchReviewItem[]
  chapters: AnyRecord[]
  reviews: AnyRecord[]
  planning?: PlanningWorkspaceModel | null
  resolvedIssueKeys?: Set<string>
  nextBatchBrief?: AnyRecord | null
  batchPreflight?: AnyRecord | null
  expansionFeedback?: AnyRecord | null
  postBatchQualityCheck?: AnyRecord | null
}): AutoCreationBatchRiskRadar {
  const successfulItems = args.items.filter(item => item.status === 'success')
  const qualityScores = successfulItems
    .map(item => {
      const chapter = findChapter(args.chapters, item)
      const qualityReview = chapter ? latestQualityReviewForChapter(args.reviews, chapter, item.chapterNo) : null
      const quality = qualityPayload(qualityReview)
      return numberValue(quality?.score ?? quality?.overall_score ?? quality?.quality_score ?? item.score)
    })
    .filter((score): score is number => score !== null)
  const averageQualityScore = qualityScores.length
    ? Math.round(qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length)
    : null
  const lowQualityCount = qualityScores.filter(score => score < BATCH_DELIVERY_QUALITY_THRESHOLD).length
  const postBatchQualityCheck = normalizePostBatchQualityCheck(args.postBatchQualityCheck)
  const postBatchQualityResolved = batchRiskIssueResolvedForBatch(args.resolvedIssueKeys, 'post_batch_quality_warning')
    || (successfulItems.length > 0 && batchRiskIssueResolved(args.resolvedIssueKeys, successfulItems[0], 'post_batch_quality_warning'))
  const postBatchQualityRiskTotal = postBatchQualityResolved ? 0 : Number(postBatchQualityCheck.warning_count || 0)

  let coreRiskTotal = 0
  let runwayRiskTotal = 0
  let payoffDebtTotal = 0
  let readerPullRiskTotal = 0
  let readerTrialRiskTotal = 0
  let first30RetentionRiskTotal = 0
  let handoffRiskTotal = 0
  let storylineRiskTotal = 0
  let storyDriveRiskTotal = 0
  let characterArcRiskTotal = 0
  let innovationRiskTotal = 0
  let signatureSceneRiskTotal = 0
  let chapterAttractionRiskTotal = 0
  let chapterBenchmarkRiskTotal = 0
  let styleSampleRiskTotal = 0
  let preDraftExecutionRiskTotal = 0
  let readabilityRiskTotal = 0
  let volumeSegmentRiskTotal = 0
  let forbiddenBoundaryRiskTotal = 0
  const handoffRiskLabels: string[] = []
  const expansionChapterRisks: AnyRecord[] = []
  const serialRhythmReview = buildSerialRhythmReview({
    items: successfulItems,
    chapters: args.chapters,
    nextBatchBrief: args.nextBatchBrief,
  })
  const serialRhythmResolved = successfulItems.length > 0 && batchRiskIssueResolved(args.resolvedIssueKeys, successfulItems[0], 'serial_rhythm_fatigue')
  const serialRhythmRiskTotal = serialRhythmResolved ? 0 : Number(serialRhythmReview.risk_count || 0)
  const assetGrowthReview = buildAssetGrowthReview({
    items: successfulItems,
    chapters: args.chapters,
    reviews: args.reviews,
  })
  const assetGrowthResolved = successfulItems.length > 0 && batchRiskIssueResolved(args.resolvedIssueKeys, successfulItems[0], 'asset_growth_over_budget')
  const assetGrowthRiskTotal = assetGrowthResolved ? 0 : Number(assetGrowthReview.over_budget_count || 0)
  const readerTrialReview = readerTrialBatchReview({
    items: successfulItems,
    review: latestReaderTrialReview(args.reviews),
  })
  const readerTrialRiskItem = successfulItems.find(item => {
    const chapterNo = Number(item.chapterNo || 0)
    return readerTrialReview.drop_points.some(dropPoint => readerTrialAppliesToBatch(dropPoint, new Set([chapterNo])))
  }) || successfulItems.find(item => Number(item.chapterNo || 0) <= 30) || successfulItems[0] || null
  readerTrialRiskTotal = readerTrialRiskItem && !batchRiskIssueResolved(args.resolvedIssueKeys, readerTrialRiskItem, 'reader_trial_drop_point')
    ? Number(readerTrialReview.risk_count || 0)
    : 0
  const first30RetentionRiskReview = first30RetentionRisk({
    first30Retention: args.planning?.first30Retention,
    items: successfulItems,
  })
  const first30RetentionRiskItem = successfulItems.find(item => {
    const chapterNo = Number(item.chapterNo || 0)
    return chapterNo > 0 && chapterNo <= 30
  }) || successfulItems[0] || null
  first30RetentionRiskTotal = first30RetentionRiskItem && !batchRiskIssueResolved(args.resolvedIssueKeys, first30RetentionRiskItem, 'first30_retention_recheck')
    ? Number(first30RetentionRiskReview.count || 0)
    : 0
  let batchPlanRiskTotal = 0
  const repairTasks: AnyRecord[] = []

  for (const item of successfulItems) {
    const chapter = findChapter(args.chapters, item)
    if (!chapter) continue
    const coreReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'chapter_core_drift')
    const runwayReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'runway_sync')
    const payoffReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'reader_payoff_sync')
    const expectationReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'reader_expectation_sync')
    const retentionReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'reader_retention_sync')
    const storylineReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'storyline_sync')
    const storyDriveReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'story_drive_sync')
    const characterArcReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'character_arc_sync')
    const innovationReviewRef = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'innovation_sync')
    const signatureSceneReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'signature_scene_sync')
    const chapterAttractionReviewRef = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'chapter_attraction_review')
    const chapterBenchmarkReviewRef = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'chapter_benchmark_sync')
    const intentConfirmationReviewRef = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'intent_confirmation_sync')
    const benchmarkRecallReviewRef = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'benchmark_recall_sync')
    const styleSampleReviewRef = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'style_sample_sync')
    const readabilityReview = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'readability_review')
    const volumeSegmentReviewRef = latestReviewForChapter(args.reviews, chapter, item.chapterNo, 'volume_beat_sync')
    const qualityReview = latestQualityReviewForChapter(args.reviews, chapter, item.chapterNo)
    const quality = qualityPayload(qualityReview)
    const qualityScore = numberValue(quality?.score ?? quality?.overall_score ?? quality?.quality_score ?? item.score)
    const coreCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'core_drift') ? 0 : coreRiskCount(coreReview)
    const runwayCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'runway_sync_risk') ? 0 : runwayRiskCount(runwayReview)
    const payoffCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'reader_payoff_debt') ? 0 : payoffDebtCount(payoffReview)
    const chapterHandoffReview = buildChapterHandoffReview({ item, expectationReview })
    const handoffResolved = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'chapter_handoff_missed')
    const expectationCount = Math.max(0, expectationRiskCount(expectationReview) - (handoffResolved ? chapterHandoffReview.missed_count : 0))
    const readerPullCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'reader_pull_missed')
      ? 0
      : expectationCount + retentionRiskCount(retentionReview)
    const handoffCount = handoffResolved ? 0 : chapterHandoffReview.missed_count
    const storylineCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'storyline_sync_risk') ? 0 : storylineRiskCount(storylineReview)
    const storylinePayload = riskPayload(storylineReview, 'storyline_sync')
    const forbiddenCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'storyline_sync_risk')
      ? 0
      : arrayValue(storylinePayload?.forbidden_touched || storylinePayload?.forbiddenTouched).length
    const storyDriveCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'story_drive_gap') ? 0 : storyDriveRiskCount(storyDriveReview)
    const characterArcCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'character_arc_gap') ? 0 : characterArcRiskCount(characterArcReview)
    const innovationCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'innovation_execution_missed') ? 0 : innovationRiskCount(innovationReviewRef)
    const signatureSceneCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'signature_scene_missed') ? 0 : signatureSceneRiskCount(signatureSceneReview)
    const chapterAttractionCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'chapter_attraction_gap') ? 0 : chapterAttractionRiskCount(chapterAttractionReviewRef)
    const chapterBenchmarkCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'chapter_benchmark_gap') ? 0 : chapterBenchmarkRiskCount(chapterBenchmarkReviewRef)
    const intentConfirmationCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'intent_confirmation_gap') ? 0 : contractSyncRiskCount(intentConfirmationReviewRef, 'intent_confirmation_sync')
    const benchmarkRecallCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'benchmark_recall_gap') ? 0 : contractSyncRiskCount(benchmarkRecallReviewRef, 'benchmark_recall_sync')
    const styleSampleCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'style_sample_gap') ? 0 : styleSampleRiskCount(styleSampleReviewRef)
    const readabilityCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'readability_risk') ? 0 : readabilityRiskCount(readabilityReview)
    const volumeSegmentCount = batchRiskIssueResolved(args.resolvedIssueKeys, item, 'volume_segment_missed') ? 0 : volumeSegmentRiskCount(volumeSegmentReviewRef)
    const batchPlanCount = batchBriefAppliesToItem(args.nextBatchBrief, item) && !batchRiskIssueResolved(args.resolvedIssueKeys, item, 'batch_brief_mismatch')
      ? coreCount + payoffCount + storylineCount
      : 0
    const lowQuality = qualityScore !== null && qualityScore < BATCH_DELIVERY_QUALITY_THRESHOLD
    expansionChapterRisks.push({
      chapterNo: item.chapterNo,
      title: item.title,
      coreRiskCount: coreCount,
      payoffDebtCount: payoffCount,
      readerPullRiskCount: readerPullCount,
      riskCount: coreCount + payoffCount + readerPullCount,
    })

    coreRiskTotal += coreCount
    runwayRiskTotal += runwayCount
    payoffDebtTotal += payoffCount
    readerPullRiskTotal += readerPullCount
    handoffRiskTotal += handoffCount
    storylineRiskTotal += storylineCount
    forbiddenBoundaryRiskTotal += forbiddenCount
    storyDriveRiskTotal += storyDriveCount
    characterArcRiskTotal += characterArcCount
    innovationRiskTotal += innovationCount
    signatureSceneRiskTotal += signatureSceneCount
    chapterAttractionRiskTotal += chapterAttractionCount
    chapterBenchmarkRiskTotal += chapterBenchmarkCount
    preDraftExecutionRiskTotal += intentConfirmationCount + benchmarkRecallCount
    styleSampleRiskTotal += styleSampleCount
    readabilityRiskTotal += readabilityCount
    volumeSegmentRiskTotal += volumeSegmentCount
    batchPlanRiskTotal += batchPlanCount
    if (handoffCount > 0) {
      handoffRiskLabels.push(...chapterHandoffReview.missed.map((missed: any) => firstText(missed?.label, missed?.text)).filter(Boolean))
    }

    if (lowQuality) {
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'low_quality_score',
        severity: qualityScore !== null && qualityScore < 65 ? 'high' : 'medium',
        message: `批次质检分 ${qualityScore}，低于交稿阈值 78。`,
        action: '生成编辑报告并重修本章节奏、冲突推进、爽点回报和章末钩子。',
        metrics: { quality_score: qualityScore },
      }))
    }
    if (coreCount > 0) {
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'core_drift',
        severity: coreCount >= 2 ? 'high' : 'medium',
        message: `发现 ${coreCount} 项核心偏移风险，本章可能偏离读者承诺或主线推进。`,
        action: '对照章节任务书重修核心冲突、主线推进和章末钩子，避免长篇核心漂移。',
        metrics: { core_risk_count: coreCount },
      }))
    }
    if (runwayCount > 0) {
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'runway_sync_risk',
        severity: runwayCount >= 2 ? 'high' : 'medium',
        message: `百万字航线风险 ${runwayCount} 项，本章可能没有兑现四问、读者燃料或红线约束。`,
        action: '对照百万字航线重修本章四问、读者燃料和红线约束，确认当前章服务长期主线、追读承诺和创新差异。',
        metrics: { runway_risk_count: runwayCount },
      }))
    }
    if (payoffCount > 0) {
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'reader_payoff_debt',
        severity: payoffCount >= 2 ? 'high' : 'medium',
        message: `累计 ${payoffCount} 项读者回报欠账，承诺的爽点或信息回报未兑现。`,
        action: '补写本章应交付的爽点、信息增量或情绪回报，并更新回报债务。',
        metrics: { payoff_debt_count: payoffCount },
      }))
    }
    if (readerPullCount > 0) {
      const readerPullReview = buildReaderPullReview({
        item,
        expectationReview,
        retentionReview,
      })
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'reader_pull_missed',
        severity: readerPullCount >= 2 ? 'high' : 'medium',
        message: `读者期待或追读漏兑现 ${readerPullCount} 项，连续阅读动力不足。`,
        action: '补齐本章承诺的期待兑现、追读问题和下一章动力；让读者清楚知道本章爽点已交付、下一章为什么必须继续看。',
        metrics: { reader_pull_risk_count: readerPullCount },
        readerPullReview,
      }))
    }
    if (handoffCount > 0) {
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'chapter_handoff_missed',
        severity: handoffCount >= 2 ? 'high' : 'medium',
        message: `章节交接漏接 ${handoffCount} 项，开篇没有接住上一章悬念、压力或读者期待。`,
        action: '重修本章开篇300字和第一场景，必须落地上一章交接契约中的压力、悬念、keep_alive问题或显性回报。',
        metrics: { handoff_risk_count: handoffCount },
        chapterHandoffReview,
      }))
    }
    if (storylineCount > 0) {
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'storyline_sync_risk',
        severity: storylineCount >= 2 ? 'high' : 'medium',
        message: `剧情线漏推/误触 ${storylineCount} 项，可能影响后续连续生产。`,
        action: '修正本章剧情线推进、禁揭内容和伏笔回收，复查故事状态同步。',
        metrics: { storyline_risk_count: storylineCount },
      }))
    }
    if (storyDriveCount > 0) {
      const storyDriveSync = buildStoryDriveReview({ item, review: storyDriveReview })
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'story_drive_gap',
        severity: storyDriveCount >= 3 ? 'high' : 'medium',
        message: `故事驱动力缺口 ${storyDriveCount} 项，本章可能只有事件推进，缺少主角主动选择和代价反馈。`,
        action: '补出主角主动选择、明确阻碍、选择代价、局面变化和下一步因果，避免章节只有事件没有人物决策。',
        metrics: { story_drive_risk_count: storyDriveCount },
        storyDriveSync,
      }))
    }
    if (characterArcCount > 0) {
      const characterArcSync = buildCharacterArcReview({ item, review: characterArcReview })
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'character_arc_gap',
        severity: characterArcCount >= 3 ? 'high' : 'medium',
        message: `人物弧光缺口 ${characterArcCount} 项，本章可能只有事件推进但人物欲望、缺陷或关系没有变化。`,
        action: '补出角色欲望、缺陷受压、关系变化、成长节点和口吻锚点。',
        metrics: { character_arc_risk_count: characterArcCount },
        characterArcSync,
      }))
    }
    if (innovationCount > 0) {
      const innovationReview = buildInnovationExecutionReview({
        item,
        review: innovationReviewRef,
      })
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'innovation_execution_missed',
        severity: innovationCount >= 2 ? 'high' : 'medium',
        message: `创新/IP化执行漏兑现 ${innovationCount} 项，本章新鲜感或传播场面不足。`,
        action: '补齐本书差异化机制、反差体验和可视化传播场面；让创新点落成读者能复述的事件，而不是只停留在设定说明。',
        metrics: { innovation_risk_count: innovationCount },
        innovationReview,
      }))
    }
    if (signatureSceneCount > 0) {
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'signature_scene_missed',
        severity: 'high',
        message: `强场面漏写 ${signatureSceneCount} 项，本章开写任务书要求的记忆点没有落成可视化场面。`,
        action: '补回开写任务书指定的标志性场面，把它写成可视化动作、空间冲突、规则代价、公开反转或读者可讨论的选择。',
        metrics: { signature_scene_risk_count: signatureSceneCount },
      }))
    }
    if (chapterAttractionCount > 0) {
      const chapterAttractionReview = buildChapterAttractionReview({ item, review: chapterAttractionReviewRef })
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'chapter_attraction_gap',
        severity: chapterAttractionCount >= 3 ? 'high' : 'medium',
        message: `章节吸引力执行缺口 ${chapterAttractionCount} 项，本章开篇钩子、场景推进、爽点密度、章末翻页或传播场面不足。`,
        action: '按吸引力执行器重修开篇钩子、场景目标/阻碍/转折/回报、爽点密度、章末翻页和可传播场面。',
        metrics: { chapter_attraction_risk_count: chapterAttractionCount },
        chapterAttractionReview,
      }))
    }
    if (chapterBenchmarkCount > 0) {
      const chapterBenchmarkSync = buildChapterBenchmarkReview({ item, review: chapterBenchmarkReviewRef })
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'chapter_benchmark_gap',
        severity: chapterBenchmarkCount >= 3 ? 'high' : 'medium',
        message: `标杆章/质量基准执行缺口 ${chapterBenchmarkCount} 项，本章开篇、冲突、爽点、场景节拍或章末追读没有按基准落地。`,
        action: '按章节标杆重修本章结构：补足开篇钩子、冲突推进、爽点兑现、场景节拍和章末追读；只学习标杆方法，不复制桥段。',
        metrics: { chapter_benchmark_risk_count: chapterBenchmarkCount },
        chapterBenchmarkSync,
      }))
    }
    if (intentConfirmationCount > 0) {
      const intentConfirmationSync = buildContractSyncReview({
        item,
        review: intentConfirmationReviewRef,
        payloadKey: 'intent_confirmation_sync',
        fallbackLabel: '意图确认缺口',
      })
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'intent_confirmation_gap',
        severity: intentConfirmationCount >= 2 ? 'high' : 'medium',
        message: `写前意图确认缺口 ${intentConfirmationCount} 项，本章情绪目标、节奏爆发、结构输入或章尾承接没有统一发力。`,
        action: '按写前意图确认重修本章：校准情绪目标、节奏爆发、逻辑线、出场顺序、代价/收益和章尾承接。',
        metrics: { intent_confirmation_risk_count: intentConfirmationCount },
        intentConfirmationSync,
      }))
    }
    if (benchmarkRecallCount > 0) {
      const benchmarkRecallSync = buildContractSyncReview({
        item,
        review: benchmarkRecallReviewRef,
        payloadKey: 'benchmark_recall_sync',
        fallbackLabel: '文风召回缺口',
      })
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'benchmark_recall_gap',
        severity: benchmarkRecallCount >= 2 ? 'high' : 'medium',
        message: `文风召回执行缺口 ${benchmarkRecallCount} 项，本章没有把对标情绪模块、节奏参照或匹配章技法转成可见写法。`,
        action: '按文风召回重修本章：落实 selected_emotion_module、rhythm_reference、style_profile_summary 和 matched_chapter_techniques，只学抽象方法，不复制桥段原句。',
        metrics: { benchmark_recall_risk_count: benchmarkRecallCount },
        benchmarkRecallSync,
      }))
    }
    if (styleSampleCount > 0) {
      const styleSampleSync = buildStyleSampleReview({ item, review: styleSampleReviewRef })
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'style_sample_gap',
        severity: styleSampleSync.copied_phrases.length > 0 || styleSampleCount >= 3 ? 'high' : 'medium',
        message: `风格样章执行缺口 ${styleSampleCount} 项，本章文气、句式、对白比例或照搬风险需要修复。`,
        action: '按风格样章重修叙述节奏、句式密度、对白比例和角色口吻；只学习抽象方法，不得照搬样章原句。',
        metrics: { style_sample_risk_count: styleSampleCount },
        styleSampleSync,
      }))
    }
    if (readabilityCount > 0) {
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'readability_risk',
        severity: readabilityCount >= 2 ? 'high' : 'medium',
        message: `可读性或网感出戏风险 ${readabilityCount} 项。`,
        action: '重修段落密度、对话节奏、吐槽强度和情绪场景的网感克制。',
        metrics: { readability_risk_count: readabilityCount },
      }))
    }
    if (volumeSegmentCount > 0) {
      const volumeSegmentReview = buildVolumeSegmentReview({
        planning: args.planning,
        item,
        chapter,
        review: volumeSegmentReviewRef,
      })
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'volume_segment_missed',
        severity: volumeSegmentCount >= 2 ? 'high' : 'medium',
        message: `卷级阶段验收漏兑现 ${volumeSegmentCount} 项，本章可能没有结算当前卷目标或阶段身份变化。`,
        action: '对照当前卷目标、阶段冲突和卷级爆点预算重修本章；把漏掉的身份变化、阶段结算、关键入场或阶段回报写成可见结果。',
        metrics: { volume_segment_risk_count: volumeSegmentCount },
        volumeSegmentReview,
      }))
    }
    if (batchPlanCount > 0) {
      const batchPlanContext = buildBatchPlanContext(args.nextBatchBrief, item)
      repairTasks.push(batchRepairTask({
        item,
        issueType: 'batch_brief_mismatch',
        severity: batchPlanCount >= 2 ? 'high' : 'medium',
        message: `本章有 ${batchPlanCount} 项批次任务书兑现风险，可能影响本批连载计划。`,
        action: '对照下一批任务书重修本章职责、读者回报、主线焦点和禁抢跑边界，再重新复盘交稿。',
        metrics: { batch_plan_risk_count: batchPlanCount },
        batchPlanContext,
        batchPlanReview: buildBatchPlanReview({ batchPlanContext, coreReview, payoffReview, storylineReview }),
      }))
    }
  }
  const batchChecklistExecution = buildBatchChecklistExecution({
    nextBatchBrief: args.nextBatchBrief,
    counts: {
      coreRiskTotal,
      runwayRiskTotal,
      payoffDebtTotal,
      readerPullRiskTotal,
      handoffRiskTotal,
      storylineRiskTotal,
      storyDriveRiskTotal,
      innovationRiskTotal,
      signatureSceneRiskTotal,
      chapterAttractionRiskTotal,
      forbiddenBoundaryRiskTotal,
      batchPlanRiskTotal,
    },
  })
  const batchChecklistResolved = successfulItems.length > 0 && batchRiskIssueResolved(args.resolvedIssueKeys, successfulItems[0], 'batch_checklist_mismatch')
  const batchChecklistRiskTotal = batchChecklistResolved ? 0 : batchChecklistExecution.missed.length
  const effectiveBatchChecklistExecution = batchChecklistResolved && batchChecklistExecution.visible
    ? {
      ...batchChecklistExecution,
      status: 'ok' as const,
      score: 100,
      summary: '批次开工清单风险已修复并通过复检。',
      items: batchChecklistExecution.items.map(item => ({ ...item, status: 'ok' as const })),
      missed: [],
    }
    : batchChecklistExecution
  if (batchChecklistRiskTotal > 0 && successfulItems.length > 0) {
    repairTasks.push(batchRepairTask({
      item: successfulItems[0],
      issueType: 'batch_checklist_mismatch',
      severity: batchChecklistRiskTotal >= 3 ? 'high' : 'medium',
      message: `批次开工清单 ${batchChecklistRiskTotal} 项未兑现，连续生产可能偏离万订护栏。`,
      action: '按批次开工清单重修本批：先修核心承诺、故事驱动力、读者回报、创新记忆点和禁写边界，再复查整批交稿。',
      metrics: {
        batch_checklist_risk_count: batchChecklistRiskTotal,
        score: batchChecklistExecution.score,
      },
      batchChecklistExecution,
    }))
  }
  const recoveryEvidenceReview = buildRecoveryEvidenceReview({
    preflight: args.batchPreflight,
    counts: {
      payoffDebtTotal,
      readerPullRiskTotal,
      storylineRiskTotal,
      styleSampleRiskTotal,
      batchPlanRiskTotal,
      batchChecklistRiskTotal,
    },
  })
  const recoveryEvidenceResolved = successfulItems.length > 0 && batchRiskIssueResolved(args.resolvedIssueKeys, successfulItems[0], 'recovery_evidence_mismatch')
  const effectiveRecoveryEvidenceReview = recoveryEvidenceResolved && recoveryEvidenceReview.visible
    ? {
      ...recoveryEvidenceReview,
      status: 'ok' as const,
      failed_evidence: [],
      failed_items: [],
      summary: '恢复放行依据失效风险已修复并通过复检。',
    }
    : recoveryEvidenceReview
  const recoveryEvidenceRiskTotal = effectiveRecoveryEvidenceReview.failed_evidence.length
  if (recoveryEvidenceRiskTotal > 0 && successfulItems.length > 0) {
    const recoveryEvidenceRegovernanceQueue = buildRecoveryEvidenceRegovernanceQueue({
      preflight: args.batchPreflight,
      review: effectiveRecoveryEvidenceReview,
    })
    repairTasks.push(batchRepairTask({
      item: successfulItems[0],
      issueType: 'recovery_evidence_mismatch',
      severity: recoveryEvidenceRiskTotal >= 2 ? 'high' : 'medium',
      message: `恢复放行依据 ${recoveryEvidenceRiskTotal} 项未兑现，上一轮闭环可能没有真正落到正文。`,
      action: '按失效依据回修本批：逐项核对样章执行、读者回报、主线/剧情线和批次任务书，修完后重新运行交稿复盘。',
      metrics: { recovery_evidence_risk_count: recoveryEvidenceRiskTotal },
      recoveryEvidenceReview: effectiveRecoveryEvidenceReview,
      recoveryEvidenceRegovernanceQueue,
    }))
  }
  const strengthenedRepairAcceptanceReview = buildStrengthenedRepairAcceptanceReview({
    preflight: args.batchPreflight,
    counts: {
      coreRiskTotal,
      payoffDebtTotal,
      readerPullRiskTotal,
    },
  })
  const strengthenedRepairAcceptanceResolved = successfulItems.length > 0
    && batchRiskIssueResolved(args.resolvedIssueKeys, successfulItems[0], 'strengthened_repair_acceptance_mismatch')
  const effectiveStrengthenedRepairAcceptanceReview = strengthenedRepairAcceptanceResolved && strengthenedRepairAcceptanceReview.visible
    ? {
      ...strengthenedRepairAcceptanceReview,
      status: 'ok' as const,
      failed_evidence: [],
      risk_count: 0,
      core_risk_count: 0,
      payoff_debt_count: 0,
      reader_pull_risk_count: 0,
      summary: '强化深修恢复验收风险已修复并通过复检。',
    }
    : strengthenedRepairAcceptanceReview
  const strengthenedRepairAcceptanceRiskTotal = effectiveStrengthenedRepairAcceptanceReview.visible
    ? Number(effectiveStrengthenedRepairAcceptanceReview.risk_count || 0)
    : 0
  if (strengthenedRepairAcceptanceRiskTotal > 0 && successfulItems.length > 0) {
    repairTasks.push(batchRepairTask({
      item: successfulItems[0],
      issueType: 'strengthened_repair_acceptance_mismatch',
      severity: effectiveStrengthenedRepairAcceptanceReview.core_risk_count > 0 || strengthenedRepairAcceptanceRiskTotal >= 2 ? 'high' : 'medium',
      message: `强化深修恢复验收未通过，核心守恒、读者回报或追读拉力仍有 ${strengthenedRepairAcceptanceRiskTotal} 项风险。`,
      action: '按强化深修恢复验收重修本批：先校准全书核心承诺，再补齐显性爽点回报和章末追读动力，复查通过前不放宽下一批。',
      metrics: {
        strengthened_repair_acceptance_risk_count: strengthenedRepairAcceptanceRiskTotal,
        core_risk_count: effectiveStrengthenedRepairAcceptanceReview.core_risk_count,
        payoff_debt_count: effectiveStrengthenedRepairAcceptanceReview.payoff_debt_count,
        reader_pull_risk_count: effectiveStrengthenedRepairAcceptanceReview.reader_pull_risk_count,
      },
      strengthenedRepairAcceptanceReview: effectiveStrengthenedRepairAcceptanceReview,
    }))
  }
  const safeBatchExpansionSegmentReview = buildSafeBatchExpansionSegmentReview({
    preflight: args.batchPreflight,
    chapterRisks: expansionChapterRisks,
  })
  const safeBatchExpansionSegmentResolved = safeBatchExpansionSegmentResolvedForItems(
    args.resolvedIssueKeys,
    successfulItems,
    safeBatchExpansionSegmentReview,
  )
  const effectiveSafeBatchExpansionSegmentReview = safeBatchExpansionSegmentResolved && safeBatchExpansionSegmentReview.visible
    ? {
      ...safeBatchExpansionSegmentReview,
      status: 'ok' as const,
      riskCount: 0,
      hotspots: [],
      summary: '5章扩批分段热区已修复并通过复检。',
    }
    : safeBatchExpansionSegmentReview
  const safeBatchExpansionSegmentRiskTotal = effectiveSafeBatchExpansionSegmentReview.visible
    ? Number(effectiveSafeBatchExpansionSegmentReview.riskCount || 0)
    : 0
  const safeBatchExpansionStructureValidationResult = buildSafeBatchExpansionStructureValidationResult({
    preflight: args.batchPreflight,
    chapterRisks: expansionChapterRisks,
    chapters: args.chapters,
  })
  const safeBatchExpansionStructureValidationRiskTotal = safeBatchExpansionStructureValidationResult.visible
    ? Number(safeBatchExpansionStructureValidationResult.risk_count || 0)
    : 0
  const safeBatchExpansionStructureDecisionReview = buildSafeBatchExpansionStructureDecisionExecutionReview({
    nextBatchBrief: args.nextBatchBrief,
    batchPreflight: args.batchPreflight,
    items: successfulItems,
    chapters: args.chapters,
    reviews: args.reviews,
  })
  const safeBatchExpansionStructureDecisionResolved = safeBatchExpansionStructureDecisionReview.visible
    && arrayValue(safeBatchExpansionStructureDecisionReview.failed_items).length > 0
    && arrayValue(safeBatchExpansionStructureDecisionReview.failed_items).every((failed: AnyRecord) => batchRiskIssueResolved(
      args.resolvedIssueKeys,
      { chapterId: failed.chapter_id ?? null, chapterNo: Number(failed.chapter_no || 0) },
      'safe_batch_expansion_structure_decision_mismatch',
    ))
  const effectiveSafeBatchExpansionStructureDecisionReview = safeBatchExpansionStructureDecisionResolved
    ? {
      ...safeBatchExpansionStructureDecisionReview,
      status: 'ok' as const,
      risk_count: 0,
      missed_chapter_nos: [],
      failed_items: [],
      summary: '扩批结构决策执行风险已修复并通过复检。',
    }
    : safeBatchExpansionStructureDecisionReview
  const safeBatchExpansionStructureDecisionRiskTotal = effectiveSafeBatchExpansionStructureDecisionReview.visible
    ? Number(effectiveSafeBatchExpansionStructureDecisionReview.risk_count || 0)
    : 0
  const safeBatchExpansionStructureDecisionDefaultLane = Boolean(
    effectiveSafeBatchExpansionStructureDecisionReview.default_five_chapter_lane_redesign
    || effectiveSafeBatchExpansionStructureDecisionReview.defaultFiveChapterLaneRedesign,
  )
  const safeBatchExpansionStructureValidationTrend = args.expansionFeedback?.expansionStructureValidationTrend
    || args.expansionFeedback?.expansion_structure_validation_trend
    || null
  const defaultLaneTemplateStabilityProfile = args.expansionFeedback?.defaultFiveChapterLaneTemplateStabilityProfile
    || args.expansionFeedback?.default_five_chapter_lane_template_stability_profile
    || null
  if (safeBatchExpansionStructureDecisionRiskTotal > 0 && successfulItems.length > 0) {
    const failedChapterNo = Number(effectiveSafeBatchExpansionStructureDecisionReview.missed_chapter_nos?.[0] || 0)
    const failedItem = successfulItems.find(item => Number(item.chapterNo || 0) === failedChapterNo) || successfulItems[0]
    repairTasks.push(batchRepairTask({
      item: failedItem,
      issueType: 'safe_batch_expansion_structure_decision_mismatch',
      taskType: 'repair_planning',
      severity: safeBatchExpansionStructureDecisionRiskTotal >= 3 || text(effectiveSafeBatchExpansionStructureDecisionReview.recommendation) === 'escalate_structure_redesign' ? 'high' : 'medium',
      message: safeBatchExpansionStructureDecisionDefaultLane
        ? `默认5章档位模板未落地，${safeBatchExpansionStructureDecisionRiskTotal} 项段位职责、冲突轮换、回报密度或章末追读模板缺口会导致恢复判定再次失效。`
        : `扩批结构决策未落地，${safeBatchExpansionStructureDecisionRiskTotal} 项段位职责、观察指标或重构原则缺口会放大扩批复发风险。`,
      action: safeBatchExpansionStructureDecisionDefaultLane
        ? '回到下一批任务书和正文：补齐默认5章档位的段位职责、冲突轮换、回报密度和章末追读模板，再重新回填结构决策执行并运行批次复盘。'
        : '回到下一批任务书和正文：逐章补齐扩批结构决策的段位职责、观察指标和必要的重构原则，再重新运行批次复盘。',
      metrics: {
        safe_batch_expansion_structure_decision_risk_count: safeBatchExpansionStructureDecisionRiskTotal,
        target_chapter_count: effectiveSafeBatchExpansionStructureDecisionReview.target_chapter_count,
        recommendation: effectiveSafeBatchExpansionStructureDecisionReview.recommendation,
      },
      safeBatchExpansionStructureDecisionReview: effectiveSafeBatchExpansionStructureDecisionReview,
    }))
  }
  if (safeBatchExpansionSegmentRiskTotal > 0 && successfulItems.length > 0) {
    const hotspotChapterNo = Number(effectiveSafeBatchExpansionSegmentReview.hotspots?.[0]?.chapterNos?.[0] || 0)
    const hotspotItem = successfulItems.find(item => Number(item.chapterNo || 0) === hotspotChapterNo) || successfulItems[0]
    const expansionStructureReview = buildSafeBatchExpansionStructureReview({
      segmentReview: effectiveSafeBatchExpansionSegmentReview,
      expansionFeedback: args.expansionFeedback,
    })
    if (expansionStructureReview.visible) {
      const repeatedSegment = expansionStructureReview.repeated_hotspot_segment
      const defaultRegression = expansionStructureReview.default_five_chapter_regression || null
      const defaultRecoveryVerdictRelapse = expansionStructureReview.default_five_chapter_recovery_verdict_relapse || null
      const defaultLaneTemplateProductionRelapseQueue = expansionStructureReview.default_five_chapter_lane_template_redesign_queue || null
      const defaultLaneTemplateProductionRelapseVersionId = text(
        defaultLaneTemplateProductionRelapseQueue?.template_version_id
        || defaultLaneTemplateProductionRelapseQueue?.templateVersionId
        || defaultLaneTemplateProductionRelapseQueue?.template_version?.id
        || defaultLaneTemplateProductionRelapseQueue?.templateVersion?.id,
      )
      const expansionStructureReviewWithTrend = {
        ...expansionStructureReview,
        ...(safeBatchExpansionStructureValidationTrend?.visible ? {
          expansion_structure_validation_trend: safeBatchExpansionStructureValidationTrend,
        } : {}),
      }
      repairTasks.push(batchRepairTask({
        item: hotspotItem,
        issueType: 'safe_batch_expansion_structure_repair',
        taskType: 'repair_planning',
        severity: 'high',
        message: defaultRecoveryVerdictRelapse
          ? `默认5章档位恢复判定失效：${text(defaultRecoveryVerdictRelapse.summary, `${repeatedSegment?.label || '扩批段位'}同维复发，需要回到3章验证批。`)}`
          : defaultLaneTemplateProductionRelapseQueue
          ? `默认5章档位模板版本 ${defaultLaneTemplateProductionRelapseVersionId || '当前版本'} 真实生产复发：${text(defaultLaneTemplateProductionRelapseQueue.summary)}`
          : defaultRegression
          ? `默认5章档位失效：${text(defaultRegression.summary, `${repeatedSegment?.label || '扩批段位'}复发，需要改写批次结构。`)}`
          : `${repeatedSegment?.label || '扩批段位'}连续 ${repeatedSegment?.count || 2} 次扩批热区，单修章节不足，需要改写批次结构。`,
        action: defaultRecoveryVerdictRelapse
          ? `恢复判定失效 -> 回到3章验证批：先按${repeatedSegment?.label || '复发段位'}固定段落治理和批次结构改写，逐项重证${arrayValue(defaultRecoveryVerdictRelapse.relapsed_failure_reasons || defaultRecoveryVerdictRelapse.relapsedFailureReasons).map(item => text(item)).filter(Boolean).join('、') || '核心守恒、显性回报和章末追读'}已清零，再恢复默认5章档位。`
          : defaultRegression
          ? `先按${repeatedSegment?.label || '复发段位'}固定段落治理和批次结构改写，下一轮回到3章验证批；验证核心守恒、显性回报和章末追读稳定后，再恢复默认5章档位。`
          : `先做${repeatedSegment?.label || '复发段位'}固定段落治理和批次结构改写，再按 ${expansionStructureReview.rollback_policy?.target_chapter_count || 3} 章以内恢复安全连写。`,
        metrics: {
          safe_batch_expansion_structure_risk_count: safeBatchExpansionSegmentRiskTotal,
          repeated_hotspot_count: repeatedSegment?.count || 0,
          target_chapter_count: effectiveSafeBatchExpansionSegmentReview.targetChapterCount,
          rollback_target_chapter_count: expansionStructureReview.rollback_policy?.target_chapter_count || 3,
          ...(defaultRegression ? { default_five_chapter_regression: 1 } : {}),
          ...(defaultRecoveryVerdictRelapse ? { default_five_chapter_recovery_verdict_relapse: 1 } : {}),
        },
        ...(defaultRegression ? { actionKey: 'restore_default_lane_regression' } : {}),
        safeBatchExpansionStructureReview: expansionStructureReviewWithTrend,
      }))
    } else {
      repairTasks.push(batchRepairTask({
        item: hotspotItem,
        issueType: 'safe_batch_expansion_segment_hotspot',
        severity: effectiveSafeBatchExpansionSegmentReview.rollbackPolicy?.mode === 'rollback_to_single_chapter' ? 'high' : 'medium',
        message: `${effectiveSafeBatchExpansionSegmentReview.label}未通过，${effectiveSafeBatchExpansionSegmentReview.summary}`,
        action: `${effectiveSafeBatchExpansionSegmentReview.rollbackPolicy?.summary || '先按热区章节重修，再缩小下一批安全连写。'}`,
        metrics: {
          safe_batch_expansion_segment_risk_count: safeBatchExpansionSegmentRiskTotal,
          target_chapter_count: effectiveSafeBatchExpansionSegmentReview.targetChapterCount,
          rollback_target_chapter_count: effectiveSafeBatchExpansionSegmentReview.rollbackPolicy?.targetChapterCount || 3,
        },
        safeBatchExpansionSegmentReview: safeBatchExpansionSegmentReviewSnapshot(effectiveSafeBatchExpansionSegmentReview),
      }))
    }
  }
  if (safeBatchExpansionStructureValidationRiskTotal > 0 && successfulItems.length > 0) {
    const failedChapterNo = Number(safeBatchExpansionStructureValidationResult.failed_chapter_nos?.[0] || 0)
    const failedItem = successfulItems.find(item => Number(item.chapterNo || 0) === failedChapterNo) || successfulItems[0]
    const defaultLaneTemplateRepair = buildDefaultFiveChapterLaneTemplateRepair(
      safeBatchExpansionStructureValidationResult.default_five_chapter_lane_template_verdict,
    )
    const defaultLaneTemplateRedesignQueue = buildDefaultFiveChapterLaneTemplateRedesignQueue(
      defaultLaneTemplateStabilityProfile,
    )
    const defaultLaneTemplateRepairSummary = text(defaultLaneTemplateRepair?.repair_summary)
    const defaultLaneTemplateRepairActions = arrayValue(defaultLaneTemplateRepair?.repair_actions)
      .map(item => text(item))
      .filter(Boolean)
    const defaultLaneTemplateRedesignActions = arrayValue(defaultLaneTemplateRedesignQueue?.redesign_requirements)
      .map((item: AnyRecord) => text(item?.instruction))
      .filter(Boolean)
    const rollbackPolicy = safeBatchExpansionRollbackPolicy({
      riskCount: safeBatchExpansionStructureValidationRiskTotal,
      coreRiskCount: Number(safeBatchExpansionStructureValidationResult.core_risk_count || 0),
      hotspotLabel: text(safeBatchExpansionStructureValidationResult.repeated_hotspot_segment?.label),
    })
    const structureReview = {
      visible: true,
      status: 'warn',
      label: '扩批结构修复',
      summary: safeBatchExpansionStructureValidationResult.summary,
      repeated_hotspot_segment: safeBatchExpansionStructureValidationResult.repeated_hotspot_segment || null,
      latest_chapter_nos: safeBatchExpansionStructureValidationResult.validation_chapter_nos,
      affected_chapter_nos: safeBatchExpansionStructureValidationResult.failed_chapter_nos,
      hotspot_summaries: [safeBatchExpansionStructureValidationResult.summary],
      ...(defaultLaneTemplateRepair ? {
        default_five_chapter_lane_template_repair: defaultLaneTemplateRepair,
      } : {}),
      ...(defaultLaneTemplateStabilityProfile ? {
        default_five_chapter_lane_template_stability_profile: defaultLaneTemplateStabilityProfile,
      } : {}),
      ...(defaultLaneTemplateRedesignQueue ? {
        default_five_chapter_lane_template_redesign_queue: defaultLaneTemplateRedesignQueue,
      } : {}),
      structure_actions: [
        ...defaultLaneTemplateRedesignActions,
        ...defaultLaneTemplateRepairActions,
        safeBatchExpansionStructureValidationResult.fixed_segment_role,
        safeBatchExpansionStructureValidationResult.conflict_rotation,
        safeBatchExpansionStructureValidationResult.explicit_payoff,
        safeBatchExpansionStructureValidationResult.ending_hook_requirement,
        ...arrayValue(safeBatchExpansionStructureValidationResult.structure_actions),
      ].map(item => text(item)).filter(Boolean),
      validation_result: safeBatchExpansionStructureValidationResult,
      rollback_policy: {
        mode: rollbackPolicy.mode,
        target_chapter_count: rollbackPolicy.targetChapterCount,
        label: rollbackPolicy.label,
        summary: rollbackPolicy.summary,
      },
      ...(safeBatchExpansionStructureValidationTrend?.visible ? {
        expansion_structure_validation_trend: safeBatchExpansionStructureValidationTrend,
      } : {}),
    }
    repairTasks.push(batchRepairTask({
      item: failedItem,
      issueType: 'safe_batch_expansion_structure_repair',
      taskType: 'repair_planning',
      severity: defaultLaneTemplateRedesignQueue || safeBatchExpansionStructureValidationResult.core_risk_count > 0 || safeBatchExpansionStructureValidationRiskTotal >= 2 ? 'high' : 'medium',
      message: defaultLaneTemplateRedesignQueue
        ? `默认档位模板稳定性画像要求升级重构，${text(defaultLaneTemplateRedesignQueue.summary, defaultLaneTemplateRepairSummary || '同项模板复发')}，不能只做普通结构修复。`
        : defaultLaneTemplateRepair
        ? `默认档位模板回检未通过，${defaultLaneTemplateRepairSummary || `${safeBatchExpansionStructureValidationRiskTotal} 项模板缺口`}会阻止恢复默认5章档位。`
        : `扩批结构验证未通过，验证批仍有 ${safeBatchExpansionStructureValidationRiskTotal} 项核心/回报/追读风险。`,
      action: defaultLaneTemplateRedesignQueue
        ? '升级默认档位模板重构：先重写默认5章档位的段位职责、冲突轮换、回报密度和章末追读模板，再写下一轮验证标准；复验连续2批全过前不恢复默认5章档位。'
        : defaultLaneTemplateRepair
        ? `回到扩批结构任务书：${defaultLaneTemplateRepairSummary}；把缺失模板写成下一轮段位职责、冲突轮换、显性回报密度和章末追读检查项，再用2-3章复验；复验通过前不恢复默认5章档位。`
        : '回到扩批结构任务书：重写验证批段位职责、冲突轮换、显性回报和章末追读，再用2-3章复验；复验通过前不恢复5章扩批。',
      metrics: {
        safe_batch_expansion_structure_validation_risk_count: safeBatchExpansionStructureValidationRiskTotal,
        core_risk_count: safeBatchExpansionStructureValidationResult.core_risk_count,
        payoff_debt_count: safeBatchExpansionStructureValidationResult.payoff_debt_count,
        reader_pull_risk_count: safeBatchExpansionStructureValidationResult.reader_pull_risk_count,
        ...(defaultLaneTemplateRepair ? {
          default_five_chapter_lane_template_missing_count: defaultLaneTemplateRepair.missing_count,
        } : {}),
        ...(defaultLaneTemplateRedesignQueue ? {
          default_five_chapter_lane_template_redesign_queue: 1,
        } : {}),
      },
      safeBatchExpansionStructureReview: structureReview,
      safeBatchExpansionStructureValidationResult,
    }))
  }
  if (serialRhythmRiskTotal > 0 && successfulItems.length > 0) {
    const firstItem = successfulItems[0]
    repairTasks.push(batchRepairTask({
      item: firstItem,
      issueType: 'serial_rhythm_fatigue',
      severity: serialRhythmRiskTotal >= 2 ? 'high' : 'medium',
      message: `本批存在 ${serialRhythmRiskTotal} 项连载节奏同质化，连续阅读容易疲劳。`,
      action: '按批次重修节奏：轮换冲突来源、读者回报、章末追读问题和可视化场面，再复查整批连载读感。',
      metrics: { serial_rhythm_risk_count: serialRhythmRiskTotal, score: serialRhythmReview.score },
      serialRhythmReview,
    }))
  }
  if (assetGrowthRiskTotal > 0 && successfulItems.length > 0) {
    const firstItem = successfulItems[0]
    repairTasks.push(batchRepairTask({
      item: firstItem,
      issueType: 'asset_growth_over_budget',
      taskType: 'repair_assets',
      severity: assetGrowthReview.pending_count >= assetGrowthReview.budget + 4 ? 'high' : 'medium',
      message: `本批发现 ${assetGrowthReview.pending_count} 个新资产，超过预算 ${assetGrowthReview.budget}，存在设定膨胀风险。`,
      action: '进入设定工坊，把本批新资产逐项确认入库、改名、合并已有或标记一次性过场；只保留服务当前卷目标和读者承诺的资产。',
      metrics: {
        asset_growth_risk_count: assetGrowthRiskTotal,
        pending_asset_count: assetGrowthReview.pending_count,
        asset_budget: assetGrowthReview.budget,
      },
      assetGrowthReview,
      actionArea: 'assets',
      actionKey: 'open_story_assets',
    }))
  }
  if (readerTrialRiskTotal > 0 && readerTrialRiskItem) {
    repairTasks.push(batchRepairTask({
      item: readerTrialRiskItem,
      issueType: 'reader_trial_drop_point',
      severity: readerTrialReview.score !== null && readerTrialReview.score < 65 || readerTrialRiskTotal >= 3 ? 'high' : 'medium',
      message: `读者试读复盘发现 ${readerTrialRiskTotal} 个当前批次弃读点，可能影响前30章留存和付费转化。`,
      action: '按试读复盘重修命中章节：删减拖慢阅读的解释，把弃读点改成现场冲突、信息增量、爽点兑现或章末翻页问题。',
      metrics: { reader_trial_risk_count: readerTrialRiskTotal, score: readerTrialReview.score },
      readerTrialReview,
    }))
  }
  if (first30RetentionRiskTotal > 0 && first30RetentionRiskItem) {
    const actionKey = text(first30RetentionRiskReview.context?.action_key, 'run_first30_retention')
    repairTasks.push(batchRepairTask({
      item: first30RetentionRiskItem,
      issueType: 'first30_retention_recheck',
      taskType: actionKey === 'create_first30_repair' ? 'repair_planning' : 'review_planning',
      severity: text(first30RetentionRiskReview.context?.status) === 'blocked' || first30RetentionRiskTotal >= 3 ? 'high' : 'medium',
      message: `前30章留存状态需要处理：${first30RetentionRiskReview.summary}`,
      action: actionKey === 'create_first30_repair'
        ? '生成前30章留存修复任务，优先处理开篇钩子、试读闭环和付费前蓄势。'
        : '重新运行前30章留存诊断，确认本批修改后的开篇三章、试读十章和付费前蓄势。',
      metrics: {
        first30_retention_risk_count: first30RetentionRiskTotal,
        score: first30RetentionRiskReview.context?.score ?? null,
      },
      first30Retention: first30RetentionRiskReview.context,
      actionArea: 'planning',
      actionKey,
    }))
  }
  if (postBatchQualityRiskTotal > 0 && successfulItems.length > 0) {
    repairTasks.push(batchRepairTask({
      item: successfulItems[0],
      issueType: 'post_batch_quality_warning',
      severity: postBatchQualityRiskTotal >= 2 ? 'high' : 'medium',
      message: `oh-story 批次交稿后质检仍有 ${postBatchQualityRiskTotal} 项未闭环：${postBatchQualityCheck.summary}`,
      action: '按批次质检摘要回修本批正文、伏笔增量、正文元信息、细纲兑现和状态机更新；修完后重新运行交稿后质检，所有 warn 清零前不继续扩批。',
      metrics: {
        post_batch_quality_risk_count: postBatchQualityRiskTotal,
        average_score: postBatchQualityCheck.average_score,
        revised_count: postBatchQualityCheck.revised_count,
      },
      postBatchQualityCheck,
    }))
  }

  const signals: AutoCreationBatchRiskSignal[] = [
    {
      key: 'quality',
      label: '质检均分',
      status: lowQualityCount > 0 || averageQualityScore !== null && averageQualityScore < 82 ? 'warn' : 'ok',
      detail: averageQualityScore === null
        ? '暂无批次质检分'
        : `均分 ${averageQualityScore}${lowQualityCount > 0 ? `，低分 ${lowQualityCount} 章` : ''}`,
    },
    ...(postBatchQualityCheck.visible ? [{
      key: 'post_batch_quality' as const,
      label: '批次质检',
      status: postBatchQualityRiskTotal > 0 ? 'warn' as const : 'ok' as const,
      detail: postBatchQualityRiskTotal > 0
        ? `oh-story 交稿后质检未闭环 ${postBatchQualityRiskTotal} 项：${postBatchQualityCheck.summary}`
        : postBatchQualityCheck.summary,
    }] : []),
    {
      key: 'core',
      label: '核心偏移',
      status: coreRiskTotal > 0 ? 'warn' : 'ok',
      detail: coreRiskTotal > 0 ? `发现 ${coreRiskTotal} 项核心偏移风险` : '核心守恒正常',
    },
    {
      key: 'runway',
      label: '航线风险',
      status: runwayRiskTotal > 0 ? 'warn' : 'ok',
      detail: runwayRiskTotal > 0 ? `航线风险 ${runwayRiskTotal} 项，四问、读者燃料或红线约束未闭环` : '百万字航线兑现正常',
    },
    {
      key: 'payoff',
      label: '回报欠账',
      status: payoffDebtTotal > 0 ? 'warn' : 'ok',
      detail: payoffDebtTotal > 0 ? `累计 ${payoffDebtTotal} 项读者回报欠账` : '读者回报已兑现',
    },
    {
      key: 'reader_pull',
      label: '读者拉力',
      status: readerPullRiskTotal > 0 ? 'warn' : 'ok',
      detail: readerPullRiskTotal > 0 ? `读者拉力漏项 ${readerPullRiskTotal} 项，期待兑现或追读钩子不足` : '期待兑现和追读动力正常',
    },
    {
      key: 'reader_trial',
      label: '试读',
      status: readerTrialRiskTotal > 0 ? 'warn' : 'ok',
      detail: readerTrialRiskTotal > 0
        ? `试读弃读点 ${readerTrialRiskTotal} 个：${readerTrialReview.drop_points.slice(0, 2).join('；') || readerTrialReview.summary}`
        : '当前批次未命中试读弃读点',
    },
    {
      key: 'first30_retention',
      label: '前30章',
      status: first30RetentionRiskTotal > 0 ? 'warn' : 'ok',
      detail: first30RetentionRiskTotal > 0
        ? first30RetentionRiskReview.summary
        : '前30章留存诊断未阻塞当前批次',
    },
    {
      key: 'handoff',
      label: '章节交接',
      status: handoffRiskTotal > 0 ? 'warn' : 'ok',
      detail: handoffRiskTotal > 0
        ? `章节交接漏接 ${handoffRiskTotal} 项：${handoffRiskLabels.slice(0, 2).join('、') || '开篇承接未落地'}`
        : '上一章悬念、压力和本章开篇承接正常',
    },
    {
      key: 'storyline',
      label: '剧情线',
      status: storylineRiskTotal > 0 ? 'warn' : 'ok',
      detail: storylineRiskTotal > 0 ? `剧情线漏推/误触 ${storylineRiskTotal} 项` : '剧情线推进正常',
    },
    {
      key: 'story_drive',
      label: '故事力',
      status: storyDriveRiskTotal > 0 ? 'warn' : 'ok',
      detail: storyDriveRiskTotal > 0 ? `故事驱动力缺口 ${storyDriveRiskTotal} 项，主角选择、代价或状态变化不足` : '主角选择链和因果推进正常',
    },
    {
      key: 'character_arc',
      label: '人物弧光',
      status: characterArcRiskTotal > 0 ? 'warn' : 'ok',
      detail: characterArcRiskTotal > 0 ? `人物弧光缺口 ${characterArcRiskTotal} 项，欲望、缺陷、关系或成长节点不足` : '人物成长和关系变化正常',
    },
    {
      key: 'innovation',
      label: '创新/IP',
      status: innovationRiskTotal > 0 ? 'warn' : 'ok',
      detail: innovationRiskTotal > 0 ? `创新/IP化执行缺口 ${innovationRiskTotal} 项` : '创新点和可传播场面执行正常',
    },
    {
      key: 'signature_scene',
      label: '强场面',
      status: signatureSceneRiskTotal > 0 ? 'warn' : 'ok',
      detail: signatureSceneRiskTotal > 0 ? `强场面漏写 ${signatureSceneRiskTotal} 项，章节记忆点或短剧化场面不足` : '标志性场面兑现正常',
    },
    {
      key: 'chapter_attraction',
      label: '吸引力',
      status: chapterAttractionRiskTotal > 0 ? 'warn' : 'ok',
      detail: chapterAttractionRiskTotal > 0 ? `章节吸引力缺口 ${chapterAttractionRiskTotal} 项，开篇、场景推进、爽点或章末翻页需修复` : '章节吸引力执行正常',
    },
    {
      key: 'chapter_benchmark',
      label: '标杆章',
      status: chapterBenchmarkRiskTotal > 0 ? 'warn' : 'ok',
      detail: chapterBenchmarkRiskTotal > 0 ? `标杆章/质量基准缺口 ${chapterBenchmarkRiskTotal} 项，开篇、冲突、爽点、节拍或章末追读需修复` : '章节标杆结构执行正常',
    },
    {
      key: 'style_sample',
      label: '风格',
      status: styleSampleRiskTotal > 0 ? 'warn' : 'ok',
      detail: styleSampleRiskTotal > 0 ? `风格样章执行缺口 ${styleSampleRiskTotal} 项，文气、句式、对白比例或照搬风险需修复` : '风格样章执行正常',
    },
    {
      key: 'pre_draft_execution',
      label: '写前执行',
      status: preDraftExecutionRiskTotal > 0 ? 'warn' : 'ok',
      detail: preDraftExecutionRiskTotal > 0 ? `写前执行缺口 ${preDraftExecutionRiskTotal} 项，意图确认、对标模块、节奏参照或文风召回没有落到正文` : '写前意图和对标召回执行正常',
    },
    {
      key: 'readability',
      label: '可读性',
      status: readabilityRiskTotal > 0 ? 'warn' : 'ok',
      detail: readabilityRiskTotal > 0 ? `可读性/出戏风险 ${readabilityRiskTotal} 项` : '可读性风险可控',
    },
    {
      key: 'serial_rhythm',
      label: '连载节奏',
      status: serialRhythmRiskTotal > 0 ? 'warn' : 'ok',
      detail: serialRhythmRiskTotal > 0
        ? `连载节奏同质化 ${serialRhythmRiskTotal} 项：${serialRhythmReview.dimensions.map((item: any) => item.label).join('、')}`
        : '冲突来源、读者回报和章末钩子轮换正常',
    },
    {
      key: 'asset_growth',
      label: '新资产',
      status: assetGrowthRiskTotal > 0 ? 'warn' : 'ok',
      detail: assetGrowthRiskTotal > 0
        ? `新资产待确认 ${assetGrowthReview.pending_count} 个，超过本批预算 ${assetGrowthReview.budget} 个`
        : assetGrowthReview.summary,
    },
    {
      key: 'volume_segment',
      label: '卷段验收',
      status: volumeSegmentRiskTotal > 0 ? 'warn' : 'ok',
      detail: volumeSegmentRiskTotal > 0
        ? `阶段验收漏兑现 ${volumeSegmentRiskTotal} 项，当前批次不能直接放行下一批`
        : '当前卷/阶段目标未发现漏结算风险',
    },
  ]
  if (batchBriefVisible(args.nextBatchBrief)) {
    signals.push({
      key: 'batch_plan',
      label: '连载计划',
      status: batchPlanRiskTotal > 0 ? 'warn' : 'ok',
      detail: batchPlanRiskTotal > 0 ? `连载计划兑现风险 ${batchPlanRiskTotal} 项` : '本批连载计划无明显漏项',
    })
  }
  if (effectiveBatchChecklistExecution.visible) {
    signals.push({
      key: 'batch_checklist',
      label: '开工清单',
      status: batchChecklistRiskTotal > 0 ? 'warn' : 'ok',
      detail: batchChecklistRiskTotal > 0
        ? `批次开工清单 ${batchChecklistRiskTotal} 项未兑现，兑现分 ${effectiveBatchChecklistExecution.score}`
        : `批次开工清单兑现分 ${effectiveBatchChecklistExecution.score}`,
    })
  }
  if (effectiveRecoveryEvidenceReview.visible) {
    signals.push({
      key: 'recovery_evidence',
      label: '恢复依据',
      status: recoveryEvidenceRiskTotal > 0 ? 'warn' : 'ok',
      detail: effectiveRecoveryEvidenceReview.summary,
    })
  }
  if (effectiveStrengthenedRepairAcceptanceReview.visible) {
    signals.push({
      key: 'strengthened_repair_acceptance',
      label: '强化复盘',
      status: strengthenedRepairAcceptanceRiskTotal > 0 ? 'warn' : 'ok',
      detail: effectiveStrengthenedRepairAcceptanceReview.summary,
    })
  }
  if (effectiveSafeBatchExpansionSegmentReview.visible) {
    signals.push({
      key: 'batch_expansion_segment',
      label: '扩批分段',
      status: safeBatchExpansionSegmentRiskTotal > 0 ? 'warn' : 'ok',
      detail: effectiveSafeBatchExpansionSegmentReview.summary,
    })
  }
  if (safeBatchExpansionStructureValidationResult.visible) {
    signals.push({
      key: 'batch_expansion_structure',
      label: '扩批结构',
      status: safeBatchExpansionStructureValidationRiskTotal > 0 ? 'warn' : 'ok',
      detail: safeBatchExpansionStructureValidationResult.summary,
    })
  }
  if (effectiveSafeBatchExpansionStructureDecisionReview.visible) {
    signals.push({
      key: 'batch_expansion_structure_decision',
      label: '扩批结构决策',
      status: safeBatchExpansionStructureDecisionRiskTotal > 0 ? 'warn' : 'ok',
      detail: effectiveSafeBatchExpansionStructureDecisionReview.summary,
    })
  }
  const status: AutoCreationBatchRiskStatus = signals.some(signal => signal.status === 'warn') ? 'warn' : 'ok'

  return {
    status,
    averageQualityScore,
    lowQualityCount,
    postBatchQualityRiskCount: postBatchQualityRiskTotal,
    coreRiskCount: coreRiskTotal,
    runwayRiskCount: runwayRiskTotal,
    payoffDebtCount: payoffDebtTotal,
    readerPullRiskCount: readerPullRiskTotal,
    readerTrialRiskCount: readerTrialRiskTotal,
    first30RetentionRiskCount: first30RetentionRiskTotal,
    handoffRiskCount: handoffRiskTotal,
    storylineRiskCount: storylineRiskTotal,
    storyDriveRiskCount: storyDriveRiskTotal,
    characterArcRiskCount: characterArcRiskTotal,
    innovationRiskCount: innovationRiskTotal,
    signatureSceneRiskCount: signatureSceneRiskTotal,
    chapterAttractionRiskCount: chapterAttractionRiskTotal,
    chapterBenchmarkRiskCount: chapterBenchmarkRiskTotal,
    styleSampleRiskCount: styleSampleRiskTotal,
    preDraftExecutionRiskCount: preDraftExecutionRiskTotal,
    readabilityRiskCount: readabilityRiskTotal,
    serialRhythmRiskCount: serialRhythmRiskTotal,
    assetGrowthRiskCount: assetGrowthRiskTotal,
    volumeSegmentRiskCount: volumeSegmentRiskTotal,
    batchPlanRiskCount: batchPlanRiskTotal,
    batchChecklistRiskCount: batchChecklistRiskTotal,
    recoveryEvidenceRiskCount: recoveryEvidenceRiskTotal,
    strengthenedRepairAcceptanceRiskCount: strengthenedRepairAcceptanceRiskTotal,
    safeBatchExpansionSegmentRiskCount: safeBatchExpansionSegmentRiskTotal,
    safeBatchExpansionSegmentReview: effectiveSafeBatchExpansionSegmentReview,
    safeBatchExpansionStructureValidationRiskCount: safeBatchExpansionStructureValidationRiskTotal,
    safeBatchExpansionStructureValidationResult,
    safeBatchExpansionStructureDecisionRiskCount: safeBatchExpansionStructureDecisionRiskTotal,
    safeBatchExpansionStructureDecisionReview: effectiveSafeBatchExpansionStructureDecisionReview,
    checklistExecution: effectiveBatchChecklistExecution,
    signals,
    repairTasks: repairTasks.slice(0, 40),
  }
}

export function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function buildBatchCompletionDashboard(args: {
  status: AutoCreationBatchReviewStatus
  total: number
  success: number
  failed: number
  delivered: number
  riskRadar: AutoCreationBatchRiskRadar
  nextAction: AutoCreationDirectorAction
}): AutoCreationBatchCompletionDashboard {
  if (args.status === 'empty') {
    return {
      visible: false,
      status: 'empty',
      score: 0,
      label: '暂无批次',
      summary: '还没有安全连写批次。',
      nextAction: args.nextAction,
      metrics: [],
    }
  }

  const total = Math.max(0, Number(args.total || 0))
  const success = Math.max(0, Number(args.success || 0))
  const failed = Math.max(0, Number(args.failed || 0))
  const delivered = Math.max(0, Number(args.delivered || 0))
  const generationScore = total > 0 ? clampScore((success / total) * 100) : 0
  const deliveryScore = success > 0 ? clampScore((delivered / success) * 100) : 0
  const qualityScore = args.riskRadar.averageQualityScore !== null
    ? clampScore(args.riskRadar.averageQualityScore)
    : success > 0 ? 72 : 0
  const planPenalty = failed * 25
    + args.riskRadar.repairTasks.length * 20
    + args.riskRadar.postBatchQualityRiskCount * 10
    + args.riskRadar.coreRiskCount * 10
    + args.riskRadar.runwayRiskCount * 9
    + args.riskRadar.payoffDebtCount * 5
    + args.riskRadar.readerPullRiskCount * 8
    + args.riskRadar.readerTrialRiskCount * 9
    + args.riskRadar.first30RetentionRiskCount * 15
    + args.riskRadar.handoffRiskCount * 10
    + args.riskRadar.storylineRiskCount * 5
    + args.riskRadar.storyDriveRiskCount * 8
    + args.riskRadar.characterArcRiskCount * 7
    + args.riskRadar.innovationRiskCount * 8
    + args.riskRadar.signatureSceneRiskCount * 10
    + args.riskRadar.chapterAttractionRiskCount * 8
    + args.riskRadar.chapterBenchmarkRiskCount * 7
    + args.riskRadar.styleSampleRiskCount * 6
    + args.riskRadar.readabilityRiskCount * 5
    + args.riskRadar.serialRhythmRiskCount * 8
    + args.riskRadar.assetGrowthRiskCount * 6
    + args.riskRadar.volumeSegmentRiskCount * 10
    + args.riskRadar.batchPlanRiskCount * 10
    + args.riskRadar.batchChecklistRiskCount * 8
    + args.riskRadar.recoveryEvidenceRiskCount * 10
    + args.riskRadar.strengthenedRepairAcceptanceRiskCount * 12
    + args.riskRadar.safeBatchExpansionSegmentRiskCount * 10
    + args.riskRadar.safeBatchExpansionStructureValidationRiskCount * 12
    + args.riskRadar.safeBatchExpansionStructureDecisionRiskCount * 12
  const planScore = clampScore(100 - planPenalty)
  const checklistScore = args.riskRadar.checklistExecution.visible ? args.riskRadar.checklistExecution.score : 100
  const recoveryEvidenceSignal = args.riskRadar.signals.find(signal => signal.key === 'recovery_evidence')
  const recoveryEvidenceClosed = Boolean(recoveryEvidenceSignal && recoveryEvidenceSignal.status === 'ok')
  const strengthenedRepairAcceptanceSignal = args.riskRadar.signals.find(signal => signal.key === 'strengthened_repair_acceptance')
  const strengthenedRepairAccepted = Boolean(strengthenedRepairAcceptanceSignal && strengthenedRepairAcceptanceSignal.status === 'ok')
  const score = args.riskRadar.checklistExecution.visible
    ? clampScore(generationScore * 0.28 + deliveryScore * 0.23 + qualityScore * 0.24 + planScore * 0.17 + checklistScore * 0.08)
    : clampScore(generationScore * 0.3 + deliveryScore * 0.25 + qualityScore * 0.25 + planScore * 0.2)
  const completionStatus: AutoCreationBatchCompletionStatus = args.status === 'warn' || args.status === 'risk'
    ? 'needs_repair'
    : args.status === 'done'
      ? 'ready_next'
      : 'in_progress'

  const metrics: AutoCreationBatchCompletionMetric[] = [
    {
      key: 'generation',
      label: '生成完成',
      value: success,
      target: total,
      status: failed > 0 ? 'block' : total > 0 && success >= total ? 'ok' : 'warn',
      detail: failed > 0 ? `${failed} 章失败，先去任务中心处理。` : total > 0 ? `${success}/${total} 章已生成。` : '暂无批次章节。',
    },
    {
      key: 'delivery',
      label: '交稿完成',
      value: delivered,
      target: success,
      status: success > 0 && delivered >= success ? 'ok' : failed > 0 ? 'warn' : 'warn',
      detail: success > 0 ? `${delivered}/${success} 章完成质检、修订和状态回填。` : '还没有成功生成的章节可交稿。',
    },
    {
      key: 'quality',
      label: '质检健康',
      value: qualityScore,
      target: 100,
      status: args.riskRadar.status === 'warn' || args.riskRadar.lowQualityCount > 0 ? 'warn' : qualityScore >= 82 ? 'ok' : 'warn',
      detail: args.riskRadar.averageQualityScore === null
        ? '暂无批次质检均分。'
        : `批次均分 ${args.riskRadar.averageQualityScore}${args.riskRadar.lowQualityCount > 0 ? `，低分 ${args.riskRadar.lowQualityCount} 章` : ''}。`,
    },
    {
      key: 'plan',
      label: '计划兑现',
      value: planScore,
      target: 100,
      status: failed > 0 ? 'block' : args.riskRadar.repairTasks.length > 0 || args.riskRadar.batchPlanRiskCount > 0 ? 'warn' : 'ok',
      detail: args.riskRadar.repairTasks.length > 0
        ? `待处理 ${args.riskRadar.repairTasks.length} 个批次风险。`
        : '本批读者回报、剧情线和连载计划未发现阻塞风险。',
    },
    ...(recoveryEvidenceSignal ? [{
      key: 'recovery_evidence',
      label: '恢复依据',
      value: recoveryEvidenceClosed ? 100 : 100 - args.riskRadar.recoveryEvidenceRiskCount,
      target: 100,
      status: args.riskRadar.recoveryEvidenceRiskCount > 0 ? 'warn' : 'ok',
      detail: args.riskRadar.recoveryEvidenceRiskCount > 0
        ? recoveryEvidenceSignal.detail
        : `恢复依据已闭环：${recoveryEvidenceSignal.detail}`,
    } as AutoCreationBatchCompletionMetric] : []),
    ...(strengthenedRepairAcceptanceSignal ? [{
      key: 'strengthened_repair_acceptance',
      label: '强化复盘',
      value: strengthenedRepairAccepted ? 100 : Math.max(0, 100 - args.riskRadar.strengthenedRepairAcceptanceRiskCount * 20),
      target: 100,
      status: args.riskRadar.strengthenedRepairAcceptanceRiskCount > 0 ? 'warn' : 'ok',
      detail: strengthenedRepairAcceptanceSignal.detail,
    } as AutoCreationBatchCompletionMetric] : []),
    ...(args.riskRadar.checklistExecution.visible ? [{
      key: 'checklist',
      label: '开工清单',
      value: checklistScore,
      target: 100,
      status: args.riskRadar.batchChecklistRiskCount > 0 ? 'warn' : 'ok',
      detail: args.riskRadar.checklistExecution.visible
        ? args.riskRadar.checklistExecution.summary
        : '本批没有单独开工清单。',
    } as AutoCreationBatchCompletionMetric] : []),
  ]

  return {
    visible: true,
    status: completionStatus,
    score,
    label: completionStatus === 'ready_next' ? '可开下一批' : completionStatus === 'needs_repair' ? '待修复' : '交稿中',
    summary: completionStatus === 'ready_next'
      ? `本批生成、交稿和复盘已闭环${recoveryEvidenceClosed ? '，恢复依据已闭环' : ''}${strengthenedRepairAccepted ? '，强化深修恢复验收已通过' : ''}，可以按护栏开启下一批。`
      : completionStatus === 'needs_repair'
        ? failed > 0
          ? '批次生成存在失败章节，先处理失败和风险再继续。'
          : '批次已交付但存在质量或计划风险，先修复再开启下一批。'
        : '本批已生成，继续逐章质检、修订和故事状态回填。',
    nextAction: args.nextAction,
    metrics,
  }
}

export function batchRiskLabels(riskRadar: AutoCreationBatchRiskRadar) {
  return [
    riskRadar.lowQualityCount > 0 ? '质检低分' : '',
    riskRadar.coreRiskCount > 0 ? '核心偏移' : '',
    riskRadar.runwayRiskCount > 0 ? '航线风险' : '',
    riskRadar.payoffDebtCount > 0 ? '回报欠账' : '',
    riskRadar.readerPullRiskCount > 0 ? '读者拉力' : '',
    riskRadar.readerTrialRiskCount > 0 ? '试读' : '',
    riskRadar.first30RetentionRiskCount > 0 ? '前30章' : '',
    riskRadar.handoffRiskCount > 0 ? '章节交接' : '',
    riskRadar.storylineRiskCount > 0 ? '剧情线' : '',
    riskRadar.storyDriveRiskCount > 0 ? '故事力' : '',
    riskRadar.characterArcRiskCount > 0 ? '人物弧光' : '',
    riskRadar.innovationRiskCount > 0 ? '创新/IP' : '',
    riskRadar.signatureSceneRiskCount > 0 ? '强场面' : '',
    riskRadar.chapterAttractionRiskCount > 0 ? '吸引力' : '',
    riskRadar.chapterBenchmarkRiskCount > 0 ? '标杆章' : '',
    riskRadar.styleSampleRiskCount > 0 ? '风格' : '',
    riskRadar.preDraftExecutionRiskCount > 0 ? '写前执行' : '',
    riskRadar.readabilityRiskCount > 0 ? '可读性' : '',
    riskRadar.serialRhythmRiskCount > 0 ? '连载节奏' : '',
    riskRadar.assetGrowthRiskCount > 0 ? '新资产' : '',
    riskRadar.volumeSegmentRiskCount > 0 ? '卷级阶段' : '',
    riskRadar.batchPlanRiskCount > 0 ? '批次计划' : '',
    riskRadar.batchChecklistRiskCount > 0 ? '开工清单' : '',
    riskRadar.recoveryEvidenceRiskCount > 0 ? '恢复依据' : '',
    riskRadar.strengthenedRepairAcceptanceRiskCount > 0 ? '强化复盘' : '',
    riskRadar.safeBatchExpansionSegmentRiskCount > 0 ? '扩批分段' : '',
    riskRadar.safeBatchExpansionStructureValidationRiskCount > 0 ? '扩批结构' : '',
    riskRadar.safeBatchExpansionStructureDecisionRiskCount > 0 ? '扩批结构决策' : '',
  ].filter(Boolean)
}

export function buildBatchHandoff(args: {
  status: AutoCreationBatchReviewStatus
  total: number
  success: number
  failed: number
  delivered: number
  items: AutoCreationBatchReviewItem[]
  riskRadar: AutoCreationBatchRiskRadar
  nextAction: AutoCreationDirectorAction
  releaseEvidence?: string[]
}): AutoCreationBatchHandoff {
  if (args.status === 'empty') {
    return {
      visible: false,
      status: 'empty',
      label: '暂无批次',
      summary: '还没有安全连写批次。',
      action: args.nextAction,
      targetChapterNos: [],
      riskLabels: [],
      evidence: [],
    }
  }

  const failedChapters = args.items.filter(item => item.status === 'failed').map(item => item.chapterNo).filter(Boolean)
  const pendingDeliveryChapters = args.items
    .filter(item => item.status === 'success' && !item.delivered)
    .map(item => item.chapterNo)
    .filter(Boolean)
  const riskChapters = Array.from(new Set(args.riskRadar.repairTasks
    .map((task: any) => Number(task?.chapter_no ?? task?.chapterNo ?? 0))
    .filter(Boolean)))
  const riskLabels = batchRiskLabels(args.riskRadar)
  const recoveryEvidenceSignal = args.riskRadar.signals.find(signal => signal.key === 'recovery_evidence')
  const closedRecoveryEvidence = recoveryEvidenceSignal?.status === 'ok' ? '恢复依据已闭环' : ''
  const strengthenedRepairAcceptanceSignal = args.riskRadar.signals.find(signal => signal.key === 'strengthened_repair_acceptance')
  const closedStrengthenedRepairAcceptance = strengthenedRepairAcceptanceSignal?.status === 'ok' ? '强化深修恢复验收已通过' : ''
  const structureValidationSignal = args.riskRadar.signals.find(signal => signal.key === 'batch_expansion_structure')
  const closedStructureValidation = structureValidationSignal?.status === 'ok' ? text(structureValidationSignal.detail) : ''
  const releaseEvidence = Array.from(new Set([
    ...arrayValue(args.releaseEvidence).map(item => text(item)).filter(Boolean),
    closedRecoveryEvidence,
    closedStrengthenedRepairAcceptance,
    closedStructureValidation,
  ].filter(Boolean)))

  if (args.status === 'warn') {
    return {
      visible: true,
      status: 'failed',
      label: '先处理失败章节',
      summary: `本批 ${args.success}/${args.total} 章生成成功，失败章节需要先去任务中心处理，避免跳过断点继续写后文。`,
      action: args.nextAction,
      targetChapterNos: failedChapters,
      riskLabels: [],
      evidence: failedChapters.map(no => `第${no}章生成失败`),
    }
  }

  if (args.status === 'risk') {
    return {
      visible: true,
      status: 'repair_risks',
      label: '修复批次风险',
      summary: `本批 ${args.delivered}/${args.total} 章已交稿，但仍有${riskLabels.length ? ` ${riskLabels.join('、')}` : '质量或计划'}风险；先修复再放行下一批。`,
      action: args.nextAction,
      targetChapterNos: riskChapters,
      riskLabels,
      evidence: args.riskRadar.signals.filter(signal => signal.status === 'warn').map(signal => signal.detail).slice(0, 4),
    }
  }

  if (args.status === 'done') {
    return {
      visible: true,
      status: 'continue_batch',
      label: '放行下一批',
      summary: `本批 ${args.delivered}/${args.total} 章已完成生成、质检、修订和故事状态回填，可以回到连续生产护栏开启下一批。`,
      action: args.nextAction,
      targetChapterNos: [],
      riskLabels: [],
      evidence: ['生成完成', '交稿完成', '质检健康', '计划兑现', ...releaseEvidence],
    }
  }

  return {
    visible: true,
    status: 'deliver_chapters',
    label: '逐章交稿',
    summary: `本批 ${args.success}/${args.total} 章已生成，先把待交稿章节逐章完成质检、修订、故事状态和剧情线回填。`,
    action: args.nextAction,
    targetChapterNos: pendingDeliveryChapters,
    riskLabels: [],
    evidence: pendingDeliveryChapters.map(no => `第${no}章待交稿`),
  }
}

export function recoveryEvidenceProductionGateSourceAction(source: AnyRecord) {
  const key = text(source?.source || source?.sourceMode)
  if (key === 'single_chapter_governance_recheck') {
    return { action: 'single_chapter_governance_recheck', label: '复检单章' }
  }
  if (key === 'safe_batch_recovery_recheck') {
    return { action: 'safe_batch_recovery_recheck', label: '复盘批次' }
  }
  return { action: 'review_governance_closure', label: '治理复查台' }
}

export function uniqueRecoveryEvidenceItems(items: AnyRecord[]) {
  const seen = new Set<string>()
  return items.filter(item => {
    const evidence = text(item?.evidence)
    if (!evidence) return false
    const key = [
      text(item?.source),
      text(item?.source_detail || item?.sourceDetail),
      evidence,
    ].join('|')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function batchReleaseEvidenceItemsFromPreflight(preflight: AnyRecord | null | undefined) {
  const closure = preflight?.storyline_decision_closure || preflight?.storylineDecisionClosure || null
  const governanceMemory = parsePayload(preflight?.governance_recheck_memory || preflight?.governanceRecheckMemory)
    || preflight?.governance_recheck_memory
    || preflight?.governanceRecheckMemory
    || null
  const productionGate = parsePayload(preflight?.recovery_evidence_production_gate || preflight?.recoveryEvidenceProductionGate)
    || preflight?.recovery_evidence_production_gate
    || preflight?.recoveryEvidenceProductionGate
    || null
  const releaseSummary = recoveryEvidenceReleaseSummaryFromPreflight(preflight)
  const recoveryEvidence = [
    ...arrayValue(preflight?.recovery_evidence),
    ...arrayValue(preflight?.recoveryEvidence),
  ].map(item => text(item)).filter(Boolean).map(item => ({
    evidence: item,
    source: 'recovery_evidence',
    source_label: '恢复放行依据',
    source_detail: '安全连写预检 · 恢复放行依据',
    source_action: 'create_safe_batch_risk_repair',
    source_action_label: '按批次修订',
  }))
  const productionGateEvidence = arrayValue(productionGate?.sources)
    .filter(source => text(source?.status) === 'cleared')
    .map(source => {
      const label = firstText(source?.label, source?.source_label, source?.sourceLabel, source?.source)
      const statusLabel = firstText(source?.status_label, source?.statusLabel, '生产阻断已解除')
      const action = recoveryEvidenceProductionGateSourceAction(source)
      return label ? {
        evidence: `${label}：${statusLabel}`,
        source: 'recovery_evidence_production_gate',
        source_label: '入口生产闸门',
        source_detail: [label, statusLabel].filter(Boolean).join(' · '),
        source_action: action.action,
        source_action_label: action.label,
        production_gate_source: text(source?.source || source?.sourceMode),
      } : null
    })
    .filter(Boolean)
  const releaseNextBatchLabel = firstText(releaseSummary?.next_batch_label, releaseSummary?.nextBatchLabel)
  const releaseAllowedChapters = [
    ...arrayValue(releaseSummary?.allowed_chapter_nos),
    ...arrayValue(releaseSummary?.allowedChapterNos),
  ].map(item => text(item)).filter(Boolean)
  const releaseDetailBase = [
    '放行摘要',
    releaseNextBatchLabel,
    releaseAllowedChapters.length ? `放行章节 ${releaseAllowedChapters.join('、')}` : '',
  ].filter(Boolean).join(' · ')
  const releaseClearedSourceItems = arrayValue(releaseSummary?.cleared_sources || releaseSummary?.clearedSources)
    .filter(source => !text(source?.status) || text(source?.status) === 'cleared' || text(source?.status) === 'released')
    .map(source => {
      const label = firstText(source?.label, source?.source_label, source?.sourceLabel, source?.source)
      const statusLabel = firstText(source?.status_label, source?.statusLabel, '生产阻断已解除')
      const action = recoveryEvidenceProductionGateSourceAction(source)
      return label ? {
        evidence: `${label}：${statusLabel}`,
        source: 'recovery_evidence_release_summary',
        source_label: '安全连写放行摘要',
        source_detail: [
          releaseDetailBase,
          label,
          statusLabel,
        ].filter(Boolean).join(' · '),
        source_action: action.action,
        source_action_label: action.label,
        production_gate_source: text(source?.source || source?.sourceMode),
        chapter_nos: arrayValue(source?.chapter_nos || source?.chapterNos),
        source_task_indices: arrayValue(source?.source_task_indices || source?.sourceTaskIndices),
      } : null
    })
    .filter(Boolean)
  const releaseClearedEvidenceSet = new Set(releaseClearedSourceItems.map(item => text(item?.evidence)).filter(Boolean))
  const releaseSummaryEvidence = [
    ...arrayValue(releaseSummary?.evidence),
    ...arrayValue(releaseSummary?.release_evidence),
    ...arrayValue(releaseSummary?.releaseEvidence),
  ].map(item => text(item)).filter(Boolean)
    .filter(item => !releaseClearedEvidenceSet.has(item))
    .filter(item => !isStrengthenedRepairReleaseEvidence(item))
    .map(item => ({
      evidence: item,
      source: 'recovery_evidence_release_summary',
      source_label: '安全连写放行摘要',
      source_detail: releaseDetailBase || '放行摘要',
      source_action: 'review_governance_closure',
      source_action_label: '治理复查台',
    }))
  const repairedMemoryEvidence = [
    ...arrayValue(governanceMemory?.evidence),
    ...arrayValue(governanceMemory?.repaired_evidence),
    ...arrayValue(governanceMemory?.repairedEvidence),
  ].map(item => text(item)).filter(Boolean).map(item => ({
    evidence: item,
    source: 'governance_recheck_memory',
    source_label: '治理复查记忆',
    source_detail: '治理复查记忆 · 修后证据',
    source_action: 'review_governance_closure',
    source_action_label: '治理复查台',
  }))
  const watchMemoryEvidence = [
    ...arrayValue(governanceMemory?.watch_items),
    ...arrayValue(governanceMemory?.watchItems),
  ].map(item => text(item)).filter(Boolean).map(item => ({
    evidence: item,
    source: 'governance_recheck_memory',
    source_label: '治理复查记忆',
    source_detail: '治理复查记忆 · 观察项',
    source_action: 'review_governance_closure',
    source_action_label: '治理复查台',
  }))
  return uniqueRecoveryEvidenceItems([
    text(closure?.status) === 'ok' ? {
      evidence: text(closure?.label, '剧情线决策已闭环'),
      source: 'storyline_decision_closure',
      source_label: '剧情线决策闭环',
      source_detail: '安全连写预检 · 剧情线决策',
      source_action: 'sync_storyline_board',
      source_action_label: '同步计划',
    } : null,
    ...recoveryEvidence,
    ...productionGateEvidence,
    ...releaseSummaryEvidence,
    ...releaseClearedSourceItems,
    ...repairedMemoryEvidence,
    ...watchMemoryEvidence,
  ].filter(Boolean) as AnyRecord[])
}

export function batchReleaseEvidenceFromPreflight(preflight: AnyRecord | null | undefined) {
  return Array.from(new Set(batchReleaseEvidenceItemsFromPreflight(preflight).map(item => text(item?.evidence)).filter(Boolean)))
}

export function latestLongformCreationReport(reviews: AnyRecord[]) {
  const review = reviews
    .filter(item => text(item?.review_type) === 'longform_creation_diagnosis')
    .sort((a, b) => recordTime(b) - recordTime(a))[0]
  const payload = parsePayload(review?.payload, { owner: review, kind: 'review', field: 'payload' }) || {}
  const report = payload.report || payload.result?.report || payload
  return Object.keys(report || {}).length ? report : null
}

export function latestReviewReport(reviews: AnyRecord[], reviewType: string) {
  const review = reviews
    .filter(item => text(item?.review_type) === reviewType)
    .sort((a, b) => recordTime(b) - recordTime(a))[0]
  const payload = parsePayload(review?.payload, { owner: review, kind: 'review', field: 'payload' }) || {}
  const report = payload.report || payload.result?.report || payload.result || payload
  return Object.keys(report || {}).length ? report : null
}

export function reportScore(report: AnyRecord | null | undefined) {
  return numberValue(report?.score ?? report?.quality_score ?? report?.qualityScore)
}

export function reportStatus(report: AnyRecord | null | undefined) {
  return text(report?.status).toLowerCase()
}

export function reportIsBlocked(report: AnyRecord | null | undefined) {
  return ['blocked', 'block', 'failed', 'fail'].includes(reportStatus(report))
}

export function reportNeedsRepair(report: AnyRecord | null | undefined) {
  return ['needs_repair', 'warn', 'warning', 'fragile'].includes(reportStatus(report))
}

export function stressGateStatus(report: AnyRecord | null | undefined, key: string) {
  const gate = arrayValue(report?.stress_gates || report?.stressGates).find(item => text(item?.key) === key)
  const status = text(gate?.status).toLowerCase()
  if (['block', 'blocked', 'failed'].includes(status)) return 'block' as const
  if (['warn', 'warning', 'fragile', 'needs_repair'].includes(status)) return 'warn' as const
  if (status === 'ok' || status === 'ready' || status === 'scalable') return 'ok' as const
  return null
}

export function latestWrittenChapterNo(chapters: AnyRecord[]) {
  return chapters
    .filter(chapter => hasDeliveredProse(chapter))
    .reduce((max, chapter) => Math.max(max, Number(chapter?.chapter_no ?? chapter?.chapterNo ?? 0)), 0)
}

export function manualTestGate(
  key: AutoCreationManualTestGate['key'],
  label: string,
  status: AutoCreationBatchGuardrailSignalStatus,
  detail: string,
  evidence: string[],
  action: AutoCreationDirectorAction,
): AutoCreationManualTestGate {
  return { key, label, status, detail, evidence: evidence.map(item => text(item)).filter(Boolean).slice(0, 4), action }
}

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

export const COMPASS_AXIS_LABELS: Record<AutoCreationLongformCompassAxis['key'], string> = {
  reader_promise: '读者承诺',
  protagonist_drive: '主角长期欲望',
  core_conflict: '核心矛盾',
  world_hook: '世界奇点',
  innovation_hook: '创新卖点',
  payoff_loop: '长期爽点循环',
  ending_direction: '结局方向',
}

export function compassAxis(
  key: AutoCreationLongformCompassAxis['key'],
  value: any,
  locked = true,
): AutoCreationLongformCompassAxis | null {
  const normalized = text(value)
  if (!normalized) return null
  return {
    key,
    label: COMPASS_AXIS_LABELS[key],
    value: normalized,
    locked,
  }
}

export function compactList(values: any[], limit: number) {
  return Array.from(new Set(values.map(item => text(item)).filter(Boolean))).slice(0, limit)
}

export function buildLongformCompass(planning: PlanningWorkspaceModel, reviews: AnyRecord[]): AutoCreationLongformCompass {
  const report = latestLongformCreationReport(reviews)
  const reviewCompass = report?.compass || report?.longform_compass || {}
  const mainline = planning.mainline
  const readerPromise = firstText(reviewCompass.reader_promise, reviewCompass.readerPromise, mainline.readerPromise)
  const coreConflict = firstText(reviewCompass.core_conflict, reviewCompass.coreConflict, mainline.currentStageConflict)
  const innovationHook = firstText(reviewCompass.innovation_hook, reviewCompass.innovationHook, mainline.readerPromise)
  const payoffLoop = firstText(reviewCompass.payoff_loop, reviewCompass.payoffLoop, mainline.payoffModel)
  const endingDirection = firstText(reviewCompass.ending_direction, reviewCompass.endingDirection, mainline.currentVolumeGoal)
  const axes = [
    compassAxis('reader_promise', readerPromise),
    compassAxis('protagonist_drive', firstText(reviewCompass.protagonist_drive, reviewCompass.protagonistDrive)),
    compassAxis('core_conflict', coreConflict),
    compassAxis('world_hook', firstText(reviewCompass.world_hook, reviewCompass.worldHook)),
    compassAxis('innovation_hook', innovationHook),
    compassAxis('payoff_loop', payoffLoop),
    compassAxis('ending_direction', endingDirection),
  ].filter((item): item is AutoCreationLongformCompassAxis => Boolean(item))
  const immutableRules = compactList([
    ...arrayValue(reviewCompass.immutable_rules),
    ...arrayValue(reviewCompass.immutableRules),
    readerPromise ? `读者承诺不可漂移：${readerPromise}` : '',
    coreConflict ? `核心矛盾不可绕开：${coreConflict}` : '',
    payoffLoop ? `长期爽点循环必须可感知：${payoffLoop}` : '',
  ], 5)
  const flexibleZones = compactList([
    ...arrayValue(reviewCompass.flexible_zones),
    ...arrayValue(reviewCompass.flexibleZones),
    '副本、支线和新资产可以调整，但必须服务当前卷目标。',
    '角色出场顺序和场景形态可调整，但不能改主角长期欲望。',
  ], 5)
  const missing = [
    !readerPromise ? '读者承诺' : '',
    !coreConflict ? '核心矛盾' : '',
    !payoffLoop ? '长期爽点循环' : '',
  ].filter(Boolean)
  const status: AutoCreationLongformCompass['status'] = missing.length ? 'needs_attention' : 'ready'

  return {
    status,
    label: status === 'ready' ? '罗盘就绪' : `缺 ${missing.join('、')}`,
    summary: status === 'ready'
      ? '这组长期约束会约束章节任务书、安全连写和交稿复盘，避免千万字生产时核心漂移。'
      : '长篇自动生产前，先补齐读者承诺、核心矛盾和长期爽点循环。',
    sourceLabel: Object.keys(reviewCompass).length ? '来自创作诊断' : '来自当前规划',
    readerPromise,
    axes,
    immutableRules,
    flexibleZones,
  }
}

export function launchSignal(
  key: AutoCreationChapterLaunchSignal['key'],
  label: string,
  status: AutoCreationBatchGuardrailSignalStatus,
  detail: string,
): AutoCreationChapterLaunchSignal {
  return { key, label, status, detail }
}

export function launchGateStatus(signals: AutoCreationChapterLaunchSignal[]): AutoCreationChapterLaunchGateStatus {
  if (signals.some(item => item.status === 'block')) return 'blocked'
  if (signals.some(item => item.status === 'warn')) return 'warn'
  return 'ready'
}

export function writePreparationLaunchDetail(brief: AnyRecord, planningDesk: AnyRecord) {
  const sourceGaps = arrayValue(brief?.sourceGaps || brief?.source_gaps).map(item => text(item)).filter(Boolean)
  const assetRisks = arrayValue(brief?.assetRisks || brief?.asset_risks).map(item => text(item)).filter(Boolean)
  const deliveryActions = arrayValue(brief?.deliveryRiskActions || brief?.delivery_risk_actions).map(item => text(item)).filter(Boolean)
  const mustConfirm = arrayValue(brief?.mustConfirm || brief?.must_confirm).map(item => text(item)).filter(Boolean)
  return [
    sourceGaps.length ? `来源缺口：${sourceGaps.slice(0, 2).join('；')}` : '',
    assetRisks.length ? `资产关系：${assetRisks.slice(0, 2).join('；')}` : '',
    deliveryActions.length ? `交稿动作：${deliveryActions.slice(0, 2).join('；')}` : '',
    mustConfirm.length ? `必须确认：${mustConfirm.slice(0, 2).join('；')}` : '',
    !sourceGaps.length && !assetRisks.length && !deliveryActions.length && !mustConfirm.length
      ? planningDesk?.reasons?.[0] || '写前准备卡仍未确认。'
      : '',
  ].filter(Boolean).join('；')
}

export function buildChapterLaunchGate(
  planning: PlanningWorkspaceModel,
  writing: WritingCockpitModel,
  longformCompass: AutoCreationLongformCompass,
): AutoCreationChapterLaunchGate {
  const chapter = (writing.nextChapter || {}) as AnyRecord
  const raw = (chapter.rawPayload || chapter.raw_payload || {}) as AnyRecord
  const chapterNo = Number(chapter.chapterNo || chapter.chapter_no || 0)
  const readerPromise = firstText(longformCompass.readerPromise, planning.mainline.readerPromise)
  const chapterGoal = firstText(chapter.chapterGoal, chapter.chapter_goal, raw.chapterGoal, raw.chapter_goal, raw.goal)
  const conflict = firstText(chapter.conflict, raw.conflict, raw.coreConflict, raw.core_conflict)
  const mainlineProgress = firstText(raw.mainlineProgress, raw.mainline_progress, raw.mustAdvance, raw.must_advance, planning.mainline.nextTurn, planning.mainline.currentVolumeGoal)
  const readerPayoff = firstText(raw.readerPayoff, raw.reader_payoff, raw.payoff, raw.payoffModel, planning.mainline.payoffModel)
  const endingHook = firstText(chapter.endingHook, chapter.ending_hook, raw.endingHook, raw.ending_hook, raw.hook)
  const servesVolume = planning.mainline.currentChapterServesVolume !== false
  const proseReady = Boolean(chapter.hasProse)
  const planningDesk = writing.chapterPlanningDesk || {} as AnyRecord
  const writePreparationBrief = (planningDesk as AnyRecord).writePreparationBrief || (planningDesk as AnyRecord).write_preparation_brief || null
  const writePreparationNeedsContext = !proseReady && text(writePreparationBrief?.readinessStatus || writePreparationBrief?.readiness_status) === 'needs_context'
  const writePreparationSignal = writePreparationNeedsContext
    ? launchSignal('write_preparation', '写前准备', 'block', writePreparationLaunchDetail(writePreparationBrief, planningDesk))
    : null

  const signals = proseReady
    ? [
      launchSignal('reader_promise', '读者承诺', 'ok', readerPromise ? `已按「${readerPromise}」进入交稿闭环。` : '正文已生成，后续通过核心偏移复盘校正。'),
      launchSignal('chapter_goal', '本章目标', 'ok', '正文已生成，下一步看交稿质检和故事状态回填。'),
      launchSignal('core_conflict', '核心冲突', 'ok', '正文已生成，冲突落地由质检复盘判断。'),
      launchSignal('mainline_service', '主线服务', 'ok', '正文已生成，主线服务由交稿复盘校正。'),
      launchSignal('reader_payoff', '读者回报', 'ok', '正文已生成，读者回报由交稿复盘校正。'),
      launchSignal('ending_hook', '章末钩子', 'ok', '正文已生成，章末钩子由追读复盘校正。'),
    ]
    : [
      ...(writePreparationSignal ? [writePreparationSignal] : []),
      launchSignal('reader_promise', '读者承诺', readerPromise ? 'ok' : 'block', readerPromise ? `本章必须服务：${readerPromise}` : '缺少全书读者承诺，无法判断本章写出来后读者等什么。'),
      launchSignal('chapter_goal', '本章目标', chapterGoal ? 'ok' : 'block', chapterGoal ? `目标：${chapterGoal}` : `第${chapterNo || '-'}章缺本章目标，容易写成流水账。`),
      launchSignal('core_conflict', '核心冲突', conflict ? 'ok' : 'block', conflict ? `冲突：${conflict}` : '缺核心冲突，正文会缺压迫、选择和转折。'),
      launchSignal(
        'mainline_service',
        '主线服务',
        servesVolume && mainlineProgress ? 'ok' : servesVolume ? 'warn' : 'block',
        servesVolume
          ? mainlineProgress ? `推进：${mainlineProgress}` : '本章服务卷目标，但缺明确主线推进描述。'
          : '当前章被标记为未服务卷目标，不能直接进入初稿。',
      ),
      launchSignal('reader_payoff', '读者回报', readerPayoff ? 'ok' : 'warn', readerPayoff ? `回报模型：${readerPayoff}` : '缺本章读者回报模型，建议补出爽点、信息增量或情绪回报。'),
      launchSignal('ending_hook', '章末钩子', endingHook ? 'ok' : 'block', endingHook ? `钩子：${endingHook}` : '缺章末钩子，追读问题不清楚。'),
    ]
  const status = proseReady ? 'ready' : launchGateStatus(signals)
  const actionPayload = {
    source: 'chapter_launch_gate_repair',
    chapter_no: chapterNo || null,
    blocked_signals: signals.filter(item => item.status === 'block').map(item => item.key),
    warning_signals: signals.filter(item => item.status === 'warn').map(item => item.key),
  }
  const missingReaderPromise = signals.some(item => item.key === 'reader_promise' && item.status === 'block')
  const writePreparationBlocked = signals.some(item => item.key === 'write_preparation' && item.status === 'block')
  const action = missingReaderPromise
    ? planningAction('open_story_assets', '先补齐全书读者承诺、核心矛盾和长期爽点循环，再生成当前章。')
    : writePreparationBlocked
      ? writingAction(
          ((planningDesk as AnyRecord).recommendedPlannerAction?.key || 'open_generation_diagnostics') as WritingCockpitActionKey,
          writePreparationSignal?.detail || '先确认写前准备卡，再进入正文生成。',
          (planningDesk as AnyRecord).recommendedPlannerAction?.label || '查看生成诊断',
        )
    : planningAction('update_rolling_plan', '补齐当前章目标、核心冲突、主线推进、读者回报和章末钩子后再开写。', '补齐开写门禁', actionPayload)

  return {
    status,
    label: status === 'ready' ? '本章可以开写' : status === 'warn' ? '本章开写需校准' : '本章开写门禁未通过',
    summary: status === 'ready'
      ? proseReady ? '当前章已有正文，继续交稿质检、修订和状态回填。' : '当前章已对齐读者承诺、章节目标、核心冲突、主线服务、读者回报和章末钩子。'
      : status === 'warn'
        ? '当前章基本可推进，但读者回报或主线推进还不够明确，建议先补齐再扩大连续生产。'
        : '当前章未守住开写前提，直接生成正文容易导致主线漂移、冲突疲软或追读断线。',
    signals,
    action,
  }
}

export function rollingLayerStatusToPipeline(status: AutoCreationRollingScriptRoomStatus): AutoCreationPipelineStatus {
  if (status === 'ready') return 'done'
  if (status === 'blocked') return 'blocked'
  return 'warning'
}

export function currentChapterDirectorAction(writing: WritingCockpitModel): AutoCreationDirectorAction {
  const handoff = (writing as any).chapterHandoffDesk || null
  if (handoff?.visible) {
    return writingAction(
      (handoff.actionKey || writing.primaryActionKey || 'accept_chapter_and_continue') as WritingCockpitActionKey,
      chapterHandoffDetail(handoff),
      text(handoff.actionLabel, '处理章节交接'),
    )
  }
  if (writing.chapterAcceptanceDesk?.visible) {
    const action = writing.chapterAcceptanceDesk.recommendedAcceptanceAction || {}
    return writingAction(
      (action.key || writing.primaryActionKey || 'refresh_current_quality') as WritingCockpitActionKey,
      '处理当前章交稿闭环，先完成质检、修订、状态同步或验收。',
      action.label,
    )
  }
  const plannerAction = writing.chapterPlanningDesk?.recommendedPlannerAction || {}
  return writingAction(
    (plannerAction.key || writing.primaryActionKey || 'build_scene_plan') as WritingCockpitActionKey,
    '推进当前章任务书、场景卡或正文生成。',
    plannerAction.label,
  )
}

export function chapterHandoffDetail(handoff: AnyRecord) {
  const route = Number(handoff?.fromChapterNo || 0) && Number(handoff?.toChapterNo || 0)
    ? `第${Number(handoff.fromChapterNo)}章到第${Number(handoff.toChapterNo)}章`
    : '当前章节'
  const previousEnding = text(handoff?.previousEnding)
  const carryOver = arrayValue(handoff?.expectationCarryOver).map(item => text(item)).filter(Boolean).join('；')
  const opening = arrayValue(handoff?.nextOpeningObligations).map(item => text(item)).filter(Boolean).join('；')
  const deliveryRisk = handoff?.deliveryRiskCarryOver || null
  const deliveryRiskItems = arrayValue(deliveryRisk?.items).map(item => text(item)).filter(Boolean).slice(0, 2).join('；')
  const stagedRiskActions = deliveryRiskStagedActions(deliveryRisk)
  const deliveryRiskSummary = [
    text(deliveryRisk?.label),
    text(deliveryRisk?.priorityLabel),
    deliveryRiskItems,
  ].filter(Boolean).join('，')
  return [
    `${route}交接待确认`,
    previousEnding ? `上一章钩子：${previousEnding}` : '',
    carryOver ? `期待承接：${carryOver}` : '',
    opening ? `下一章开场：${opening}` : '',
    deliveryRiskSummary ? `交稿风险：${deliveryRiskSummary}` : '',
    stagedRiskActions.opening.length ? `开篇修复：${stagedRiskActions.opening.slice(0, 2).join('；')}` : '',
    stagedRiskActions.middle.length ? `中段推进：${stagedRiskActions.middle.slice(0, 2).join('；')}` : '',
    stagedRiskActions.ending.length ? `章末追读：${stagedRiskActions.ending.slice(0, 2).join('；')}` : '',
  ].filter(Boolean).join('；')
}

export function uniqueTextItems(values: string[]) {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const normalized = text(value)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    result.push(normalized)
  }
  return result
}

export function deliveryRiskStagedActions(deliveryRisk: AnyRecord | null) {
  const opening = arrayValue(deliveryRisk?.openingActions || deliveryRisk?.opening_actions).map(item => text(item)).filter(Boolean)
  const middle = arrayValue(deliveryRisk?.middleActions || deliveryRisk?.middle_actions).map(item => text(item)).filter(Boolean)
  const ending = arrayValue(deliveryRisk?.endingActions || deliveryRisk?.ending_actions).map(item => text(item)).filter(Boolean)
  const rawActions = arrayValue(deliveryRisk?.requiredActions || deliveryRisk?.required_actions || deliveryRisk?.actions).map(item => text(item)).filter(Boolean)
  for (const action of rawActions) {
    if (/前\s*300|开篇|开头|开场|承接|入口|第一场/.test(action)) {
      opening.push(action)
    } else if (/章末|结尾|最后|追读|翻页|尾声|钩子/.test(action)) {
      ending.push(action)
    } else {
      middle.push(action)
    }
  }

  const priority = text(deliveryRisk?.priorityLabel || deliveryRisk?.priority_label)
  if (priority) {
    if (/开篇|开头|开场|承接|入口/.test(priority)) opening.push(priority)
    else if (/章末|结尾|追读|翻页|钩子/.test(priority)) ending.push(priority)
    else if (/中段|场景|推进|爽点|回报|创新/.test(priority)) middle.push(priority)
  }

  return {
    opening: uniqueTextItems(opening),
    middle: uniqueTextItems(middle),
    ending: uniqueTextItems(ending),
  }
}

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

export function capacityTargetBand(targetWords: number) {
  if (targetWords >= 8000000) return '1000万字级'
  if (targetWords >= 3000000) return '300万字级'
  if (targetWords >= 1000000) return '百万字级'
  return '长篇'
}

export function signalStatusFromScore(score: number, warnAt = 80, blockAt = 55): AutoCreationBatchGuardrailSignalStatus {
  if (score < blockAt) return 'block'
  if (score < warnAt) return 'warn'
  return 'ok'
}

export function capacityFuelLabel(key: AutoCreationLongformCapacitySignal['key']) {
  if (key === 'future_reserve') return '补未来100章'
  if (key === 'storyline_pool') return '补剧情线池'
  if (key === 'volume_runway') return '延长当前卷跑道'
  return '校准节奏耐力'
}

export function buildLongformCapacity(planning: PlanningWorkspaceModel): AutoCreationLongformCapacity {
  const targetWords = Math.max(0, Number(planning.topStatus.targetWords || 0))
  const writtenWords = Math.max(0, Number(planning.topStatus.writtenWords || 0))
  const remainingWords = Math.max(0, targetWords - writtenWords)
  const estimatedRemainingChapters = remainingWords > 0 ? Math.ceil(remainingWords / 3000) : 0
  const targetBandLabel = capacityTargetBand(targetWords)
  const future100 = planning.topStatus.future100Coverage
  const future100Planned = Number(future100.planned || 0)
  const storylineTotal = Number(planning.storylineBoard.total || 0)
  const targetStorylineCount = targetWords >= 8000000 ? 8 : targetWords >= 3000000 ? 6 : 4
  const plannedChapterCount = Number(planning.volumeBeatBudget?.plannedChapterCount || 0)
  const targetVolumeRunway = targetWords >= 8000000 ? 50 : targetWords >= 3000000 ? 40 : 25
  const rhythmScore = Number(planning.longformRhythm?.score || 0)
  const beatScore = Number(planning.volumeBeatBudget?.score || 0)

  const futureScore = future100.ready
    ? 92
    : future100Planned >= 60
      ? 76
      : future100Planned >= 30
        ? 62
        : 45
  const storylineScore = storylineTotal <= 0
    ? 45
    : storylineTotal >= targetStorylineCount
      ? 88
      : Math.max(58, Math.round((storylineTotal / targetStorylineCount) * 82))
  const volumeRunwayScore = plannedChapterCount >= targetVolumeRunway
    ? 88
    : plannedChapterCount >= Math.ceil(targetVolumeRunway * 0.35)
      ? Math.max(58, Math.round((plannedChapterCount / targetVolumeRunway) * 82))
      : 48
  const staminaScore = Math.round(((rhythmScore || 70) + (beatScore || 70)) / 2)

  const signals: AutoCreationLongformCapacitySignal[] = [
    {
      key: 'future_reserve',
      label: '未来储备',
      status: future100.ready ? 'ok' : future100Planned >= 10 ? 'warn' : 'block',
      score: futureScore,
      detail: future100.ready ? `未来100章覆盖 ${future100.label}。` : `未来100章只有 ${future100.label}，超长篇只能小步滚动。`,
      actionKey: 'future100_generate',
    },
    {
      key: 'storyline_pool',
      label: '剧情线池',
      status: signalStatusFromScore(storylineScore, 84, 50),
      score: storylineScore,
      detail: `当前 ${storylineTotal} 条剧情线，${targetBandLabel} 建议至少 ${targetStorylineCount} 条可轮转长线。`,
      actionKey: 'open_story_assets',
    },
    {
      key: 'volume_runway',
      label: '当前卷跑道',
      status: signalStatusFromScore(volumeRunwayScore, 84, 55),
      score: volumeRunwayScore,
      detail: `当前卷已规划 ${plannedChapterCount} 章，建议保持 ${targetVolumeRunway} 章以上的卷内冲突跑道。`,
      actionKey: 'complete_volume_plan',
    },
    {
      key: 'production_stamina',
      label: '节奏耐力',
      status: signalStatusFromScore(staminaScore, 80, 58),
      score: staminaScore,
      detail: `长篇节奏 ${rhythmScore || '-'}，爆点预算 ${beatScore || '-'}，用于判断连续生产是否会疲软。`,
      actionKey: 'longform_pressure',
    },
  ]
  const score = Math.round(signals.reduce((sum, item) => sum + item.score, 0) / Math.max(1, signals.length))
  const status: AutoCreationLongformCapacityStatus = signals.some(item => item.status === 'block')
    ? 'blocked'
    : signals.some(item => item.status === 'warn') || score < 80
      ? 'caution'
      : 'ready'
  const firstRisk = signals.find(item => item.status !== 'ok')
  const fuelQueue = signals
    .filter(item => item.status !== 'ok')
    .map(item => ({
      key: item.key,
      label: capacityFuelLabel(item.key),
      status: item.status,
      detail: item.detail,
      actionKey: item.actionKey,
      actionLabel: PLANNING_ACTION_LABELS[item.actionKey] || item.actionKey,
      modelCall: MODEL_CALL_ACTIONS.has(item.actionKey),
    }))

  return {
    status,
    score,
    label: status === 'ready' ? `产能健康 ${score}` : status === 'caution' ? `产能偏薄 ${score}` : `产能阻塞 ${score}`,
    summary: status === 'ready'
      ? `${targetBandLabel} 目标仍有 ${estimatedRemainingChapters} 章左右，当前储备可以进入安全连写。`
      : `${targetBandLabel} 目标仍有 ${estimatedRemainingChapters} 章左右，${firstRisk?.label || '长线储备'}偏薄，建议先补长线资产再扩大批量。`,
    targetBandLabel,
    remainingWords,
    estimatedRemainingChapters,
    recommendedActionKey: firstRisk?.actionKey || 'longform_pressure',
    signals,
    fuelQueue,
  }
}

export function signal(label: string, status: AutoCreationBatchGuardrailSignalStatus, detail: string): AutoCreationBatchGuardrailSignal {
  return { label, status, detail }
}

export function batchPipelineStatus(status: AutoCreationBatchGuardrailStatus): AutoCreationPipelineStatus {
  if (status === 'ready') return 'active'
  if (status === 'caution') return 'warning'
  return 'blocked'
}

export function future100ReserveStatus(planning: PlanningWorkspaceModel): AutoCreationBatchGuardrailSignalStatus {
  const coverage = planning.topStatus.future100Coverage
  if (coverage.ready) return 'ok'
  if (Number(coverage.planned || 0) >= 10) return 'warn'
  return 'block'
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

export function serialReleaseInventoryIssue(guardrail: AutoCreationBatchGuardrail) {
  const signal = guardrail.guardrails.find(item => item.label === '连载库存' && item.status !== 'ok')
  return signal || null
}

export function emptyNextBatchBrief(): AutoCreationNextBatchBrief {
  return {
    visible: false,
    chapterRangeLabel: '',
    batchGoal: '',
    readerPayoffPlan: '',
    mainlineFocus: '',
    forbiddenBoundary: '',
    expansionStructureVerification: null,
    expansionStructureDecision: null,
    startChecklist: [],
    chapters: [],
  }
}

export function styleSampleStrategyFromRecord(record: AnyRecord | null | undefined) {
  return record?.styleSampleStrategy
    || record?.style_sample_strategy
    || record?.rawPayload?.preDraftBrief?.styleSampleStrategy
    || record?.rawPayload?.pre_draft_brief?.style_sample_strategy
    || record?.raw_payload?.preDraftBrief?.styleSampleStrategy
    || record?.raw_payload?.pre_draft_brief?.style_sample_strategy
    || record?.raw_payload?.context_package?.pre_draft_brief?.style_sample_strategy
    || record?.raw_payload?.context_package?.chapter_target?.style_sample_strategy
    || null
}

export function styleSampleKeysFromStrategy(strategy: AnyRecord | null | undefined) {
  return Array.from(new Set(
    arrayValue(strategy?.samples)
      .map((sample: any) => text(sample?.sample_key, text(sample?.sampleKey, text(sample?.key))))
      .filter(Boolean),
  ))
}

export function normalizeRouteChapter(record: AnyRecord): AutoCreationNextBatchBriefChapter | null {
  const chapterNo = Number(record?.chapterNo ?? record?.chapter_no ?? 0)
  if (!chapterNo) return null
  const styleSampleStrategy = styleSampleStrategyFromRecord(record)
  const styleSampleKeys = styleSampleKeysFromStrategy(styleSampleStrategy)
  return {
    chapterNo,
    title: firstText(record?.title, `第${chapterNo}章`),
    chapterTask: firstText(record?.chapterTask, record?.chapter_task, record?.task, record?.chapterGoal, record?.chapter_goal),
    conflict: firstText(record?.conflict, record?.raw_payload?.conflict),
    endingHook: firstText(record?.endingHook, record?.ending_hook, record?.hook),
    mainlineProgress: firstText(record?.mainlineProgress, record?.mainline_progress, record?.raw_payload?.mainline_progress),
    ...(styleSampleKeys.length ? { styleSampleStrategy, styleSampleKeys } : {}),
  }
}

export function mergeRouteChapterPlan(
  routeChapter: AutoCreationNextBatchBriefChapter,
  fallback: AutoCreationNextBatchBriefChapter | null,
): AutoCreationNextBatchBriefChapter {
  if (!fallback) return routeChapter
  return {
    chapterNo: routeChapter.chapterNo || fallback.chapterNo,
    title: routeChapter.title || fallback.title,
    chapterTask: routeChapter.chapterTask || fallback.chapterTask,
    conflict: routeChapter.conflict || fallback.conflict,
    endingHook: routeChapter.endingHook || fallback.endingHook,
    mainlineProgress: routeChapter.mainlineProgress || fallback.mainlineProgress,
    styleSampleStrategy: routeChapter.styleSampleStrategy || fallback.styleSampleStrategy || null,
    styleSampleKeys: routeChapter.styleSampleKeys?.length ? routeChapter.styleSampleKeys : fallback.styleSampleKeys || [],
  }
}

export function chapterRangeLabel(chapters: AutoCreationNextBatchBriefChapter[]) {
  if (!chapters.length) return ''
  const first = chapters[0].chapterNo
  const last = chapters[chapters.length - 1].chapterNo
  return first === last ? `第${first}章` : `第${first}-${last}章`
}

export function checklistItem(
  key: AutoCreationNextBatchBriefStartChecklistKey,
  label: string,
  detail: string,
  fallback: string,
): AutoCreationNextBatchBriefStartChecklistItem {
  const value = text(detail)
  return {
    key,
    label,
    status: value ? 'ok' : 'warn',
    detail: value || fallback,
  }
}

export const DEFAULT_FIVE_CHAPTER_LANE_TEMPLATE_REQUIREMENTS = [
  { key: 'default_lane_segment_duty', label: '默认档位段位职责' },
  { key: 'default_lane_conflict_rotation', label: '冲突轮换' },
  { key: 'default_lane_payoff_density', label: '回报密度' },
  { key: 'default_lane_ending_hook_template', label: '章末追读模板' },
]

export const DEFAULT_FIVE_CHAPTER_LANE_TEMPLATE_RECEIPTS = [
  'default_lane_segment_duty_delivered',
  'default_lane_conflict_rotation_delivered',
  'default_lane_payoff_density_delivered',
  'default_lane_ending_hook_template_delivered',
]

export function defaultFiveChapterLaneTemplateReceiptKey(key: string) {
  if (key === 'default_lane_segment_duty') return 'default_lane_segment_duty_delivered'
  if (key === 'default_lane_conflict_rotation') return 'default_lane_conflict_rotation_delivered'
  if (key === 'default_lane_payoff_density') return 'default_lane_payoff_density_delivered'
  if (key === 'default_lane_ending_hook_template') return 'default_lane_ending_hook_template_delivered'
  return ''
}

export function defaultFiveChapterLaneTemplateFieldValue(source: AnyRecord, key: string) {
  if (!source) return ''
  if (key === 'default_lane_segment_duty') return firstText(source.segment_duty_rewrite, source.segmentDutyRewrite)
  if (key === 'default_lane_conflict_rotation') return firstText(source.conflict_rotation, source.conflictRotation)
  if (key === 'default_lane_payoff_density') return firstText(source.payoff_density, source.payoffDensity)
  if (key === 'default_lane_ending_hook_template') return firstText(source.ending_hook_template, source.endingHookTemplate)
  return ''
}

export function defaultFiveChapterLaneTemplateFromTask(task: AnyRecord, run: AnyRecord) {
  const review = task?.safe_batch_expansion_structure_decision_review
    || task?.safeBatchExpansionStructureDecisionReview
    || task?.payload?.safe_batch_expansion_structure_decision_review
    || task?.payload?.safeBatchExpansionStructureDecisionReview
    || null
  const redesign = review?.default_five_chapter_lane_redesign
    || review?.defaultFiveChapterLaneRedesign
    || null
  const failedItems = [
    ...arrayValue(review?.failed_items || review?.failedItems),
    ...arrayValue(redesign?.missed_requirements || redesign?.missedRequirements),
  ]
  const hasDefaultLaneTemplate = Boolean(
    redesign
    || failedItems.some(item => text(item?.key).startsWith('default_lane_')),
  )
  if (!hasDefaultLaneTemplate) return null
  const requirementLabels = DEFAULT_FIVE_CHAPTER_LANE_TEMPLATE_REQUIREMENTS.map(item => item.label)
  return {
    visible: true,
    status: 'fulfilled',
    label: '默认5章档位模板回检',
    source: 'safe_batch_expansion_structure_decision_mismatch',
    source_run_id: run?.id ?? null,
    repaired_at: text(run?.completed_at || run?.finished_at || run?.updated_at || run?.created_at),
    reason: text(redesign?.reason),
    relapse_count: Number(redesign?.relapse_count ?? redesign?.relapseCount ?? 0),
    repeated_failure_reasons: arrayValue(redesign?.repeated_failure_reasons || redesign?.repeatedFailureReasons)
      .map(item => text(item?.reason || item?.label || item))
      .filter(Boolean),
    segment_duty_rewrite: firstText(
      redesign?.segment_duty_rewrite,
      redesign?.segmentDutyRewrite,
      '默认 5 章档位验证批必须逐章继承前段、中段、后段的段位职责模板。',
    ),
    conflict_rotation: firstText(
      redesign?.conflict_rotation,
      redesign?.conflictRotation,
      '默认 5 章档位验证批必须逐章轮换冲突来源，避免同一压迫方式复发。',
    ),
    payoff_density: firstText(
      redesign?.payoff_density,
      redesign?.payoffDensity,
      '默认 5 章档位验证批必须逐章交付显性回报，不能连续铺垫。',
    ),
    ending_hook_template: firstText(
      redesign?.ending_hook_template,
      redesign?.endingHookTemplate,
      '默认 5 章档位验证批必须逐章落地章末追读模板。',
    ),
    requirements: DEFAULT_FIVE_CHAPTER_LANE_TEMPLATE_REQUIREMENTS.map(requirement => ({
      ...requirement,
      status: 'fulfilled',
      verification_requirement: `${requirement.label}已补齐，下一轮验证批必须逐章继承并证明没有复发。`,
    })),
    summary: `默认5章档位模板已补齐：${requirementLabels.join('、')}。下一轮验证批逐章继承四项模板，并在复盘里证明核心守恒、显性回报和章末追读没有复发。`,
  }
}

export function normalizeDefaultFiveChapterLaneTemplateRedesignedTemplates(queue: AnyRecord) {
  const explicitTemplates = arrayValue(queue.redesigned_templates || queue.redesignedTemplates || queue.templates)
    .map((item: AnyRecord) => ({
      key: text(item?.key),
      label: text(item?.label || item?.name || item?.key, '模板项'),
      template: firstText(item?.template, item?.rewrite, item?.instruction, item?.text, item?.detail),
    }))
    .filter((item: AnyRecord) => item.key || item.label || item.template)
  if (explicitTemplates.length) return explicitTemplates
  return arrayValue(queue.redesign_requirements || queue.redesignRequirements)
    .map((item: AnyRecord) => ({
      key: text(item?.key),
      label: text(item?.label || item?.name || item?.key, '模板项'),
      template: firstText(item?.template, item?.rewrite, item?.instruction, item?.text, item?.detail),
    }))
    .filter((item: AnyRecord) => item.key || item.label || item.template)
}

export function normalizeDefaultFiveChapterLaneTemplateFailedRequirements(source: AnyRecord | null | undefined) {
  return arrayValue(source?.failed_requirements || source?.failedRequirements || source?.template_version_failed_requirements || source?.templateVersionFailedRequirements)
    .map((item: AnyRecord) => ({
      key: text(item?.key),
      label: text(item?.label || item?.name || item?.key, '模板要求'),
      failure_reason: text(item?.failure_reason || item?.failureReason || item?.reason),
      failed_count: Number(item?.failed_count ?? item?.failedCount ?? 1),
    }))
    .filter((item: AnyRecord) => item.key || item.label || item.failure_reason)
}

export function normalizeDefaultFiveChapterLaneTemplateProductionRelapseReview(
  source: AnyRecord | null | undefined,
  fallback: {
    templateVersionId?: string
    failedRequirements?: AnyRecord[]
    summary?: string
  } = {},
) {
  const raw = source?.production_relapse_review || source?.productionRelapseReview || source || null
  if (!raw) return null
  const templateVersionId = firstText(
    raw.template_version_id,
    raw.templateVersionId,
    fallback.templateVersionId,
  )
  const defaultBatchChapterNos = arrayValue(raw.default_batch_chapter_nos || raw.defaultBatchChapterNos)
    .map((chapterNo: any) => Number(chapterNo))
    .filter((chapterNo: number) => chapterNo > 0)
  const restoreChapterNos = arrayValue(raw.restore_chapter_nos || raw.restoreChapterNos)
    .map((chapterNo: any) => Number(chapterNo))
    .filter((chapterNo: number) => chapterNo > 0)
  const validationChapterNos = arrayValue(raw.validation_chapter_nos || raw.validationChapterNos)
    .map((chapterNo: any) => Number(chapterNo))
    .filter((chapterNo: number) => chapterNo > 0)
  const failureReasons = arrayValue(raw.failure_reasons || raw.failureReasons)
    .map((reason: any) => text(reason))
    .filter(Boolean)
  const failedRequirements = normalizeDefaultFiveChapterLaneTemplateFailedRequirements(raw)
  const effectiveFailedRequirements = failedRequirements.length
    ? failedRequirements
    : arrayValue(fallback.failedRequirements)
  const repeated = raw.repeated_hotspot_segment || raw.repeatedHotspotSegment || null
  const summary = firstText(raw.summary, fallback.summary)
  const hasContent = templateVersionId
    || defaultBatchChapterNos.length
    || restoreChapterNos.length
    || validationChapterNos.length
    || failureReasons.length
    || effectiveFailedRequirements.length
    || summary
  if (!hasContent) return null
  return {
    ...(templateVersionId ? { template_version_id: templateVersionId } : {}),
    default_batch_chapter_nos: defaultBatchChapterNos,
    restore_chapter_nos: restoreChapterNos,
    validation_chapter_nos: validationChapterNos,
    failure_reasons: failureReasons,
    failed_requirements: effectiveFailedRequirements,
    ...(repeated ? {
      repeated_hotspot_segment: {
        key: text(repeated.key),
        label: text(repeated.label || repeated.key),
        risk_count: Number(repeated.risk_count ?? repeated.riskCount ?? repeated.count ?? 0),
      },
    } : {}),
    ...(summary ? { summary } : {}),
  }
}

export function defaultFiveChapterLaneTemplateFromRedesignQueue(
  queue: AnyRecord,
  run: AnyRecord,
  fallbackTemplate?: AnyRecord | null,
) {
  if (!queue || queue.visible === false) return null
  const fallback = fallbackTemplate || {}
  const redesignedTemplates = normalizeDefaultFiveChapterLaneTemplateRedesignedTemplates(queue)
  const templateByKey = new Map(redesignedTemplates.map((item: AnyRecord) => [item.key, item]))
  const topFailedRaw = queue.top_failed_requirement || queue.topFailedRequirement || null
  const topFailedRequirement = topFailedRaw && typeof topFailedRaw === 'object' && !Array.isArray(topFailedRaw)
    ? {
      key: text(topFailedRaw.key),
      label: text(topFailedRaw.label || topFailedRaw.key, '模板缺项'),
      failed_count: Number(topFailedRaw.failed_count ?? topFailedRaw.failedCount ?? 0),
      failure_reason: text(topFailedRaw.failure_reason || topFailedRaw.failureReason),
    }
    : null
  const templateVersion = queue.template_version || queue.templateVersion || null
  const templateVersionId = firstText(
    queue.template_version_id,
    queue.templateVersionId,
    templateVersion?.id,
    fallback.template_version_id,
    fallback.templateVersionId,
  )
  const failedRequirements = normalizeDefaultFiveChapterLaneTemplateFailedRequirements(queue)
  const productionRelapseReview = normalizeDefaultFiveChapterLaneTemplateProductionRelapseReview(queue, {
    templateVersionId,
    failedRequirements,
    summary: text(queue.summary),
  })
  const explicitProductionRelapseCount = Number(queue.production_relapse_count ?? queue.productionRelapseCount ?? 0)
  const productionRelapseCount = explicitProductionRelapseCount > 0
    ? explicitProductionRelapseCount
    : productionRelapseReview ? 1 : 0
  const productionFailureReasons = arrayValue(productionRelapseReview?.failure_reasons || productionRelapseReview?.failureReasons)
    .map((reason: any) => text(reason))
    .filter(Boolean)
  const productionChapterNos = arrayValue(productionRelapseReview?.default_batch_chapter_nos || productionRelapseReview?.defaultBatchChapterNos)
    .map((chapterNo: any) => Number(chapterNo))
    .filter((chapterNo: number) => chapterNo > 0)
  const validationStandard = arrayValue(queue.validation_standard || queue.validationStandard)
    .map(item => text(item))
    .filter(Boolean)
  const productionValidationStandard = productionRelapseReview
    ? [
      templateVersionId ? `下一轮3章验证批必须逐章对照 template_version_id ${templateVersionId} 和真实生产复发章节。` : '',
      productionFailureReasons.length ? `逐章证明新版模板已修掉真实生产失败维度：${productionFailureReasons.join('、')}。` : '',
    ].filter(Boolean)
    : []
  const effectiveValidationStandard = Array.from(new Set([
    ...validationStandard,
    ...productionValidationStandard,
  ]))
  const requiredReceipts = arrayValue(queue.required_receipts || queue.requiredReceipts || queue.receipts)
    .map(item => text(item))
    .filter(Boolean)
  const effectiveReceipts = requiredReceipts.length ? Array.from(new Set(requiredReceipts)) : DEFAULT_FIVE_CHAPTER_LANE_TEMPLATE_RECEIPTS
  const templateForRequirement = (key: string, fallbackText: string) => firstText(
    templateByKey.get(key)?.template,
    defaultFiveChapterLaneTemplateFieldValue(queue, key),
    defaultFiveChapterLaneTemplateFieldValue(fallback, key),
    fallbackText,
  )
  const segmentDutyRewrite = templateForRequirement(
    'default_lane_segment_duty',
    '默认 5 章档位验证批必须逐章继承前段、中段、后段的段位职责模板。',
  )
  const conflictRotation = templateForRequirement(
    'default_lane_conflict_rotation',
    '默认 5 章档位验证批必须逐章轮换冲突来源，避免同一压迫方式复发。',
  )
  const payoffDensity = templateForRequirement(
    'default_lane_payoff_density',
    '默认 5 章档位验证批必须逐章交付显性回报，不能连续铺垫。',
  )
  const endingHookTemplate = templateForRequirement(
    'default_lane_ending_hook_template',
    '默认 5 章档位验证批必须逐章落地章末追读模板。',
  )
  const topFailureSummary = topFailedRequirement
    ? `${topFailedRequirement.label}失败 ${topFailedRequirement.failed_count} 次`
    : ''
  const productionRelapseSummary = productionRelapseReview
    ? [
      productionChapterNos.length ? `生产复发章节：${compactChapterNoEvidence(productionChapterNos)}` : '',
      productionFailureReasons.length ? `失败维度：${productionFailureReasons.join('、')}` : '',
    ].filter(Boolean).join('；')
    : ''
  const baseSummary = text(
    queue.summary,
    `默认5章档位模板已完成重构${topFailureSummary ? `：${topFailureSummary}` : ''}。下一轮验证批逐章执行新模板，并证明四项模板没有复发。`,
  )

  return {
    visible: true,
    status: 'fulfilled',
    label: '默认5章档位模板重构',
    source: 'safe_batch_expansion_structure_repair',
    redesign_source: 'default_five_chapter_lane_template_redesign_queue',
    source_run_id: run?.id ?? null,
    repaired_at: text(run?.completed_at || run?.finished_at || run?.updated_at || run?.created_at),
    source_repair_summary: text(queue.summary),
    ...(templateVersionId ? { template_version_id: templateVersionId } : {}),
    ...(templateVersion ? { template_version: { ...templateVersion, id: templateVersionId || text(templateVersion.id) } } : {}),
    ...(productionRelapseCount > 0 ? { production_relapse_count: productionRelapseCount } : {}),
    ...(failedRequirements.length ? { failed_requirements: failedRequirements } : {}),
    ...(productionRelapseReview ? { production_relapse_review: productionRelapseReview } : {}),
    ...(topFailedRequirement ? { top_failed_requirement: topFailedRequirement } : {}),
    latest_chapter_nos: arrayValue(queue.latest_chapter_nos || queue.latestChapterNos)
      .map((chapterNo: any) => Number(chapterNo))
      .filter((chapterNo: number) => chapterNo > 0),
    validation_batch_count: Number(queue.validation_batch_count ?? queue.validationBatchCount ?? 0),
    failed_batch_count: Number(queue.failed_batch_count ?? queue.failedBatchCount ?? 0),
    summary: productionRelapseSummary ? `${baseSummary} ${productionRelapseSummary}。` : baseSummary,
    segment_duty_rewrite: segmentDutyRewrite,
    conflict_rotation: conflictRotation,
    payoff_density: payoffDensity,
    ending_hook_template: endingHookTemplate,
    redesigned_templates: DEFAULT_FIVE_CHAPTER_LANE_TEMPLATE_REQUIREMENTS.map(requirement => ({
      key: requirement.key,
      label: text(templateByKey.get(requirement.key)?.label, requirement.label),
      template: templateForRequirement(requirement.key, ''),
    })),
    validation_standard: effectiveValidationStandard,
    required_receipts: effectiveReceipts,
    requirements: DEFAULT_FIVE_CHAPTER_LANE_TEMPLATE_REQUIREMENTS.map(requirement => {
      const receiptKey = defaultFiveChapterLaneTemplateReceiptKey(requirement.key)
      const templateText = templateForRequirement(requirement.key, '')
      const productionFailure = failedRequirements.find((item: AnyRecord) => item.key === requirement.key)
      return {
        ...requirement,
        status: 'fulfilled',
        verification_requirement: [
          templateText ? `${requirement.label}新模板：${templateText}` : `${requirement.label}已重构`,
          receiptKey ? `下一轮验证批必须逐章回填 ${receiptKey}` : '',
          productionFailure?.failure_reason ? `真实生产失败维度：${productionFailure.failure_reason}` : '',
          '并证明该模板没有复发。',
        ].filter(Boolean).join('；'),
      }
    }),
  }
}

export function defaultFiveChapterLaneTemplateFromStructureRepairTask(
  task: AnyRecord,
  run: AnyRecord,
  fallbackTemplate?: AnyRecord | null,
) {
  const review = task?.safe_batch_expansion_structure_review
    || task?.safeBatchExpansionStructureReview
    || task?.structure_review
    || task?.structureReview
    || null
  const redesignQueue = review?.default_five_chapter_lane_template_redesign_queue
    || review?.defaultFiveChapterLaneTemplateRedesignQueue
    || null
  const templateFromRedesignQueue = defaultFiveChapterLaneTemplateFromRedesignQueue(
    redesignQueue,
    run,
    fallbackTemplate,
  )
  if (templateFromRedesignQueue) return templateFromRedesignQueue
  const repair = review?.default_five_chapter_lane_template_repair
    || review?.defaultFiveChapterLaneTemplateRepair
    || review?.validation_result?.default_five_chapter_lane_template_verdict
    || review?.validationResult?.defaultFiveChapterLaneTemplateVerdict
    || null
  if (!repair || repair.visible === false) return null
  const repairedMissingRequirements = arrayValue(repair.missing_requirements || repair.missingRequirements)
    .map((item: AnyRecord) => ({
      key: text(item?.key),
      label: text(item?.label || item?.key, '模板缺项'),
      chapter_nos: arrayValue(item?.chapter_nos || item?.chapterNos)
        .map((chapterNo: any) => Number(chapterNo))
        .filter((chapterNo: number) => chapterNo > 0),
    }))
    .filter((item: AnyRecord) => item.key || item.label || item.chapter_nos.length)
  if (!repairedMissingRequirements.length) return null
  const repairActions = arrayValue(repair.repair_actions || repair.repairActions)
    .map(item => text(item))
    .filter(Boolean)
  const repairSummary = text(repair.repair_summary || repair.repairSummary)
    || repairedMissingRequirements
      .map((item: AnyRecord) => `${compactChapterNoEvidence(item.chapter_nos)}缺${item.label}`)
      .join('；')
  const requirementLabels = DEFAULT_FIVE_CHAPTER_LANE_TEMPLATE_REQUIREMENTS.map(item => item.label)
  const fallback = fallbackTemplate || {}
  return {
    visible: true,
    status: 'fulfilled',
    label: text(fallback.label, '默认5章档位模板回检'),
    source: 'safe_batch_expansion_structure_repair',
    source_run_id: run?.id ?? null,
    repaired_at: text(run?.completed_at || run?.finished_at || run?.updated_at || run?.created_at),
    source_repair_summary: text(repair.summary),
    segment_duty_rewrite: firstText(
      fallback.segment_duty_rewrite,
      fallback.segmentDutyRewrite,
      '默认 5 章档位验证批必须逐章继承前段、中段、后段的段位职责模板。',
    ),
    conflict_rotation: firstText(
      fallback.conflict_rotation,
      fallback.conflictRotation,
      '默认 5 章档位验证批必须逐章轮换冲突来源，避免同一压迫方式复发。',
    ),
    payoff_density: firstText(
      fallback.payoff_density,
      fallback.payoffDensity,
      '默认 5 章档位验证批必须逐章交付显性回报，不能连续铺垫。',
    ),
    ending_hook_template: firstText(
      fallback.ending_hook_template,
      fallback.endingHookTemplate,
      '默认 5 章档位验证批必须逐章落地章末追读模板。',
    ),
    repaired_missing_requirements: repairedMissingRequirements,
    repair_actions: repairActions,
    requirements: DEFAULT_FIVE_CHAPTER_LANE_TEMPLATE_REQUIREMENTS.map(requirement => {
      const repaired = repairedMissingRequirements.find((item: AnyRecord) => item.key === requirement.key)
      return {
        ...requirement,
        status: 'fulfilled',
        verification_requirement: repaired
          ? `${requirement.label}已按${compactChapterNoEvidence(repaired.chapter_nos)}缺项修复，下一轮验证批必须逐章证明没有复发。`
          : `${requirement.label}已补齐，下一轮验证批必须逐章继承并证明没有复发。`,
      }
    }),
    summary: `默认5章档位模板已补齐：${requirementLabels.join('、')}。${repairSummary}已写入结构修复，下一轮验证批逐章继承四项模板，并证明这些缺项没有复发。`,
  }
}

export function buildResolvedDefaultFiveChapterLaneTemplateSeed(runRecords: AnyRecord[]) {
  const repairEntries = arrayValue(runRecords)
    .filter(run => text(run?.run_type) === 'longform_production_repair')
    .map(run => ({
      run,
      output: parsePayload(run?.output_ref, { owner: run, kind: 'run', field: 'output_ref' }) || {},
    }))
    .filter(entry => isCompletedRepairRun(entry.run))
    .sort((a, b) => recordTime(b.run) - recordTime(a.run))

  for (const entry of repairEntries) {
    const tasks = [
      ...arrayValue(entry.output?.tasks),
      ...arrayValue(entry.output?.repairTasks),
    ]
    for (const task of tasks) {
      if (text(task?.issue_type ?? task?.issueType) !== 'safe_batch_expansion_structure_decision_mismatch') continue
      if (!isResolvedTaskStatus(task?.task_status ?? task?.status)) continue
      const template = defaultFiveChapterLaneTemplateFromTask(task, entry.run)
      if (template) return template
    }
  }
  return null
}

export function buildResolvedSafeBatchExpansionStructureVerificationSeed(runRecords: AnyRecord[]) {
  const defaultFiveChapterLaneTemplate = buildResolvedDefaultFiveChapterLaneTemplateSeed(runRecords)
  const repairEntries = arrayValue(runRecords)
    .filter(run => text(run?.run_type) === 'longform_production_repair')
    .map(run => ({
      run,
      input: parsePayload(run?.input_ref, { owner: run, kind: 'run', field: 'input_ref' }) || {},
      output: parsePayload(run?.output_ref, { owner: run, kind: 'run', field: 'output_ref' }) || {},
    }))
    .filter(entry => text(entry.input?.source) === 'auto_creation_safe_batch_risk')
    .filter(entry => isCompletedRepairRun(entry.run))
    .sort((a, b) => recordTime(b.run) - recordTime(a.run))

  for (const entry of repairEntries) {
    const tasks = [
      ...arrayValue(entry.output?.tasks),
      ...arrayValue(entry.output?.repairTasks),
    ]
    for (const task of tasks) {
      if (text(task?.issue_type ?? task?.issueType) !== 'safe_batch_expansion_structure_repair') continue
      if (!isResolvedTaskStatus(task?.task_status ?? task?.status)) continue
      const review = task?.safe_batch_expansion_structure_review
        || task?.safeBatchExpansionStructureReview
        || task?.structure_review
        || task?.structureReview
        || {}
      const repeated = review?.repeated_hotspot_segment || review?.repeatedHotspotSegment || null
      const defaultFiveChapterRegression = review?.default_five_chapter_regression
        || review?.defaultFiveChapterRegression
        || null
      const defaultRegressionVisible = Boolean(defaultFiveChapterRegression && defaultFiveChapterRegression.visible !== false)
      const segmentLabel = firstText(repeated?.label, '复发段位')
      const actions = arrayValue(review?.structure_actions || review?.structureActions)
        .map(item => text(item))
        .filter(Boolean)
      const defaultRegressionAction = actions.find(item => item.includes('默认档位回退')) || ''
      const defaultFailureReasons = arrayValue(defaultFiveChapterRegression?.failure_reasons || defaultFiveChapterRegression?.failureReasons)
        .map(item => text(item))
        .filter(Boolean)
      const defaultFiveChapterLaneTemplateFromRepair = defaultFiveChapterLaneTemplateFromStructureRepairTask(
        task,
        entry.run,
        defaultFiveChapterLaneTemplate,
      )
      const effectiveDefaultFiveChapterLaneTemplate = defaultFiveChapterLaneTemplateFromRepair || defaultFiveChapterLaneTemplate
      return {
        source: 'safe_batch_expansion_structure_repair',
        label: '扩批结构验证',
        source_run_id: entry.run?.id ?? null,
        repaired_at: text(entry.run?.completed_at || entry.run?.finished_at || entry.run?.updated_at || entry.run?.created_at),
        repeated_hotspot_segment: repeated ? {
          key: text(repeated?.key),
          label: segmentLabel,
          count: Number(repeated?.count || 0),
        } : null,
        latest_chapter_nos: arrayValue(review?.latest_chapter_nos || review?.latestChapterNos)
          .map(chapterNo => Number(chapterNo))
          .filter(chapterNo => chapterNo > 0),
        affected_chapter_nos: arrayValue(review?.affected_chapter_nos || review?.affectedChapterNos)
          .map(chapterNo => Number(chapterNo))
          .filter(chapterNo => chapterNo > 0),
        fixed_segment_role: defaultRegressionVisible
          ? firstText(
            defaultRegressionAction,
            `${segmentLabel}默认档位回退验证：每章必须重新证明主线转折、显性回报和章末追读稳定。`,
          )
          : firstText(
            actions.find(item => item.includes('固定职责')),
            `${segmentLabel}固定职责：每批该段必须完成主线转折、显性回报和章末追读。`,
          ),
        conflict_rotation: defaultRegressionVisible
          ? `${segmentLabel}验证批次每章必须更换冲突来源，并逐章证明默认5章档位失效维度不再复发。`
          : `${segmentLabel}验证批次每章必须更换冲突来源，不能连续复用上一批热区压迫方式。`,
        explicit_payoff: defaultRegressionVisible
          ? `每章至少一个显性回报，不能只铺垫或转场；${defaultFailureReasons.includes('回报欠账') ? '必须逐章补清回报欠账。' : '必须逐章证明显性回报稳定。'}`
          : '每章至少一个显性回报，不能只铺垫或转场。',
        ending_hook_requirement: defaultRegressionVisible
          ? `每章章末必须留下不同的章末追读问题，并把下一章必看理由压到最后一幕；${defaultFailureReasons.includes('追读拉力') ? '必须逐章修复追读拉力。' : '必须逐章证明章末追读稳定。'}`
          : '每章章末必须留下不同的章末追读问题，并把下一章必看理由压到最后一幕。',
        structure_actions: actions,
        ...(effectiveDefaultFiveChapterLaneTemplate ? { default_five_chapter_lane_template: effectiveDefaultFiveChapterLaneTemplate } : {}),
        ...(defaultRegressionVisible ? { default_five_chapter_regression: defaultFiveChapterRegression } : {}),
      }
    }
  }
  if (defaultFiveChapterLaneTemplate) {
    return {
      source: 'safe_batch_expansion_structure_decision_mismatch',
      label: '扩批结构验证',
      source_run_id: defaultFiveChapterLaneTemplate.source_run_id,
      repaired_at: defaultFiveChapterLaneTemplate.repaired_at,
      repeated_hotspot_segment: null,
      latest_chapter_nos: [],
      affected_chapter_nos: [],
      fixed_segment_role: defaultFiveChapterLaneTemplate.segment_duty_rewrite,
      conflict_rotation: defaultFiveChapterLaneTemplate.conflict_rotation,
      explicit_payoff: defaultFiveChapterLaneTemplate.payoff_density,
      ending_hook_requirement: defaultFiveChapterLaneTemplate.ending_hook_template,
      structure_actions: [
        defaultFiveChapterLaneTemplate.segment_duty_rewrite,
        defaultFiveChapterLaneTemplate.conflict_rotation,
        defaultFiveChapterLaneTemplate.payoff_density,
        defaultFiveChapterLaneTemplate.ending_hook_template,
      ].filter(Boolean),
      default_five_chapter_lane_template: defaultFiveChapterLaneTemplate,
    }
  }
  return null
}

export function buildSafeBatchExpansionStructureVerification(args: {
  seed?: AnyRecord | null
  chapters: AutoCreationNextBatchBriefChapter[]
}) {
  if (!args.seed) return null
  const validationChapterNos = args.chapters
    .slice(0, 3)
    .map(chapter => Number(chapter.chapterNo || 0))
    .filter(chapterNo => chapterNo > 0)
  if (!validationChapterNos.length) return null
  return {
    ...args.seed,
    validation_chapter_nos: validationChapterNos,
  }
}

export function safeBatchDefaultFiveChapterLaneRedesignPayload(effectiveness: AnyRecord | null | undefined, segmentLabel: string) {
  if (text(effectiveness?.recommendation) !== 'escalate_structure_redesign') return null
  const trend = effectiveness?.default_five_chapter_recovery_verdict_relapse_trend
    || effectiveness?.defaultFiveChapterRecoveryVerdictRelapseTrend
    || null
  if (text(trend?.recommendation) !== 'escalate_structure_redesign') return null
  const relapseCount = Number(
    trend?.repeated_relapse_count
    ?? trend?.repeatedRelapseCount
    ?? (Number(trend?.baseline_relapse_count ?? trend?.baselineRelapseCount ?? 0) + Number(trend?.current_relapse_count ?? trend?.currentRelapseCount ?? 0)),
  )
  if (relapseCount < 2) return null
  const repeatedFailureReasons = arrayValue(trend?.repeated_failure_reasons || trend?.repeatedFailureReasons)
    .map(item => text(item?.reason || item?.label || item))
    .filter(Boolean)
  const reasonLabel = repeatedFailureReasons.length ? repeatedFailureReasons.join('、') : '已清零维度'
  const dutySegment = text(segmentLabel, '复发段位')
  return {
    reason: 'repeated_recovery_verdict_relapse',
    label: '默认5章档位结构重构',
    summary: text(trend?.summary, `恢复判定连续失效 ${relapseCount} 次：${reasonLabel}同维复发，默认档位结构重构。`),
    relapseCount,
    repeatedFailureReasons,
    segmentDutyRewrite: `段位职责重写：重写默认 5 章档位内前段、中段、后段和${dutySegment}的承载职责，明确每章负责冲突推进、信息增量、读者回报或章末钩子中的哪一项，禁止把${dutySegment}继续写成转场铺垫。`,
    conflictRotation: `冲突轮换：默认 5 章内必须轮换至少三类冲突来源，避免连续使用同一压迫、同一解释或同一对手推进；${dutySegment}必须换成可见事件或选择代价。`,
    payoffDensity: '回报密度：默认 5 章每章都要交付显性回报，至少包含信息增量、能力展示、关系变化、爽点兑现或小回收之一，不能连续两章只铺垫。',
    endingHookTemplate: '章末追读模板：每章最后 300 字必须落成触发事件、读者问题、下一章风险升级三件套，不能用空泛总结替代章末追读。',
  }
}

export function buildSafeBatchExpansionStructureDecision(policy?: AnyRecord | null) {
  if (!policy?.visible) return null
  const feedback = policy.expansionFeedback || policy.expansion_feedback || null
  const effectiveness = feedback?.expansionStructureRepairEffectiveness
    || feedback?.expansion_structure_repair_effectiveness
    || null
  const decisionTrend = feedback?.expansionStructureDecisionTrend
    || feedback?.expansion_structure_decision_trend
    || null
  const decisionTrendWarn = text(decisionTrend?.status) === 'warn'
  if (!effectiveness?.visible && !decisionTrendWarn) return null
  const effectivenessRecommendation = text(effectiveness?.recommendation)
  const recommendation = decisionTrendWarn ? 'continue_small_validation' : effectivenessRecommendation
  if (!recommendation) return null
  const targetChapterCount = Number(policy.targetChapterCount ?? policy.target_chapter_count ?? 0)
  const topFailedRequirement = decisionTrend?.top_failed_requirement || decisionTrend?.topFailedRequirement || null
  const topFailedSegment = decisionTrend?.top_failed_segment || decisionTrend?.topFailedSegment || null
  const segmentLabel = text(
    effectiveness?.segment_label || effectiveness?.segmentLabel,
    text(decisionTrend?.latest_segment_label || decisionTrend?.latestSegmentLabel, text(topFailedSegment?.label, '复发段位')),
  )
  const baselinePassRate = Number(effectiveness?.baseline_pass_rate ?? effectiveness?.baselinePassRate ?? 0)
  const currentPassRate = Number(effectiveness?.current_pass_rate ?? effectiveness?.currentPassRate ?? 0)
  const baselineFailureReasonCount = Number(effectiveness?.baseline_failure_reason_count ?? effectiveness?.baselineFailureReasonCount ?? 0)
  const currentFailureReasonCount = Number(effectiveness?.current_failure_reason_count ?? effectiveness?.currentFailureReasonCount ?? 0)
  const currentRecurrenceInterval = Number(effectiveness?.current_recurrence_interval_batch_count ?? effectiveness?.currentRecurrenceIntervalBatchCount ?? 0)
  const defaultFiveChapterLaneRedesign = safeBatchDefaultFiveChapterLaneRedesignPayload(effectiveness, segmentLabel)
  const modeLabel = decisionTrendWarn
    ? '结构决策执行补齐'
    : recommendation === 'restore_five_chapter'
    ? '恢复5章扩批'
    : recommendation === 'continue_small_validation'
      ? '继续小批验证'
      : '单章结构重构'
  const baseInstruction = recommendation === 'restore_five_chapter'
    ? `恢复 5 章扩批，但每章必须明确前段/中段/后段职责，${segmentLabel}不能再次变成空铺垫、掉回报或弱追读。`
    : recommendation === 'continue_small_validation'
      ? `继续 2-3 章小批验证，逐章观察通过率、失败主因和同段复发，不得提前恢复 5 章节奏。`
      : defaultFiveChapterLaneRedesign
        ? `默认 5 章档位连续恢复判定失效，回到单章结构重构；先重写默认 5 章档位的段位职责、冲突轮换、回报密度和章末追读模板，再恢复多章连写。`
        : `回到单章结构重构，先重写批次设计原则和${segmentLabel}职责，再恢复多章连写。`
  const trendInstruction = decisionTrendWarn
    ? `先按结构决策执行趋势补齐${text(topFailedRequirement?.label, '段位职责和观察指标')}，下一批保持 ${Math.max(1, targetChapterCount || 3)} 章小批验证；每章必须回填扩批结构决策执行回执。`
    : ''
  const instruction = trendInstruction
    ? `${trendInstruction}${baseInstruction}`
    : baseInstruction
  const observationMetrics = [
    ...(effectiveness?.visible ? [
      `通过率 ${baselinePassRate}% -> ${currentPassRate}%`,
      `失败主因 ${baselineFailureReasonCount} -> ${currentFailureReasonCount}`,
      currentRecurrenceInterval > 0 ? `修复后第${currentRecurrenceInterval}个扩批批次复发` : '修复后暂无同段复发',
    ] : []),
    ...(decisionTrendWarn && topFailedRequirement ? [
      `结构决策漏项：${text(topFailedRequirement.label, '执行要求')} ${Number(topFailedRequirement.count || 0)}`,
    ] : []),
    ...(defaultFiveChapterLaneRedesign ? [
      `恢复判定连续失效 ${defaultFiveChapterLaneRedesign.relapseCount} 次`,
      ...defaultFiveChapterLaneRedesign.repeatedFailureReasons.map((reason: string) => `同维复发：${reason}`),
    ] : []),
  ]

  return {
    visible: true,
    label: '结构修复决策',
    recommendation,
    targetChapterCount,
    modeLabel,
    summary: text(effectiveness?.summary, text(decisionTrend?.summary)),
    instruction,
    sourceRunId: effectiveness?.source_run_id ?? effectiveness?.sourceRunId ?? null,
    segmentKey: text(effectiveness?.segment_key || effectiveness?.segmentKey || decisionTrend?.latest_segment_key || decisionTrend?.latestSegmentKey || topFailedSegment?.key),
    segmentLabel,
    observationMetrics,
    ...(defaultFiveChapterLaneRedesign ? { defaultFiveChapterLaneRedesign } : {}),
  }
}

export function buildNextBatchBriefStartChecklist(args: {
  planning: PlanningWorkspaceModel
  chapters: AutoCreationNextBatchBriefChapter[]
  readerPayoffPlan: string
  mainlineFocus: string
  forbiddenBoundary: string
  expansionStructureVerification?: AnyRecord | null
  expansionStructureDecision?: AnyRecord | null
}): AutoCreationNextBatchBriefStartChecklistItem[] {
  const chapterTasks = args.chapters
    .map(item => item.chapterTask || item.conflict)
    .filter(Boolean)
    .slice(0, 3)
    .join(' / ')
  const innovationLanes = Array.isArray(args.planning.longformBattleDesk?.lanes)
    ? args.planning.longformBattleDesk.lanes
    : []
  const innovationLane = innovationLanes.find(item => item.key === 'innovation_ip')
  const innovationDetail = firstText(
    innovationLane?.detail,
    args.planning.mainline.currentStageConflict,
    args.planning.mainline.readerPromise,
  )

  const checklist = [
    checklistItem(
      'core_promise',
      '核心承诺',
      args.planning.mainline.readerPromise,
      '缺核心读者承诺，批量生成前需要先明确这本书到底让读者追什么。',
    ),
    checklistItem(
      'story_drive',
      '故事驱动力',
      firstText(args.mainlineFocus, chapterTasks),
      '缺逐章冲突或主线推进，连续生成容易变成流水账。',
    ),
    checklistItem(
      'reader_payoff',
      '读者回报',
      args.readerPayoffPlan,
      '缺升级、打脸、揭秘或情绪兑现计划，建议先补本批爽点。',
    ),
    checklistItem(
      'innovation',
      '创新/IP记忆点',
      innovationDetail,
      '缺本批差异化表达或标志性场面，建议补一个能被读者记住的看点。',
    ),
    checklistItem(
      'forbidden_boundary',
      '禁写边界',
      args.forbiddenBoundary,
      '缺禁写边界，批量生成可能跳过质检、提前揭底或误改长期设定。',
    ),
  ]
  if (args.expansionStructureVerification) {
    checklist.push(checklistItem(
      'expansion_structure',
      '扩批结构验证',
      firstText(
        args.expansionStructureVerification.fixed_segment_role,
        args.expansionStructureVerification.conflict_rotation,
        args.expansionStructureVerification.explicit_payoff,
      ),
      '已修复扩批结构，本批需要用2-3章验证固定段落职责、冲突换源、显性回报和章末追读。',
    ))
  }
  if (args.expansionStructureDecision) {
    checklist.push(checklistItem(
      'expansion_structure',
      '结构修复决策',
      firstText(
        args.expansionStructureDecision.instruction,
        args.expansionStructureDecision.summary,
        args.expansionStructureDecision.modeLabel,
      ),
      '结构修复有效性已决定本批扩批策略，必须按该决策执行章节职责和观察指标。',
    ))
  }
  return checklist
}

export function buildNextBatchBrief(args: {
  planning: PlanningWorkspaceModel
  writing: WritingCockpitModel
  safeChapterCount: number
  chapters?: AnyRecord[] | null
  expansionStructureVerificationSeed?: AnyRecord | null
  safeBatchExpansionPolicy?: AnyRecord | null
}): AutoCreationNextBatchBrief {
  if (args.safeChapterCount <= 0) return emptyNextBatchBrief()
  const targetNo = Number(args.writing.nextChapter?.chapterNo || 0)
  if (!targetNo) return emptyNextBatchBrief()
  const chaptersByNo = new Map(arrayValue(args.chapters)
    .map((chapter: AnyRecord) => [Number(chapter?.chapterNo ?? chapter?.chapter_no ?? 0), chapter])
    .filter(([chapterNo]) => Boolean(chapterNo)))
  const routeChapters = arrayValue(args.planning.futureRoute)
    .map(normalizeRouteChapter)
    .filter((item): item is AutoCreationNextBatchBriefChapter => Boolean(item))
    .filter(item => item.chapterNo >= targetNo)
    .sort((a, b) => a.chapterNo - b.chapterNo)
    .slice(0, args.safeChapterCount)
  const existingNos = new Set(routeChapters.map(item => item.chapterNo))
  const targetFallback = normalizeRouteChapter({
    chapterNo: targetNo,
    title: args.writing.nextChapter?.title,
    chapterTask: args.writing.nextChapter?.chapterGoal,
    conflict: args.writing.nextChapter?.conflict,
    endingHook: args.writing.nextChapter?.endingHook,
    mainlineProgress: args.planning.mainline.nextTurn,
    styleSampleStrategy: styleSampleStrategyFromRecord(args.writing.nextChapter as AnyRecord),
  })
  if (!existingNos.has(targetNo)) {
    if (targetFallback) routeChapters.unshift(targetFallback)
  } else if (targetFallback) {
    const targetIndex = routeChapters.findIndex(item => item.chapterNo === targetNo)
    if (targetIndex >= 0) {
      routeChapters[targetIndex] = mergeRouteChapterPlan(routeChapters[targetIndex], targetFallback)
    }
  }
  const chapters = routeChapters.slice(0, args.safeChapterCount).map(chapter => {
    const sourceChapter = chaptersByNo.get(chapter.chapterNo)
    const styleSampleStrategy = chapter.styleSampleStrategy || styleSampleStrategyFromRecord(sourceChapter)
    const styleSampleKeys = chapter.styleSampleKeys?.length ? chapter.styleSampleKeys : styleSampleKeysFromStrategy(styleSampleStrategy)
    return styleSampleKeys.length
      ? { ...chapter, styleSampleStrategy, styleSampleKeys }
      : chapter
  })
  if (!chapters.length) return emptyNextBatchBrief()
  const mainlineProgress = chapters.map(item => item.mainlineProgress).filter(Boolean)
  const conflicts = chapters.map(item => item.conflict).filter(Boolean)
  const batchGoal = [
    args.planning.mainline.currentVolumeGoal ? `卷目标：${args.planning.mainline.currentVolumeGoal}` : '',
    chapters[chapters.length - 1]?.mainlineProgress ? `本批推进到：${chapters[chapters.length - 1].mainlineProgress}` : '',
  ].filter(Boolean).join('；') || '保持当前卷目标连续推进。'
  const readerPayoffPlan = [
    args.planning.mainline.payoffModel ? `爽点模型：${args.planning.mainline.payoffModel}` : '',
    chapters.map(item => item.endingHook).filter(Boolean).slice(0, 3).join(' / '),
  ].filter(Boolean).join('；') || '每章保留明确读者回报和章末钩子。'
  const mainlineFocus = mainlineProgress.join(' -> ') || args.planning.mainline.currentStageConflict || '保持主线推进不偏移。'
  const forbiddenBoundary = [
    '不得跳过单章质检、修订和故事状态回填。',
    args.planning.mainline.risks[0] ? `避开风险：${args.planning.mainline.risks[0]}` : '',
    conflicts.length ? `冲突必须逐章落地：${conflicts.slice(0, 3).join(' / ')}` : '',
  ].filter(Boolean).join('；')
  const expansionStructureVerification = buildSafeBatchExpansionStructureVerification({
    seed: args.expansionStructureVerificationSeed,
    chapters,
  })
  const expansionStructureDecision = buildSafeBatchExpansionStructureDecision(args.safeBatchExpansionPolicy)

  return {
    visible: true,
    chapterRangeLabel: chapterRangeLabel(chapters),
    batchGoal,
    readerPayoffPlan,
    mainlineFocus,
    forbiddenBoundary,
    expansionStructureVerification,
    expansionStructureDecision,
    startChecklist: buildNextBatchBriefStartChecklist({
      planning: args.planning,
      chapters,
      readerPayoffPlan,
      mainlineFocus,
      forbiddenBoundary,
      expansionStructureVerification,
      expansionStructureDecision,
    }),
    chapters,
  }
}

export function chapterNoLabels(chapters: AutoCreationNextBatchBriefChapter[]) {
  return chapters.map(item => `第${item.chapterNo}章`).join('、')
}

export function nextBatchBriefMissingItems(
  nextBatchBrief: AutoCreationNextBatchBrief,
  expectedChapterCount: number,
) {
  if (expectedChapterCount <= 0) return []
  if (!nextBatchBrief.visible || nextBatchBrief.chapters.length === 0) return ['缺少下一批任务书']

  const missingCoverage = expectedChapterCount > 1 && nextBatchBrief.chapters.length < expectedChapterCount
    ? [`只覆盖 ${nextBatchBrief.chapters.length}/${expectedChapterCount} 章`]
    : []
  const missingTask = nextBatchBrief.chapters.filter(item => !text(item.chapterTask))
  const missingConflict = nextBatchBrief.chapters.filter(item => !text(item.conflict))
  const missingHook = nextBatchBrief.chapters.filter(item => !text(item.endingHook))
  const missingMainline = nextBatchBrief.chapters.filter(item => !text(item.mainlineProgress))
  return [
    ...missingCoverage,
    missingTask.length ? `缺逐章职责：${chapterNoLabels(missingTask)}` : '',
    missingConflict.length ? `缺冲突落点：${chapterNoLabels(missingConflict)}` : '',
    missingHook.length ? `缺章末钩子：${chapterNoLabels(missingHook)}` : '',
    missingMainline.length ? `缺主线推进：${chapterNoLabels(missingMainline)}` : '',
  ].filter(Boolean)
}

export function buildNextBatchBriefSignal(
  nextBatchBrief: AutoCreationNextBatchBrief,
  expectedChapterCount: number,
): AutoCreationBatchGuardrailSignal {
  if (expectedChapterCount <= 0) {
    return signal('批次任务书', 'ok', '当前没有可放行的安全连写批次。')
  }
  if (!nextBatchBrief.visible || nextBatchBrief.chapters.length === 0) {
    return signal('批次任务书', 'block', '缺少下一批任务书，无法判断连续生成会推进什么。')
  }

  const issues = nextBatchBriefMissingItems(nextBatchBrief, expectedChapterCount)

  if (!issues.length) {
    return signal(
      '批次任务书',
      'ok',
      `下一批任务书覆盖 ${nextBatchBrief.chapterRangeLabel}，本批目标、读者回报、主线推进和章末钩子可检查。`,
    )
  }

  const firstChapter = nextBatchBrief.chapters[0]
  const firstChapterUsable = Boolean(
    text(firstChapter?.chapterTask)
    && text(firstChapter?.conflict)
    && text(firstChapter?.endingHook)
    && text(firstChapter?.mainlineProgress),
  )
  const status: AutoCreationBatchGuardrailSignalStatus = firstChapterUsable ? 'warn' : 'block'
  const detail = status === 'warn'
    ? `下一批任务书还不适合多章连写，${issues.slice(0, 3).join('；')}。本轮先降为单章推进。`
    : `下一批任务书不足以开写，${issues.slice(0, 3).join('；')}。先补章节任务书或滚动规划。`
  return signal('批次任务书', status, detail)
}

export function emptyNextBatchBriefRepair(): AutoCreationBatchBriefRepair {
  return {
    visible: false,
    status: 'ok',
    title: '',
    summary: '',
    missingItems: [],
    action: planningAction('update_rolling_plan', '批次任务书完整时无需补齐。', '补齐批次任务书'),
  }
}

export function buildNextBatchBriefRepair(
  nextBatchBrief: AutoCreationNextBatchBrief,
  expectedChapterCount: number,
  batchBriefSignal: AutoCreationBatchGuardrailSignal,
): AutoCreationBatchBriefRepair {
  if (batchBriefSignal.status === 'ok') return emptyNextBatchBriefRepair()
  const missingItems = nextBatchBriefMissingItems(nextBatchBrief, expectedChapterCount)
  return {
    visible: true,
    status: batchBriefSignal.status,
    title: '补齐下一批任务书',
    summary: batchBriefSignal.status === 'block'
      ? '下一批还没有达到开写条件，先补齐本批目标、逐章职责、冲突和钩子。'
      : '当前章可以继续推进，但多章连写前需要补齐后续章节职责、冲突和钩子。',
    missingItems,
    action: planningAction('update_rolling_plan', batchBriefSignal.detail, '补齐批次任务书', {
      source: 'batch_brief_repair',
      missing_items: missingItems,
      next_batch_brief: nextBatchBrief,
      expected_chapter_count: expectedChapterCount,
    }),
  }
}

export function styleSampleEffectivenessRows(effectiveness: AnyRecord | null | undefined) {
  if (!effectiveness) return []
  if (Array.isArray(effectiveness?.samples)) return effectiveness.samples
  if (Array.isArray(effectiveness?.items)) return effectiveness.items
  return arrayValue(effectiveness)
}

export function styleSampleEffectivenessRisky(row: AnyRecord) {
  const riskLabel = text(row?.risk_label, text(row?.riskLabel))
  const usageCount = numberValue(row?.usage_count ?? row?.usageCount) ?? 0
  const hitRate = numberValue(row?.hit_rate ?? row?.hitRate) ?? 100
  const missedCount = numberValue(row?.missed_count ?? row?.missedCount) ?? 0
  const copyRiskCount = numberValue(row?.copy_risk_count ?? row?.copyRiskCount) ?? 0
  return /需复盘|风险|低命中|照搬/.test(riskLabel)
    || missedCount > 0
    || copyRiskCount > 0
    || (usageCount > 0 && hitRate < 80)
}

export function styleSampleEffectivenessRiskReason(row: AnyRecord) {
  const riskLabel = text(row?.risk_label, text(row?.riskLabel))
  const hitRate = numberValue(row?.hit_rate ?? row?.hitRate)
  const missedCount = numberValue(row?.missed_count ?? row?.missedCount)
  const copyRiskCount = numberValue(row?.copy_risk_count ?? row?.copyRiskCount)
  return [
    riskLabel,
    hitRate !== null ? `命中率 ${hitRate}%` : '',
    missedCount ? `缺口 ${missedCount}` : '',
    copyRiskCount ? `照搬风险 ${copyRiskCount}` : '',
  ].filter(Boolean).join('，') || '样章效果回收提示需复盘'
}

export function buildStyleSampleBatchPreflight(
  nextBatchBrief: AutoCreationNextBatchBrief,
  effectiveness: AnyRecord | null | undefined,
) {
  const riskyRows = styleSampleEffectivenessRows(effectiveness)
    .filter(styleSampleEffectivenessRisky)
  const riskyByKey = new Map(riskyRows
    .map((row: AnyRecord) => [text(row?.sample_key, text(row?.sampleKey)), row])
    .filter(([key]) => Boolean(key)))
  const selections = nextBatchBrief.chapters.flatMap(chapter => {
    const keys = chapter.styleSampleKeys?.length
      ? chapter.styleSampleKeys
      : styleSampleKeysFromStrategy(chapter.styleSampleStrategy)
    return keys
      .filter(key => riskyByKey.has(key))
      .map(key => ({
        chapter_no: chapter.chapterNo,
        chapter_title: chapter.title,
        sample_key: key,
        reason: styleSampleEffectivenessRiskReason(riskyByKey.get(key) || {}),
        effectiveness: riskyByKey.get(key) || {},
      }))
  })
  const riskySampleKeys = Array.from(new Set(selections.map(item => item.sample_key))).filter(Boolean)
  const affectedChapterNos = Array.from(new Set(selections.map(item => Number(item.chapter_no || 0)).filter(Boolean))).sort((a, b) => a - b)
  const recommendedRepairAction = {
    action: 'replace',
    label: '换样章并重审任务书',
    requires_task_book_reconfirm: true,
  }
  const repairTasks = selections.map(item => ({
    task_type: 'repair_task_book',
    issue_type: 'style_sample_task_book_rebuild',
    severity: Number(item.effectiveness?.copy_risk_count || item.effectiveness?.copyRiskCount || 0) > 0 ? 'high' : 'medium',
    title: `第${item.chapter_no}章换样章并重审任务书`,
    message: `第${item.chapter_no}章《${item.chapter_title || '未命名'}》任务书仍选择风险样章「${item.sample_key}」：${item.reason}。`,
    action: recommendedRepairAction.label,
    acceptance_criteria: [
      '任务书已换用表现稳定或更匹配本章场景的风格样章',
      '换样章后任务书确认状态已清除，并由作者重新确认',
      '重新生成正文前不再选择低命中或照搬风险样章',
    ],
    task_status: 'open',
    source: 'style_sample_batch_preflight',
    chapter_no: item.chapter_no,
    sample_key: item.sample_key,
    sample_effectiveness: item.effectiveness,
    recommended_repair_action: recommendedRepairAction,
  }))
  const status = selections.length ? 'warn' : 'ok'
  return {
    visible: nextBatchBrief.visible || riskyRows.length > 0,
    status,
    risk_count: selections.length,
    summary: selections.length
      ? `下一批任务书${affectedChapterNos.map(chapterNo => `第${chapterNo}章`).join('、')}仍选择需复盘样章：${riskySampleKeys.join('、')}。先换样章并重审任务书，再扩大安全连写。`
      : riskyRows.length
        ? '下一批任务书没有继续选择需复盘样章。'
        : '样章效果回收没有待复盘风险，下一批可按任务书样章策略继续。',
    risky_sample_keys: riskySampleKeys,
    affected_chapter_nos: affectedChapterNos,
    selected_samples: selections,
    recommended_repair_action: recommendedRepairAction,
    repair_tasks: repairTasks,
  }
}

export function buildStyleSampleTaskBookRecheckPlan(args: {
  items: AnyRecord[]
  styleSampleBatchPreflight?: AnyRecord | null
}) {
  const styleItems = arrayValue(args.items)
    .filter(item => {
      const task = item?.task || item
      return text(task?.issue_type) === 'style_sample_task_book_rebuild'
        && text(task?.task_status) === 'needs_review'
    })
  const preflight = args.styleSampleBatchPreflight || null
  if (!preflight) {
    return {
      status: 'needs_preflight',
      resolvedItems: [],
      blockedItems: styleItems,
      summary: '请先刷新自动创作总控台，取得最新风格样章预检后再批量关闭样章任务书。',
      riskyChapterNos: [],
    }
  }

  const selectedSamples = arrayValue(preflight.selected_samples || preflight.selectedSamples)
  const affectedChapterNos = Array.from(new Set([
    ...arrayValue(preflight.affected_chapter_nos || preflight.affectedChapterNos)
      .map(item => Number(item))
      .filter(chapterNo => Number.isFinite(chapterNo) && chapterNo > 0),
    ...selectedSamples
      .map(item => Number(item?.chapter_no || item?.chapterNo || 0))
      .filter(chapterNo => Number.isFinite(chapterNo) && chapterNo > 0),
  ])).sort((a, b) => a - b)
  const riskActive = text(preflight.status) === 'warn'
    || Number(preflight.risk_count || preflight.riskCount || 0) > 0
    || selectedSamples.length > 0

  if (!riskActive || affectedChapterNos.length === 0) {
    return {
      status: styleItems.length ? 'all_clear' : 'empty',
      resolvedItems: styleItems,
      blockedItems: [],
      summary: `样章任务书复检通过 ${styleItems.length} 项，下一批任务书已避开风险样章。`,
      riskyChapterNos: [],
    }
  }

  const riskyChapterSet = new Set(affectedChapterNos)
  const resolvedItems = styleItems.filter(item => {
    const task = item?.task || item
    const chapterNo = Number(task?.chapter_no || task?.chapterNo || 0)
    return Number.isFinite(chapterNo) && chapterNo > 0 && !riskyChapterSet.has(chapterNo)
  })
  const blockedItems = styleItems.filter(item => !resolvedItems.includes(item))
  return {
    status: resolvedItems.length > 0 ? 'partial' : 'blocked',
    resolvedItems,
    blockedItems,
    summary: `样章任务书复检通过 ${resolvedItems.length} 项，仍需重审 ${blockedItems.length} 项。`,
    riskyChapterNos: affectedChapterNos,
  }
}

export function compactChapterNoEvidence(chapterNos: number[]) {
  if (!chapterNos.length) return ''
  const visibleNos = chapterNos.slice(0, 6).join('、')
  return `第${visibleNos}${chapterNos.length > 6 ? `等${chapterNos.length}章` : '章'}`
}

export function buildStyleSampleTaskBookRecoveryEvidence(runRecords: AnyRecord[]) {
  const resolvedTasks = runRecords.flatMap(run => {
    if (text(run?.run_type) !== 'longform_production_repair') return []
    const input = parsePayload(run?.input_ref, { owner: run, kind: 'run', field: 'input_ref' }) || {}
    const output = parsePayload(run?.output_ref, { owner: run, kind: 'run', field: 'output_ref' }) || {}
    const source = firstText(input?.source, output?.report?.source)
    if (source !== 'style_sample_batch_preflight') return []
    return [
      ...arrayValue(output?.tasks),
      ...arrayValue(output?.repairTasks),
    ].filter(task => text(task?.issue_type ?? task?.issueType) === 'style_sample_task_book_rebuild'
      && isResolvedTaskStatus(task?.task_status ?? task?.status))
  })
  if (!resolvedTasks.length) return []
  const chapterNos = Array.from(new Set(resolvedTasks
    .map(task => Number(task?.chapter_no ?? task?.chapterNo ?? 0))
    .filter(chapterNo => Number.isFinite(chapterNo) && chapterNo > 0)))
    .sort((a, b) => a - b)
  return [
    `样章任务书复检通过 ${resolvedTasks.length} 项`,
    chapterNos.length ? `${compactChapterNoEvidence(chapterNos)}样章已重审` : '',
  ].filter(Boolean)
}

export function buildStyleSampleBatchPreflightSignal(preflight: AnyRecord): AutoCreationBatchGuardrailSignal {
  if (preflight.status === 'warn') {
    return signal('风格样章预检', 'warn', preflight.summary)
  }
  return signal('风格样章预检', 'ok', preflight.summary || '下一批任务书没有选择风险样章。')
}

export function emptyNextBatchBriefRecovery(): AutoCreationBatchBriefRecovery {
  return {
    visible: false,
    title: '',
    summary: '',
    restoredChapterCount: 0,
    evidence: [],
    action: opsAction('start_safe_batch_generation', '开始安全连写', '当前批次尚未恢复到多章连写。', true),
  }
}

export function buildNextBatchBriefRecoveryEvidence(args: {
  status: AutoCreationBatchGuardrailStatus
  safeChapterCount: number
  nextBatchBrief: AutoCreationNextBatchBrief
  batchBriefSignal: AutoCreationBatchGuardrailSignal
  evidence?: string[]
}) {
  if (args.status !== 'ready' || args.safeChapterCount < 2 || args.batchBriefSignal.status !== 'ok') {
    return []
  }
  return [
    '批次任务书完整',
    `安全批次 ${args.safeChapterCount} 章`,
    args.nextBatchBrief.chapterRangeLabel,
    args.nextBatchBrief.readerPayoffPlan ? '读者回报已明确' : '',
    args.nextBatchBrief.mainlineFocus ? '主线焦点已明确' : '',
    ...arrayValue(args.evidence),
  ].filter(Boolean)
}

export function buildRecoveryEvidenceReleaseSummary(args: {
  status: AutoCreationBatchGuardrailStatus
  safeChapterCount: number
  allowedChapterNos: number[]
  nextBatchBrief: AutoCreationNextBatchBrief
  recoveryEvidenceProductionGate?: AnyRecord | null
  recoveryEvidenceSourceRiskProfile?: AnyRecord | null
}) {
  const gate = args.recoveryEvidenceProductionGate || null
  const profile = args.recoveryEvidenceSourceRiskProfile || null
  if (args.status !== 'ready') return null
  const strengthenedRepairSources = arrayValue(profile?.sources)
    .filter(source => {
      const releaseFailureCount = Number(source?.release_failure_count || source?.releaseFailureCount || 0)
      const closure = source?.deep_repair_effect?.strengthened_repair_closure
        || source?.deepRepairEffect?.strengthenedRepairClosure
        || null
      return releaseFailureCount >= 2 && text(closure?.status) === 'converged'
    })
    .map(source => {
      const closure = source?.deep_repair_effect?.strengthened_repair_closure
        || source?.deepRepairEffect?.strengthenedRepairClosure
        || null
      return {
        source: text(source?.source || source?.sourceMode),
        label: text(source?.label || source?.sourceLabel || source?.source, '恢复依据来源'),
        status: 'converged',
        status_label: text(closure?.label, '强化深修已收敛'),
        latest_repair_run_id: closure?.latest_repair_run_id ?? closure?.latestRepairRunId ?? null,
        latest_repair_at: text(closure?.latest_repair_at || closure?.latestRepairAt),
      }
    })
    .filter(source => source.source)
  if (text(gate?.status) !== 'ok' && !strengthenedRepairSources.length) return null
  const clearedSources = text(gate?.status) === 'ok' ? arrayValue(gate?.sources)
    .filter(source => text(source?.status) === 'cleared')
    .map(source => ({
      source: text(source?.source || source?.sourceMode),
      label: text(source?.label || source?.sourceLabel || source?.source, '恢复依据来源'),
      status: 'cleared',
      status_label: text(source?.status_label || source?.statusLabel, '生产阻断已解除'),
      task_count: Number(source?.task_count || source?.taskCount || 0),
      chapter_nos: arrayValue(source?.chapter_nos || source?.chapterNos),
      source_task_indices: arrayValue(source?.source_task_indices || source?.sourceTaskIndices),
    }))
    : []
  if (!clearedSources.length && !strengthenedRepairSources.length) return null
  const evidence = [
    clearedSources.length ? '恢复依据治理队列已闭环' : '',
    ...clearedSources.map(source => `${source.label}：生产阻断已解除`),
    ...strengthenedRepairSources.map(source => `${source.label}：${source.status_label}`),
  ].filter(Boolean)
  return {
    status: 'released',
    source: clearedSources.length ? 'recovery_evidence_governance_queue' : 'recovery_evidence_source_risk_profile',
    summary: clearedSources.length
      ? `恢复依据治理队列已闭环，可恢复 ${Math.max(2, args.safeChapterCount)} 章安全连写。`
      : `恢复依据画像强化深修已收敛，可恢复 ${Math.max(2, args.safeChapterCount)} 章安全连写。`,
    safe_chapter_count: args.safeChapterCount,
    allowed_chapter_nos: args.allowedChapterNos,
    next_batch_label: args.nextBatchBrief.chapterRangeLabel,
    cleared_source_count: clearedSources.length,
    cleared_sources: clearedSources,
    strengthened_repair_source_count: strengthenedRepairSources.length,
    strengthened_repair_sources: strengthenedRepairSources,
    evidence,
  }
}

export function buildNextBatchBriefRecovery(args: {
  status: AutoCreationBatchGuardrailStatus
  safeChapterCount: number
  nextBatchBrief: AutoCreationNextBatchBrief
  batchBriefSignal: AutoCreationBatchGuardrailSignal
  recommendedAction: AutoCreationDirectorAction
  evidence?: string[]
}): AutoCreationBatchBriefRecovery {
  if (args.status !== 'ready' || args.safeChapterCount < 2 || args.batchBriefSignal.status !== 'ok') {
    return emptyNextBatchBriefRecovery()
  }
  return {
    visible: true,
    title: '已恢复多章安全连写',
    summary: `${args.nextBatchBrief.chapterRangeLabel || `未来 ${args.safeChapterCount} 章`} 的批次目标、读者回报、主线推进和章末钩子已具备，可按护栏进入小批量生产。`,
    restoredChapterCount: args.safeChapterCount,
    evidence: buildNextBatchBriefRecoveryEvidence(args),
    action: args.recommendedAction,
  }
}

export function buildLongformMemoryAnchor(storyState: AnyRecord) {
  const state = storyState || {}
  const global = state.global || state
  const characterStates = arrayValue(state.characters)
    .map((item: any) => {
      const name = firstText(item?.name, item?.character_name, item?.title)
      if (!name) return ''
      const status = firstText(item?.status, item?.state, item?.current_state, item?.arc_state)
      const location = firstText(item?.location, item?.current_location)
      return [name, status, location ? `@${location}` : ''].filter(Boolean).join('：').replace('：@', '@')
    })
    .filter(Boolean)
    .slice(0, 8)
  const openQuestions = [
    ...arrayValue(global?.open_questions),
    ...arrayValue(state?.open_questions),
  ].map((item: any) => firstText(item?.text, item?.summary, item?.description, item)).filter(Boolean)
  const payoffDebts = [
    ...arrayValue(global?.payoff_queue),
    ...arrayValue(global?.payoff_debts),
    ...arrayValue(state?.payoff_queue),
    ...arrayValue(state?.payoff_debts),
  ].map((item: any) => firstText(item?.text, item?.summary, item?.description, item)).filter(Boolean)
  const anchor = {
    last_updated_chapter: Number(state.last_updated_chapter || global.last_updated_chapter || 0) || null,
    core_promise: firstText(global.core_promise, global.reader_promise, global.promise, state.core_promise, state.reader_promise),
    current_volume_goal: firstText(global.current_volume_goal, global.volume_goal, state.current_volume_goal, state.volume_goal),
    current_mainline: firstText(global.current_mainline, global.mainline, state.current_mainline, state.mainline),
    character_states: characterStates,
    open_questions: Array.from(new Set(openQuestions)).slice(0, 8),
    payoff_debts: Array.from(new Set(payoffDebts)).slice(0, 8),
  }
  const hasAnchor = Boolean(
    anchor.last_updated_chapter
    || anchor.core_promise
    || anchor.current_volume_goal
    || anchor.current_mainline
    || anchor.character_states.length
    || anchor.open_questions.length
    || anchor.payoff_debts.length,
  )
  return hasAnchor ? anchor : null
}

export const SAFE_BATCH_MODEL_PIPELINE = [
  '章节任务书',
  '正文初稿',
  '字数门禁',
  '商业主编改稿',
  '自检修订',
  '故事状态/剧情线回填',
]

export function buildBatchPreflight(args: {
  status: AutoCreationBatchGuardrailStatus
  safeChapterCount: number
  releaseWindow: AutoCreationBatchReleaseWindow
  nextBatchBrief: AutoCreationNextBatchBrief
  guardrails: AutoCreationBatchGuardrailSignal[]
  storyState?: AnyRecord | null
  governanceRecheckMemory?: AutoCreationGovernanceRecheckMemory | null
  deliveryRiskCarryOver?: AnyRecord | null
  chapterHandoffContract?: AnyRecord | null
  storylineDecisionGate: AutoCreationStorylineDecisionGate
  styleSampleBatchPreflight?: AnyRecord | null
  recoveryEvidence?: string[]
  recoveryEvidenceProductionGate?: AnyRecord | null
  recoveryEvidenceReleaseSummary?: AnyRecord | null
  recoveryEvidenceSourceRiskProfile?: AnyRecord | null
  strengthenedRepairAcceptanceTrend?: AutoCreationStrengthenedRepairAcceptanceTrend | null
  safeBatchExpansionPolicy?: AnyRecord | null
  safeBatchRecoveryRestoreConfirmation?: AnyRecord | null
  safeBatchRecoveryRestoreStabilityLane?: AnyRecord | null
}): AutoCreationBatchPreflight {
  const allowedChapterNos = args.releaseWindow.allowedChapters.map(chapter => Number(chapter.chapterNo || 0)).filter(Boolean)
  const blockedChapterNos = args.releaseWindow.blockedChapters.map(chapter => Number(chapter.chapterNo || 0)).filter(Boolean)
  const guardrailWarnings = args.guardrails
    .filter(item => item.status !== 'ok')
    .map(item => `${item.label}：${item.detail}`)
  const blockedWarnings = args.releaseWindow.blockedChapters
    .map(chapter => `第${chapter.chapterNo}章《${chapter.title}》被拦截：${chapter.reason}`)
  const warnings = Array.from(new Set([...guardrailWarnings, ...blockedWarnings])).slice(0, 8)
  const visible = args.nextBatchBrief.visible || allowedChapterNos.length > 0 || blockedChapterNos.length > 0
  const expansionStructureVerification = args.nextBatchBrief.expansionStructureVerification || null
  const summary = args.status === 'ready'
    ? `本批将按护栏放行 ${allowedChapterNos.length} 章：${args.nextBatchBrief.chapterRangeLabel || allowedChapterNos.map(no => `第${no}章`).join('、')}。`
    : args.status === 'caution'
      ? `本批只放行 ${allowedChapterNos.length || args.safeChapterCount} 章，后续章节需要先处理黄色风险。`
      : '当前护栏未通过，不会启动安全连写。'
  const longformMemoryAnchor = buildLongformMemoryAnchor(args.storyState || {})
  const storylineDecisionClosure = {
    status: args.storylineDecisionGate.status === 'ok' ? 'ok' : 'blocked',
    label: args.storylineDecisionGate.label,
    open_count: args.storylineDecisionGate.openCount,
    summary: args.storylineDecisionGate.summary,
    tasks: args.storylineDecisionGate.taskTitles,
  }
  const governanceRecheckMemory = args.governanceRecheckMemory?.visible
    ? {
      source_run_id: args.governanceRecheckMemory.sourceRunId || null,
      status: args.governanceRecheckMemory.status,
      label: args.governanceRecheckMemory.label,
      summary: args.governanceRecheckMemory.summary,
      evidence: args.governanceRecheckMemory.evidence,
      failed_evidence: args.governanceRecheckMemory.failedEvidence,
      watch_items: args.governanceRecheckMemory.watchItems,
      storyline_decision_task_count: args.governanceRecheckMemory.storylineDecisionTaskCount,
    }
    : null

  return {
    visible,
    status: args.status,
    title: '安全连写预执行确认',
    summary,
    allowedChapterNos,
    blockedChapterNos,
    modelPipeline: SAFE_BATCH_MODEL_PIPELINE,
    warnings,
    longformMemoryAnchor,
    governanceRecheckMemory,
    chapterHandoffContract: args.chapterHandoffContract || null,
    inputSnapshot: {
      source: 'auto_creation_safe_batch_preflight',
      guardrail_status: args.status,
      safe_chapter_count: args.safeChapterCount,
      allowed_chapter_nos: allowedChapterNos,
      blocked_chapter_nos: blockedChapterNos,
      chapter_range_label: args.nextBatchBrief.chapterRangeLabel,
      release_window: args.releaseWindow,
      next_batch_brief: args.nextBatchBrief,
      guardrails: args.guardrails,
      model_pipeline: SAFE_BATCH_MODEL_PIPELINE,
      warnings,
      ...(arrayValue(args.recoveryEvidence).length ? { recovery_evidence: arrayValue(args.recoveryEvidence) } : {}),
      ...(args.recoveryEvidenceProductionGate ? { recovery_evidence_production_gate: args.recoveryEvidenceProductionGate } : {}),
      ...(args.recoveryEvidenceReleaseSummary ? { recovery_evidence_release_summary: args.recoveryEvidenceReleaseSummary } : {}),
      ...(args.recoveryEvidenceSourceRiskProfile?.visible ? { recovery_evidence_source_risk_profile: args.recoveryEvidenceSourceRiskProfile } : {}),
      ...(args.strengthenedRepairAcceptanceTrend?.visible ? {
        strengthened_repair_acceptance_trend: strengthenedRepairAcceptanceTrendSnapshot(args.strengthenedRepairAcceptanceTrend),
      } : {}),
      ...(args.safeBatchExpansionPolicy?.visible ? {
        safe_batch_expansion_policy: safeBatchExpansionPolicySnapshot(args.safeBatchExpansionPolicy),
      } : {}),
      ...(args.safeBatchRecoveryRestoreConfirmation ? {
        safe_batch_recovery_restore_confirmation: args.safeBatchRecoveryRestoreConfirmation,
      } : {}),
      ...(args.safeBatchRecoveryRestoreStabilityLane ? {
        safe_batch_recovery_restore_stability_lane: args.safeBatchRecoveryRestoreStabilityLane,
      } : {}),
      ...(expansionStructureVerification ? {
        safe_batch_expansion_structure_verification: expansionStructureVerification,
      } : {}),
      storyline_decision_closure: storylineDecisionClosure,
      ...(governanceRecheckMemory ? { governance_recheck_memory: governanceRecheckMemory } : {}),
      ...(args.styleSampleBatchPreflight?.visible ? { style_sample_batch_preflight: args.styleSampleBatchPreflight } : {}),
      ...(args.deliveryRiskCarryOver ? { delivery_risk_carry_over: args.deliveryRiskCarryOver } : {}),
      ...(args.chapterHandoffContract ? { chapter_handoff_contract: args.chapterHandoffContract } : {}),
      ...(longformMemoryAnchor ? { longform_memory_anchor: longformMemoryAnchor } : {}),
    },
  }
}

export function buildBatchGuardrail(args: {
  planning: PlanningWorkspaceModel
  writing: WritingCockpitModel
  activeTasks: AnyRecord[]
  hasBlockingPlan: boolean
  hasModel: boolean
  mainAction: AutoCreationDirectorAction
  longformCapacity: AutoCreationLongformCapacity
  deliveryRiskGate: AutoCreationDeliveryRiskGate
  governanceRecheckMemory: AutoCreationGovernanceRecheckMemory
  storylineDecisionGate: AutoCreationStorylineDecisionGate
  chapterLaunchGate: AutoCreationChapterLaunchGate
  storyState?: AnyRecord | null
  chapters?: AnyRecord[] | null
  reviews?: AnyRecord[] | null
  styleSampleEffectiveness?: AnyRecord | null
  runRecords?: AnyRecord[] | null
}): AutoCreationBatchGuardrail {
  const planning = args.planning
  const writing = args.writing
  const future10 = planning.topStatus.future10Coverage
  const future100 = planning.topStatus.future100Coverage
  const planningDesk = writing.chapterPlanningDesk
  const acceptance = writing.chapterAcceptanceDesk
  const chapterHandoff = (writing as any).chapterHandoffDesk || null
  const chapterHandoffVisible = Boolean(chapterHandoff?.visible)
  const running = hasRunningTasks(args.activeTasks)
  const retentionActionNeeded = retentionNeedsAction(planning)
  const storylineActionNeeded = storylineNeedsAction(planning)
  const characterArcActionNeeded = characterArcNeedsAction(planning)
  const volumeBeatActionNeeded = volumeBeatNeedsAction(planning)
  const rhythmActionNeeded = rhythmNeedsAction(planning)
  const canonRunway = buildCanonRunway(writing)
  const future100Status = future100ReserveStatus(planning)
  const capacityStatus: AutoCreationBatchGuardrailSignalStatus = args.longformCapacity.status === 'ready'
    ? 'ok'
    : args.longformCapacity.status === 'blocked'
      ? 'block'
      : 'warn'
  const fatigue = planning.recentFatigueRadar
  const fatigueWarnings = arrayValue(fatigue?.signals).filter(item => text(item?.status) === 'warn')
  const fatigueStatus: AutoCreationBatchGuardrailSignalStatus = fatigue?.status === 'needs_attention' || fatigueWarnings.length > 0
    ? 'warn'
    : 'ok'
  const fatigueWarningDetail = [
    ...fatigueWarnings.map(item => text(item?.detail)).filter(Boolean),
    text(fatigue?.summary),
  ].filter(Boolean).join('；')
  const fatigueDetail = fatigueStatus === 'warn'
    ? firstText(
        fatigueWarningDetail,
        arrayValue(fatigue?.nextActions)[0],
        `${fatigueWarnings.length || 1} 类近10章同质化风险，需要先换冲突来源、回报形态、章末问题或可视化场面。`,
      )
    : firstText(fatigue?.summary, '近10章冲突来源、回报形态、章末钩子和可视化场面没有明显同质化。')
  const storyPressureLadder = planning.storyPressureLadder
  const storyPressureWarnings = arrayValue(storyPressureLadder?.signals).filter(item => text(item?.status) === 'warn')
  const storyPressureBlocks = arrayValue(storyPressureLadder?.signals).filter(item => text(item?.status) === 'block')
  const storyPressureStatus: AutoCreationBatchGuardrailSignalStatus = storyPressureLadder?.status === 'blocked' || storyPressureBlocks.length > 0
    ? 'block'
    : storyPressureLadder?.status === 'needs_attention' || storyPressureWarnings.length > 0
      ? 'warn'
      : 'ok'
  const storyPressureDetail = storyPressureStatus !== 'ok'
    ? firstText(
        storyPressureLadder?.summary,
        arrayValue(storyPressureLadder?.nextActions)[0],
        `${storyPressureWarnings.length || storyPressureBlocks.length || 1} 项故事压力风险，需要补明确压力源、冲突升级、赌注升级或反转逼迫。`,
      )
    : firstText(storyPressureLadder?.summary, '未来章节有明确压力源、冲突升级、赌注升级和反转逼迫。')
  const storyUnitWorkshop = planning.storyUnitWorkshop
  const storyUnitSignals = arrayValue(storyUnitWorkshop?.currentUnit?.signals)
  const storyUnitWarnings = storyUnitSignals.filter(item => text(item?.status) === 'warn')
  const storyUnitBlocks = storyUnitSignals.filter(item => text(item?.status) === 'block')
  const storyUnitStatus: AutoCreationBatchGuardrailSignalStatus = storyUnitWorkshop?.status === 'blocked' || storyUnitBlocks.length > 0
    ? 'block'
    : storyUnitWorkshop?.status === 'needs_attention' || storyUnitWarnings.length > 0
      ? 'warn'
      : 'ok'
  const storyUnitDetail = storyUnitStatus !== 'ok'
    ? firstText(
        storyUnitWorkshop?.summary,
        storyUnitWorkshop?.currentUnit?.summary,
        arrayValue(storyUnitWorkshop?.nextActions)[0],
        `${storyUnitWarnings.length || storyUnitBlocks.length || 1} 项剧情单元缺口，需要补入口钩子、压力升级、小高潮回报、伏笔/剧情线或出单元钩子。`,
      )
    : firstText(storyUnitWorkshop?.summary, '当前剧情单元入口、压力升级、小高潮回报、伏笔/剧情线和出单元钩子完整。')
  const serialReleaseInventory = buildSerialReleaseInventoryGuardrail(planning)
  const deliveryRiskStatus: AutoCreationBatchGuardrailSignalStatus = args.deliveryRiskGate.status === 'ok'
    ? 'ok'
    : args.deliveryRiskGate.status === 'block'
      ? 'block'
      : 'warn'
  const recoveryEvidenceProductionGate = buildRecoveryEvidenceProductionGate(arrayValue(args.runRecords))
  const recoveryEvidenceSourceRiskProfile = buildRecoveryEvidenceSourceRiskProfile(arrayValue(args.runRecords))
  const strengthenedRepairAcceptanceTrend = buildStrengthenedRepairAcceptanceTrend({
    runRecords: arrayValue(args.runRecords),
    chapters: arrayValue(args.chapters),
    reviews: arrayValue(args.reviews),
    storyState: args.storyState || {},
  })
  const recoveryEvidenceTrend = buildRecoveryEvidenceTrend(recoveryEvidenceSourceRiskProfile, strengthenedRepairAcceptanceTrend)
  const safeBatchExpansionFeedback = buildSafeBatchExpansionFeedback({
    runRecords: arrayValue(args.runRecords),
    chapters: arrayValue(args.chapters),
    reviews: arrayValue(args.reviews),
  })
  const safeBatchExpansionPolicy = buildSafeBatchExpansionPolicy(strengthenedRepairAcceptanceTrend, safeBatchExpansionFeedback)
  const safeBatchRecoveryRestoreConfirmation = buildSafeBatchRecoveryRestoreConfirmation(safeBatchExpansionPolicy)
  const safeBatchRecoveryRestoreStabilityLane = buildSafeBatchRecoveryRestoreStabilityLane(safeBatchExpansionPolicy)
  const productionRelapseReviewCta = buildProductionRelapseReviewCta(safeBatchExpansionPolicy, safeBatchRecoveryRestoreStabilityLane)
  const productionRelapseReviewStartsBatch = productionRelapseReviewCta
    && ['enter_five_chapter_observation', 'restore_default_lane'].includes(text(productionRelapseReviewCta.kind))
  const productionRelapseReviewNeedsRepair = text(productionRelapseReviewCta?.kind) === 'repair_production_relapse'
  const safeBatchRecoveryAction = safeBatchRecoveryRoadmapRecommendedAction(safeBatchExpansionPolicy.recoveryRoadmap)
  const safeBatchExpansionPolicyFeedback = safeBatchExpansionPolicy.expansionFeedback
    || safeBatchExpansionPolicy.expansion_feedback
    || null
  const safeBatchStructureRepairEffectiveness = safeBatchExpansionPolicyFeedback?.expansionStructureRepairEffectiveness
    || safeBatchExpansionPolicyFeedback?.expansion_structure_repair_effectiveness
    || null
  const expansionStructureRedesignDecisionActive = text(safeBatchStructureRepairEffectiveness?.recommendation) === 'escalate_structure_redesign'
  const expansionStructureVerificationSeed = buildResolvedSafeBatchExpansionStructureVerificationSeed(arrayValue(args.runRecords))
  const expansionStructureValidationActive = Boolean(
    expansionStructureVerificationSeed
    && safeBatchExpansionPolicy.status === 'recovering'
    && Number(safeBatchExpansionPolicy.targetChapterCount || 0) > 1,
  )
  const expansionStructureValidationTarget = expansionStructureValidationActive
    ? Math.max(1, Math.min(
      3,
      Number(safeBatchExpansionPolicy.targetChapterCount || 3),
      Number(future10.planned || 3),
      Number(planning.volumeBeatBudget?.plannedChapterCount || 3),
    ))
    : 0
  const strengthenedRepairAcceptanceSignalStatus = expansionStructureValidationActive && strengthenedRepairAcceptanceTrend.status === 'warn'
    ? 'ok'
    : strengthenedRepairAcceptanceTrend.status
  const strengthenedRepairAcceptanceSignalSummary = expansionStructureValidationActive && strengthenedRepairAcceptanceTrend.status === 'warn'
    ? `${strengthenedRepairAcceptanceTrend.summary}；扩批结构修复已闭环，本轮进入 ${expansionStructureValidationTarget} 章验证批。`
    : strengthenedRepairAcceptanceTrend.summary
  const hasScenePlan = planningDesk.scenePlanStatus === 'ready' || arrayValue(planningDesk.sceneCards).length > 0
  const currentChapterDelivered = !Boolean(acceptance.visible) && !chapterHandoffVisible
  const chapterPlanIssue = text(arrayValue(planningDesk.reasons)[0], '当前章任务书或场景卡未就绪。')
  const governanceBlocked = args.hasBlockingPlan
    || retentionActionNeeded
    || storylineActionNeeded
    || characterArcActionNeeded
    || volumeBeatActionNeeded
    || rhythmActionNeeded
  const chapterPlanReady = planningDesk.readiness === 'ready' && hasScenePlan
  const launchGateSignalStatus: AutoCreationBatchGuardrailSignalStatus = args.chapterLaunchGate.status === 'blocked'
    ? 'block'
    : args.chapterLaunchGate.status === 'warn'
      ? 'warn'
      : 'ok'

  const guardrails = [
    signal(
      '模型与任务队列',
      !args.hasModel || running ? 'block' : 'ok',
      running
        ? `${args.activeTasks.length} 个后台任务运行中，先等任务结束。`
        : args.hasModel ? '已选择可用模型，且没有运行中的生产任务。' : '未选择可用模型。',
    ),
    signal(
      '长线治理',
      governanceBlocked ? 'block' : 'ok',
      governanceBlocked ? args.mainAction.description : '创作契约、留存、剧情线、爆点预算和长篇节奏均可进入生产。',
    ),
    signal(
      canonRunway.label,
      canonRunway.status,
      canonRunway.detail,
    ),
    signal(
      '本章开写门禁',
      launchGateSignalStatus,
      args.chapterLaunchGate.summary,
    ),
    signal(
      '未清交稿风险',
      deliveryRiskStatus,
      args.deliveryRiskGate.summary,
    ),
    recoveryEvidenceProductionGate.signal,
    signal(
      recoveryEvidenceSourceRiskProfile.label,
      recoveryEvidenceSourceRiskProfile.status,
      recoveryEvidenceSourceRiskProfile.detail,
    ),
    ...(strengthenedRepairAcceptanceTrend.visible ? [signal(
      strengthenedRepairAcceptanceTrend.label,
      strengthenedRepairAcceptanceSignalStatus,
      strengthenedRepairAcceptanceSignalSummary,
    )] : []),
    signal(
      '未来10章规划',
      future10.ready ? 'ok' : 'block',
      future10.ready ? `未来10章覆盖 ${future10.label}。` : `未来10章仅覆盖 ${future10.label}，连续生产容易断线。`,
    ),
    signal(
      '未来100章储备',
      future100Status,
      future100.ready ? `未来100章覆盖 ${future100.label}。` : `未来100章覆盖 ${future100.label}，只适合小步推进。`,
    ),
    signal(
      serialReleaseInventory.label,
      serialReleaseInventory.status,
      serialReleaseInventory.detail,
    ),
    signal(
      safeBatchExpansionPolicy.label,
      'ok',
      safeBatchExpansionPolicy.summary,
    ),
    signal(
      '百万字产能',
      capacityStatus,
      args.longformCapacity.summary,
    ),
    signal(
      '故事压力阶梯',
      storyPressureStatus,
      storyPressureDetail,
    ),
    signal(
      '剧情单元',
      storyUnitStatus,
      storyUnitDetail,
    ),
    signal(
      '近10章疲劳',
      fatigueStatus,
      fatigueDetail,
    ),
    signal(
      '章节任务书/场景卡',
      chapterPlanReady ? 'ok' : 'block',
      chapterPlanReady ? '当前章任务书和场景卡已就绪。' : chapterPlanIssue,
    ),
    chapterHandoffVisible
      ? signal(
        '章节交接',
        'block',
        chapterHandoffDetail(chapterHandoff),
      )
      : signal(
        '当前章交稿',
        currentChapterDelivered ? 'ok' : 'block',
        currentChapterDelivered ? '当前没有未处理的交稿门禁。' : text(acceptance.statusLabel, '当前章仍需质检、修订或状态同步。'),
      ),
  ]

  const preliminaryBlocking = guardrails.find(item => item.status === 'block')
  const preliminaryWarning = guardrails.find(item => item.status === 'warn')
  const preliminaryStatus: AutoCreationBatchGuardrailStatus = preliminaryBlocking ? 'blocked' : preliminaryWarning ? 'caution' : 'ready'
  const preliminarySafeChapterCount = preliminaryStatus === 'blocked'
    ? 0
    : preliminaryStatus === 'caution'
      ? expansionStructureValidationActive ? expansionStructureValidationTarget : 1
      : productionRelapseReviewStartsBatch
        ? Math.max(5, Math.min(
          Number(productionRelapseReviewCta?.target_chapter_count || 5),
          Number(future10.planned || productionRelapseReviewCta?.target_chapter_count || 5),
          Number(planning.volumeBeatBudget?.plannedChapterCount || productionRelapseReviewCta?.target_chapter_count || 5),
        ))
        : Math.max(1, Math.min(
        Number(safeBatchExpansionPolicy.targetChapterCount || 3),
        Number(future10.planned || safeBatchExpansionPolicy.targetChapterCount || 3),
        Number(planning.volumeBeatBudget?.plannedChapterCount || safeBatchExpansionPolicy.targetChapterCount || 3),
      ))
  const queueRelease = writingQueueRelease(writing, preliminarySafeChapterCount)
  const queueLimitedPreliminarySafeChapterCount = queueRelease.signal.status === 'block'
    ? 0
    : Math.min(preliminarySafeChapterCount, queueRelease.safeChapterCount)
  const preliminaryNextBatchBrief = buildNextBatchBrief({
    planning,
    writing,
    safeChapterCount: queueLimitedPreliminarySafeChapterCount,
    chapters: args.chapters,
    expansionStructureVerificationSeed,
    safeBatchExpansionPolicy,
  })
  const batchBriefSignal = buildNextBatchBriefSignal(preliminaryNextBatchBrief, queueLimitedPreliminarySafeChapterCount)
  const briefRepair = buildNextBatchBriefRepair(preliminaryNextBatchBrief, queueLimitedPreliminarySafeChapterCount, batchBriefSignal)
  const styleSampleBatchPreflight = buildStyleSampleBatchPreflight(preliminaryNextBatchBrief, args.styleSampleEffectiveness)
  const styleSampleBatchSignal = buildStyleSampleBatchPreflightSignal(styleSampleBatchPreflight)
  const styleSampleRecoveryEvidence = buildStyleSampleTaskBookRecoveryEvidence(arrayValue(args.runRecords))
  guardrails.push(queueRelease.signal)
  guardrails.push(batchBriefSignal)
  guardrails.push(styleSampleBatchSignal)
  guardrails.push(signal('每章交稿回填', 'ok', '连续生产仍按单章质检、修订、故事状态同步和资产发现逐章回填。'))

  const blocking = guardrails.find(item => item.status === 'block')
  const warning = guardrails.find(item => item.status === 'warn')
  const status: AutoCreationBatchGuardrailStatus = blocking ? 'blocked' : warning ? 'caution' : 'ready'
  let recommendedAction = args.mainAction

  if (productionRelapseReviewNeedsRepair && productionRelapseReviewCta) {
    const productionRelapseCtaExecution = productionRelapseCtaExecutionPayload(
      productionRelapseReviewCta,
      'safe_batch_production_relapse_review_cta',
    )
    recommendedAction = opsAction('open_task_center', productionRelapseReviewCta.label, productionRelapseReviewCta.summary, false, {
      source: 'safe_batch_production_relapse_review_cta',
      production_relapse_review_cta: productionRelapseReviewCta,
      ...(productionRelapseCtaExecution ? { production_relapse_cta_execution: productionRelapseCtaExecution } : {}),
    })
  } else if (blocking?.label === '恢复依据生产闸门' || warning?.label === '恢复依据生产闸门') {
    const recoveryEvidenceNextAction = recoveryEvidenceProductionGate.snapshot.next_action || {
      action: 'review_governance_closure',
      label: '治理复查台',
      source: 'recovery_evidence_production_gate',
      sourceLabel: '恢复依据生产闸门',
      status: recoveryEvidenceProductionGate.snapshot.status,
      residualEvidence: [],
    }
    const recoveryEvidenceGovernanceQueue = buildRecoveryEvidenceGovernanceQueue(recoveryEvidenceProductionGate.snapshot, recoveryEvidenceNextAction)
    recommendedAction = opsAction('create_recovery_evidence_governance_queue', '生成恢复依据治理队列', recoveryEvidenceProductionGate.signal.detail, false, {
      source: 'recovery_evidence_production_gate',
      detail: recoveryEvidenceProductionGate.signal.detail,
      recoveryEvidenceNextAction,
      recoveryEvidenceGovernanceQueue,
    })
  } else if (warning?.label === '恢复依据画像') {
    const recoveryEvidenceGovernanceQueue = buildRecoveryEvidenceDeepRepairQueue(recoveryEvidenceTrend)
    const hasEscalatedDeepRepair = arrayValue(recoveryEvidenceGovernanceQueue.tasks)
      .some(task => text(task?.deep_repair_level || task?.deepRepairLevel) === 'escalated_after_recurrence')
    if (Number(recoveryEvidenceGovernanceQueue.task_count || 0) > 0) {
      recommendedAction = opsAction('create_recovery_evidence_governance_queue', hasEscalatedDeepRepair ? '生成强化深修队列' : '生成深层修复队列', recoveryEvidenceGovernanceQueue.summary || recoveryEvidenceTrend.summary || recoveryEvidenceSourceRiskProfile.detail, false, {
        source: 'recovery_evidence_source_risk_profile',
        detail: recoveryEvidenceSourceRiskProfile.detail,
        recoveryEvidenceTrend,
        recoveryEvidenceGovernanceQueue,
      })
    } else {
      const hasPendingStrengthenedRecheck = recoveryEvidenceTrend.sources.some(source => source.deepRepairEffect.strengthenedClosure.status === 'pending_recheck')
      recommendedAction = opsAction('open_task_center', hasPendingStrengthenedRecheck ? '查看强化深修复检' : '查看深修观察', recoveryEvidenceGovernanceQueue.summary || recoveryEvidenceTrend.summary || recoveryEvidenceSourceRiskProfile.detail, false, {
        source: 'recovery_evidence_source_risk_profile',
        detail: recoveryEvidenceSourceRiskProfile.detail,
        recoveryEvidenceTrend,
        recoveryEvidenceGovernanceQueue,
      })
    }
  } else if (warning?.label === '强化恢复验收趋势') {
    recommendedAction = opsAction('open_task_center', '查看强化复盘', strengthenedRepairAcceptanceTrend.summary, false, {
      source: 'strengthened_repair_acceptance_trend',
      strengthenedRepairAcceptanceTrend,
    })
  } else if (blocking?.label === '长线记忆' || warning?.label === '长线记忆') {
    recommendedAction = canonRunway.action
  } else if (blocking?.label === '剧情单元' || warning?.label === '剧情单元') {
    recommendedAction = planningAction('update_rolling_plan', storyUnitDetail, '更新滚动规划', {
      source: 'story_unit_repair',
      story_unit_workshop: storyUnitWorkshop,
    })
  } else if (blocking?.label === '批次任务书' || warning?.label === '批次任务书') {
    recommendedAction = briefRepair.action
  } else if (blocking?.label === '风格样章预检' || warning?.label === '风格样章预检') {
    recommendedAction = opsAction(
      'create_style_sample_batch_repair',
      '生成样章任务书修复',
      styleSampleBatchSignal.detail,
      false,
      styleSampleBatchPreflight,
    )
  } else if (blocking?.label === '连载库存' || warning?.label === '连载库存') {
    recommendedAction = serialReleaseInventory.action
  } else if (blocking?.label === '本章开写门禁' || warning?.label === '本章开写门禁') {
    recommendedAction = args.chapterLaunchGate.action
  } else if (blocking?.label === '写作队列放行' || warning?.label === '写作队列放行') {
    recommendedAction = queueRelease.action
  } else if (blocking?.label === '章节交接' || warning?.label === '章节交接') {
    recommendedAction = writingAction(
      (chapterHandoff?.actionKey || acceptance?.recommendedAcceptanceAction?.key || writing.primaryActionKey || 'accept_chapter_and_continue') as WritingCockpitActionKey,
      chapterHandoffDetail(chapterHandoff),
      text(chapterHandoff?.actionLabel, acceptance?.recommendedAcceptanceAction?.label || '处理章节交接'),
    )
  } else if (blocking?.label === '未清交稿风险' || warning?.label === '未清交稿风险') {
    recommendedAction = opsAction('create_delivery_risk_repair', '生成风险修复任务', args.deliveryRiskGate.summary, false, deliveryRiskRepairPayload(args.deliveryRiskGate))
  } else if (blocking?.label === '故事压力阶梯' || warning?.label === '故事压力阶梯') {
    recommendedAction = planningAction('update_rolling_plan', storyPressureDetail, '更新滚动规划', {
      source: 'story_pressure_repair',
      story_pressure_ladder: storyPressureLadder,
    })
  } else if (!blocking && warning?.label === '未来100章储备') {
    recommendedAction = planningAction('future100_generate', '先补齐更长线的未来100章储备，再扩大连续生产批次。')
  } else if (!blocking && warning?.label === '百万字产能') {
    recommendedAction = planningAction(args.longformCapacity.recommendedActionKey, args.longformCapacity.summary)
  } else if (!blocking && warning?.label === '近10章疲劳') {
    recommendedAction = planningAction('update_rolling_plan', fatigueDetail, '更新滚动规划', {
      source: 'recent_fatigue_repair',
      recent_fatigue_radar: fatigue,
    })
  }

  const safeChapterCount = status === 'blocked'
    ? 0
    : status === 'caution'
      ? expansionStructureValidationActive
        ? Math.max(1, Math.min(expansionStructureValidationTarget, queueLimitedPreliminarySafeChapterCount || expansionStructureValidationTarget))
        : Math.max(1, Math.min(1, queueLimitedPreliminarySafeChapterCount || 1))
      : queueLimitedPreliminarySafeChapterCount
  const nextBatchBriefChapterCount = safeChapterCount > 0
    ? safeChapterCount
    : expansionStructureRedesignDecisionActive
      ? 1
      : 0
  const nextBatchBrief = nextBatchBriefChapterCount === queueLimitedPreliminarySafeChapterCount
    ? preliminaryNextBatchBrief
    : buildNextBatchBrief({ planning, writing, safeChapterCount: nextBatchBriefChapterCount, chapters: args.chapters, expansionStructureVerificationSeed, safeBatchExpansionPolicy })
  const releaseWindow = buildBatchReleaseWindow(nextBatchBrief, queueRelease)
  const deliveryRiskCarryOver = normalizeSafeBatchDeliveryRiskCarryOver(
    planningDesk?.episodePlan?.deliveryRiskCarryOver
      || planningDesk?.episodePlan?.delivery_risk_carry_over
      || writing.nextChapter?.rawPayload?.pre_draft_brief?.delivery_risk_carry_over
      || writing.nextChapter?.rawPayload?.pre_draft_brief?.deliveryRiskCarryOver
      || null,
    Number(nextBatchBrief.chapters[0]?.chapterNo || 0) || null,
  )
  const chapterHandoffContract = normalizeSafeBatchChapterHandoffContract(
    writing,
    Number(nextBatchBrief.chapters[0]?.chapterNo || 0) || null,
  )
  const recoveryEvidenceReleaseSummary = buildRecoveryEvidenceReleaseSummary({
    status,
    safeChapterCount,
    allowedChapterNos: releaseWindow.allowedChapters.map(chapter => Number(chapter.chapterNo || 0)).filter(Boolean),
    nextBatchBrief,
    recoveryEvidenceProductionGate: recoveryEvidenceProductionGate.snapshot,
    recoveryEvidenceSourceRiskProfile,
  })
  const recoveryEvidenceReleaseEvidence = arrayValue(recoveryEvidenceReleaseSummary?.evidence)
  const recoveryEvidence = buildNextBatchBriefRecoveryEvidence({
    status,
    safeChapterCount,
    nextBatchBrief,
    batchBriefSignal,
    evidence: [
      ...styleSampleRecoveryEvidence,
      ...recoveryEvidenceReleaseEvidence,
    ],
  })
  const preflight = buildBatchPreflight({
    status,
    safeChapterCount,
    releaseWindow,
    nextBatchBrief,
    guardrails,
    storyState: args.storyState || {},
    governanceRecheckMemory: args.governanceRecheckMemory,
    deliveryRiskCarryOver,
    chapterHandoffContract,
    storylineDecisionGate: args.storylineDecisionGate,
    styleSampleBatchPreflight,
    recoveryEvidence,
    recoveryEvidenceProductionGate: recoveryEvidenceProductionGate.snapshot,
    recoveryEvidenceReleaseSummary,
    recoveryEvidenceSourceRiskProfile,
    strengthenedRepairAcceptanceTrend,
    safeBatchExpansionPolicy,
    safeBatchRecoveryRestoreConfirmation,
    safeBatchRecoveryRestoreStabilityLane,
  })

  if (status === 'ready') {
    const recoveryValidationBatchActive = !safeBatchRecoveryAction
      && safeBatchExpansionPolicy.status === 'recovering'
      && Number(safeBatchExpansionPolicy.targetChapterCount || 0) > 1
      && Number(safeBatchExpansionPolicy.targetChapterCount || 0) <= Number(safeBatchExpansionPolicy.baseChapterCount || 3)
    const expansionStructureVerification = nextBatchBrief?.expansionStructureVerification
      || nextBatchBrief?.expansion_structure_verification
      || null
    const productionRelapseValidationTemplate = expansionStructureVerification?.default_five_chapter_lane_template
      || expansionStructureVerification?.defaultFiveChapterLaneTemplate
      || null
    const productionRelapseReview = productionRelapseValidationTemplate?.production_relapse_review
      || productionRelapseValidationTemplate?.productionRelapseReview
      || null
    const productionRelapseValidationActive = !safeBatchRecoveryAction
      && Boolean(productionRelapseReview)
      && Number(safeChapterCount || 0) > 1
      && Number(safeChapterCount || 0) <= Number(safeBatchExpansionPolicy.baseChapterCount || 3)
    const productionRelapseTemplateVersionId = text(
      productionRelapseReview?.template_version_id
      || productionRelapseReview?.templateVersionId
      || productionRelapseValidationTemplate?.template_version_id
      || productionRelapseValidationTemplate?.templateVersionId,
    )
    const productionRelapseChapterNos = arrayValue(productionRelapseReview?.default_batch_chapter_nos || productionRelapseReview?.defaultBatchChapterNos)
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0)
    const productionRelapseFailureReasons = arrayValue(productionRelapseReview?.failure_reasons || productionRelapseReview?.failureReasons)
      .map(reason => text(reason))
      .filter(Boolean)
    const recoveryRestoreBatchActive = !safeBatchRecoveryAction
      && Boolean(safeBatchRecoveryRestoreConfirmation)
      && safeChapterCount >= Number(safeBatchRecoveryRestoreConfirmation?.target_chapter_count || 5)
    const recoveryRestoreObservationActive = !safeBatchRecoveryAction
      && text(safeBatchRecoveryRestoreStabilityLane?.status) === 'observing'
      && safeChapterCount >= 5
    const defaultFiveChapterLaneActive = !safeBatchRecoveryAction
      && text(safeBatchRecoveryRestoreStabilityLane?.status) === 'ready'
      && safeChapterCount >= 5
    const recoveryRestoreObservationConfirmation = recoveryRestoreObservationActive
      ? safeBatchRecoveryRestoreObservationConfirmation(safeBatchRecoveryRestoreStabilityLane, safeChapterCount)
      : null
    const startBatchSource = productionRelapseReviewStartsBatch
      ? 'safe_batch_production_relapse_review_cta'
      : productionRelapseValidationActive
      ? 'safe_batch_production_relapse_validation_batch'
      : recoveryValidationBatchActive
      ? 'safe_batch_recovery_validation_batch'
      : recoveryRestoreBatchActive || recoveryRestoreObservationActive
        ? 'safe_batch_recovery_restore_five_batch'
        : 'auto_creation_safe_batch'
    const startBatchLabel = productionRelapseReviewStartsBatch && productionRelapseReviewCta
      ? productionRelapseReviewCta.label
      : productionRelapseValidationActive
      ? '启动生产后验验证批'
      : recoveryValidationBatchActive
      ? `启动${safeChapterCount}章验证批`
      : recoveryRestoreBatchActive
        ? '确认恢复5章扩批'
        : recoveryRestoreObservationActive
          ? '继续5章观察批'
          : defaultFiveChapterLaneActive
            ? '启动默认5章档位'
            : '开始安全连写'
    const startBatchDescription = productionRelapseReviewStartsBatch && productionRelapseReviewCta
      ? productionRelapseReviewCta.summary
      : productionRelapseValidationActive
      ? [
        `启动${safeChapterCount}章生产后验验证批，逐章对照${productionRelapseTemplateVersionId ? `模板版本 ${productionRelapseTemplateVersionId}` : '当前模板版本'}和真实生产复发章节${productionRelapseChapterNos.length ? compactChapterNoEvidence(productionRelapseChapterNos) : '记录'}。`,
        productionRelapseFailureReasons.length ? `本轮只验证真实失败维度：${productionRelapseFailureReasons.join('、')}。` : '本轮只验证真实生产失败维度。',
        '关闭口径：必须输出 production_relapse_verdict.status=passed，且 remaining_failure_reasons 为空；不能只补 default_lane_*_delivered。',
      ].join(' ')
      : recoveryValidationBatchActive
      ? `安全连写恢复路线图已没有黄色修复层；先启动${safeChapterCount}章验证批，逐章回填核心守恒、读者回报、追读拉力和结构决策执行，再判断是否恢复 ${safeBatchExpansionPolicy.expandedChapterCount} 章。`
      : recoveryRestoreBatchActive
        ? `${safeBatchRecoveryRestoreConfirmation?.summary} 点击后进入 ${safeChapterCount} 章预执行确认，每章继续保留核心守恒、显性回报、章末追读和结构决策执行回填。`
        : recoveryRestoreObservationActive
          ? `${safeBatchRecoveryRestoreStabilityLane?.summary} 本批继续按 5 章观察，仍逐章回填核心守恒、显性回报、章末追读和结构决策执行。`
          : defaultFiveChapterLaneActive
          ? `${safeBatchRecoveryRestoreStabilityLane?.summary} 本批可作为默认 5 章档位继续生产。`
            : `按护栏建议连续生成 ${safeChapterCount} 章；每章仍会走字数门禁、质检修订和故事状态回填。`
    const productionRelapseCtaExecution = productionRelapseReviewStartsBatch
      ? productionRelapseCtaExecutionPayload(productionRelapseReviewCta, startBatchSource)
      : null
    if (productionRelapseCtaExecution) {
      preflight.inputSnapshot.production_relapse_cta_execution = productionRelapseCtaExecution
    }
    recommendedAction = productionRelapseReviewStartsBatch || !safeBatchRecoveryAction ? opsAction(
      'start_safe_batch_generation',
      startBatchLabel,
      startBatchDescription,
      false,
      {
        source: startBatchSource,
        safety_limit: safeChapterCount,
        allowed_chapter_nos: preflight.allowedChapterNos,
        next_batch_brief: nextBatchBrief,
        ...(productionRelapseReviewStartsBatch && productionRelapseReviewCta ? {
          production_relapse_review_cta: productionRelapseReviewCta,
        } : {}),
        ...(productionRelapseCtaExecution ? {
          production_relapse_cta_execution: productionRelapseCtaExecution,
        } : {}),
        ...(productionRelapseValidationActive ? {
          production_relapse_validation: {
            template_version_id: productionRelapseTemplateVersionId,
            default_batch_chapter_nos: productionRelapseChapterNos,
            failure_reasons: productionRelapseFailureReasons,
            close_condition: 'production_relapse_verdict.status=passed && remaining_failure_reasons empty',
          },
        } : {}),
        ...(recoveryRestoreBatchActive && safeBatchRecoveryRestoreConfirmation ? {
          recovery_restore_confirmation: safeBatchRecoveryRestoreConfirmation,
        } : {}),
        ...(recoveryRestoreObservationActive && safeBatchRecoveryRestoreStabilityLane ? {
          recovery_restore_stability_evidence: safeBatchRecoveryRestoreStabilityLane,
          ...(recoveryRestoreObservationConfirmation ? { recovery_restore_confirmation: recoveryRestoreObservationConfirmation } : {}),
        } : {}),
        ...(defaultFiveChapterLaneActive && safeBatchRecoveryRestoreStabilityLane ? {
          default_five_chapter_lane: safeBatchRecoveryRestoreStabilityLane,
        } : {}),
        batch_preflight: preflight.inputSnapshot,
      },
    ) : safeBatchRecoveryAction
  }
  if (preflight.inputSnapshot.recovery_evidence_production_gate) {
    preflight.inputSnapshot.recovery_evidence_production_gate = {
      ...preflight.inputSnapshot.recovery_evidence_production_gate,
      recommended_action: {
        key: recommendedAction.key,
        label: recommendedAction.label,
        description: recommendedAction.description,
      },
    }
    if (recommendedAction.payload) {
      recommendedAction = {
        ...recommendedAction,
        payload: {
          ...recommendedAction.payload,
          batch_preflight: {
            ...(recommendedAction.payload.batch_preflight || preflight.inputSnapshot),
            recovery_evidence_production_gate: preflight.inputSnapshot.recovery_evidence_production_gate,
          },
        },
      }
    }
  }
  const briefRecovery = buildNextBatchBriefRecovery({
    status,
    safeChapterCount,
    nextBatchBrief,
    batchBriefSignal,
    recommendedAction,
    evidence: [
      ...styleSampleRecoveryEvidence,
      ...recoveryEvidenceReleaseEvidence,
    ],
  })

  return {
    status,
    label: status === 'ready' ? '可小批量连写' : status === 'caution' ? '谨慎单章推进' : '暂不适合连写',
    summary: status === 'ready'
      ? `建议先小批量连续生产 ${safeChapterCount} 章，每章都经过质检、回填和差异复盘后再扩大批次。`
      : status === 'caution'
        ? warning?.label === '批次任务书'
          ? '下一批任务书还不够具体，本轮建议只推进 1 章，并先补齐后续章节职责、冲突和钩子。'
          : warning?.label === '写作队列放行'
            ? '写作队列后续章节还没有连续进入可写状态，本轮只推进当前可写章节，并先补齐后续计划或交稿。'
            : warning?.label === '连载库存'
              ? `连载库存提示：${serialReleaseInventory.detail} 本轮只放行单章，先补存稿或后续规划。`
              : warning?.label === '近10章疲劳'
                ? `近10章疲劳雷达提示：${fatigueDetail} 本轮建议只推进 1 章，并先更新滚动规划更换压迫来源、回报形态、章末问题或可视化场面。`
                : warning?.label === '恢复依据画像'
                  ? `恢复依据画像提示：${recoveryEvidenceSourceRiskProfile.detail}`
                : warning?.label === '强化恢复验收趋势'
                  ? `强化恢复验收提示：${strengthenedRepairAcceptanceTrend.summary}`
                : warning?.label === '故事压力阶梯'
                  ? '故事压力阶梯提示压力不足，本轮建议只推进 1 章，并先更新滚动规划补明确压力源、升级赌注和反转逼迫。'
                  : warning?.label === '剧情单元'
                    ? '剧情单元工坊提示当前事件包不完整，本轮建议只推进 1 章，并先更新滚动规划补入口钩子、小高潮、伏笔/剧情线和出单元钩子。'
                    : '长线储备存在薄弱点，本轮建议只推进 1 章，并优先处理黄色风险。'
        : blocking?.detail || '当前存在阻塞项，暂不适合连续生产。',
    safeChapterCount,
    recommendedAction,
    guardrails,
    releaseWindow,
    preflight,
    nextBatchBrief,
    recoveryEvidenceTrend,
    briefRepair,
    briefRecovery,
  }
}

export function runwayGate(
  key: AutoCreationMillionWordRunwayGate['key'],
  label: string,
  status: AutoCreationBatchGuardrailSignalStatus,
  detail: string,
): AutoCreationMillionWordRunwayGate {
  return { key, label, status, detail }
}

export function runwayQuestion(
  key: AutoCreationMillionWordRunwayQuestion['key'],
  label: string,
  answer: string,
  fallback: string,
  required = true,
): AutoCreationMillionWordRunwayQuestion {
  const normalized = text(answer)
  return {
    key,
    label,
    answer: normalized || fallback,
    status: normalized ? 'ok' : required ? 'block' : 'warn',
  }
}

export function contractStatusToSignal(status: AutoCreationContractStatus | undefined): AutoCreationBatchGuardrailSignalStatus {
  if (status === 'block') return 'block'
  if (status === 'warn') return 'warn'
  return 'ok'
}

export function batchStatusToSignal(status: AutoCreationBatchGuardrailStatus): AutoCreationBatchGuardrailSignalStatus {
  if (status === 'blocked') return 'block'
  if (status === 'caution') return 'warn'
  return 'ok'
}


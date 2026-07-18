import type {
  AnyRecord,
  WritingCockpitRole,
  WritingCockpitActionKey,
  WritingReadinessStatus,
  WritingReadinessCheck,
  WritingCockpitChapter,
  WritingQueueItemStatus,
  WritingQueueItem,
  WritingQueueModel,
  ChapterPlanningReadiness,
  ChapterContextPackageStatus,
  ChapterScenePlanStatus,
  ChapterPlanningDeskSceneCard,
  ChapterQualityContinuitySceneMapItem,
  ChapterWritePreparationBrief,
  ChapterPlanningDeskModel,
  ChapterAcceptanceStatus,
  DeslopGateDiagnosticsModel,
  ChapterAcceptanceDeskModel,
  ChapterHandoffStatus,
  ChapterHandoffDeskModel,
  LongformWorkflowStageKey,
  LongformWorkflowStageStatus,
  LongformWorkflowStageModel,
  LongformWorkflowModel,
  WritingCockpitModel,
  BuildWritingCockpitModelInput,
} from './types'
import { parseWorkspacePayload } from '../../payloadParseCache'


import {
  ACTION_LABELS,
  QUALITY_PASS_THRESHOLD,
  arrayValue,
  buildApprovalBlockerSummary,
  buildBlueprintReceiptSummary,
  buildDeliveryRiskReceiptSummary,
  buildDeslopGateDiagnosticsSummary,
  buildPlatformRubricSummary,
  buildQualityAuditSummary,
  buildRevisionReceiptSummary,
  buildSceneCardReceiptSummary,
  compareReviewRefs,
  countArray,
  createdTime,
  deliveryReceiptsFrom,
  firstNonEmpty,
  hasProse,
  issueText,
  latestReviewRef,
  parsedTime,
  proseQualityReviewMatchesCurrentChapter,
  qualityPayload,
  reportPayload,
  reviewPayload,
  reviewType,
  revisionPayload,
  storylineSyncPayload,
  stringArray,
  text,
  uniqueObjects,
  uniqueStrings,
} from './cockpit-basics'

import {
  contractSyncPayload,
  qualityAuditSyncEvidence,
} from './cockpit-acceptance-sync-a'

export function buildIntentConfirmationSyncSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['intentConfirmationSync'] {
  if (!review) return null
  const payload = contractSyncPayload(review, 'intent_confirmation_sync', 'intentConfirmationSync')
  const missed = arrayValue(payload?.missed || payload?.gaps || payload?.issues)
  const payloadMissedCount = Number(payload?.missed_count ?? payload?.missedCount)
  const missedCount = Number.isFinite(payloadMissedCount) ? payloadMissedCount : missed.length
  const status: 'ok' | 'warn' = text(payload?.status || review?.status).toLowerCase() === 'ok' && missedCount === 0 ? 'ok' : 'warn'
  const evidence = [
    text(payload?.summary),
    ...missed.map(qualityAuditSyncEvidence),
  ].filter(Boolean).slice(0, 5)
  const nextActions = arrayValue(payload?.next_actions || payload?.nextActions || payload?.required_actions || payload?.requiredActions)
    .map(item => text(item))
    .filter(Boolean)
    .slice(0, 4)

  return {
    status,
    label: status === 'ok' ? '意图确认 OK' : text(payload?.label) || `意图确认缺口 ${missedCount}`,
    missedCount,
    evidence,
    nextActions,
  }
}

export function buildBenchmarkRecallSyncSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['benchmarkRecallSync'] {
  if (!review) return null
  const payload = contractSyncPayload(review, 'benchmark_recall_sync', 'benchmarkRecallSync')
  const missed = arrayValue(payload?.missed || payload?.gaps || payload?.issues)
  const payloadMissedCount = Number(payload?.missed_count ?? payload?.missedCount)
  const missedCount = Number.isFinite(payloadMissedCount) ? payloadMissedCount : missed.length
  const status: 'ok' | 'warn' = text(payload?.status || review?.status).toLowerCase() === 'ok' && missedCount === 0 ? 'ok' : 'warn'
  const evidence = [
    text(payload?.summary),
    ...missed.map(qualityAuditSyncEvidence),
  ].filter(Boolean).slice(0, 5)
  const nextActions = arrayValue(payload?.next_actions || payload?.nextActions || payload?.required_actions || payload?.requiredActions)
    .map(item => text(item))
    .filter(Boolean)
    .slice(0, 4)

  return {
    status,
    label: status === 'ok' ? '文风召回 OK' : text(payload?.label) || `文风召回缺口 ${missedCount}`,
    missedCount,
    evidence,
    nextActions,
  }
}

export function readerRetentionSyncPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.reader_retention_sync || payload?.result?.reader_retention_sync || payload?.result || payload
}

export function buildReaderRetentionSyncSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['readerRetentionSync'] {
  if (!review) return null
  const payload = readerRetentionSyncPayload(review)
  const scoreValue = payload?.score
  const score = scoreValue === null || scoreValue === undefined || scoreValue === '' ? null : Number(scoreValue)
  const safeScore = Number.isFinite(score) ? score : null
  const payloadMissedCount = Number(payload?.missed_count ?? payload?.missedCount)
  const missedCount = Number.isFinite(payloadMissedCount) ? payloadMissedCount : countArray(payload?.missed)
  const status: 'ok' | 'warn' = text(payload?.status || review?.status).toLowerCase() === 'ok' && missedCount === 0 ? 'ok' : 'warn'

  return {
    status,
    label: status === 'ok' ? '追读 OK' : text(payload?.label) || `漏追读 ${missedCount}`,
    score: safeScore,
    scoreLabel: safeScore === null ? '追读兑现 -' : `追读兑现 ${safeScore}`,
    missedCount,
  }
}

export function chapterAttractionPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.chapter_attraction_review || payload?.result?.chapter_attraction_review || payload?.result || payload
}

export function buildChapterAttractionSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['chapterAttraction'] {
  if (!review) return null
  const payload = chapterAttractionPayload(review)
  const scoreValue = payload?.score
  const score = scoreValue === null || scoreValue === undefined || scoreValue === '' ? null : Number(scoreValue)
  const safeScore = Number.isFinite(score) ? score : null
  const payloadWeakCount = Number(payload?.weak_count ?? payload?.weakCount)
  const weakCount = Number.isFinite(payloadWeakCount)
    ? payloadWeakCount
    : countArray(payload?.weak_dimensions || payload?.weakDimensions || payload?.dimensions)
  const status: 'ok' | 'warn' = text(payload?.status || review?.status).toLowerCase() === 'ok' && weakCount === 0 ? 'ok' : 'warn'

  return {
    status,
    label: status === 'ok' ? '吸引力 OK' : text(payload?.label) || `吸引力缺口 ${weakCount}`,
    score: safeScore,
    scoreLabel: safeScore === null ? '吸引力 -' : `吸引力 ${safeScore}`,
    weakCount,
    priorityLabel: text(payload?.priority_repair || payload?.priorityRepair, status === 'ok' ? '吸引力稳定' : '优先修吸引力'),
  }
}


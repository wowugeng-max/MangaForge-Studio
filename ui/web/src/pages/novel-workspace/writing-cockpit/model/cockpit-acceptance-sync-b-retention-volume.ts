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

export function latestFirst30RetentionReview(reviews: AnyRecord[]) {
  const matches = reviews.filter(review => reviewType(review) === 'first30_retention_diagnosis')
  if (!matches.length) return null
  return matches.sort((a, b) => (createdTime(b) ?? 0) - (createdTime(a) ?? 0))[0]
}

export function buildFirst30RetentionRecheckSummary(chapter: AnyRecord | null, reviews: AnyRecord[]): ChapterAcceptanceDeskModel['first30RetentionRecheck'] {
  const chapterNo = Number(chapter?.chapter_no || 0)
  if (chapterNo < 1 || chapterNo > 30) return null
  const review = latestFirst30RetentionReview(reviews)
  if (!review) return null
  const reportTime = createdTime(review)
  const chapterTime = parsedTime(chapter?.updated_at || chapter?.modified_at)
  if (!reportTime || !chapterTime || chapterTime <= reportTime) return null
  return {
    status: 'stale',
    label: '留存需复诊',
    reason: `第${chapterNo}章已在前30章诊断后更新，建议重跑留存曲线。`,
  }
}

export function innovationSyncPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.innovation_sync || payload?.result?.innovation_sync || payload?.result || payload
}

export function buildInnovationSyncSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['innovationSync'] {
  if (!review) return null
  const payload = innovationSyncPayload(review)
  const scoreValue = payload?.score
  const score = scoreValue === null || scoreValue === undefined || scoreValue === '' ? null : Number(scoreValue)
  const safeScore = Number.isFinite(score) ? score : null
  const payloadMissedCount = Number(payload?.missed_count ?? payload?.missedCount)
  const missedCount = Number.isFinite(payloadMissedCount) ? payloadMissedCount : countArray(payload?.missed)
  const status: 'ok' | 'warn' = text(payload?.status || review?.status).toLowerCase() === 'ok' && missedCount === 0 ? 'ok' : 'warn'

  return {
    status,
    label: status === 'ok' ? '创新 OK' : text(payload?.label) || `创新缺口 ${missedCount}`,
    score: safeScore,
    scoreLabel: safeScore === null ? '创新兑现 -' : `创新兑现 ${safeScore}`,
    missedCount,
  }
}

export function volumeBeatSyncPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.volume_beat_sync || payload?.result?.volume_beat_sync || payload?.result || payload
}

export function buildVolumeBeatSyncSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['volumeBeatSync'] {
  if (!review) return null
  const payload = volumeBeatSyncPayload(review)
  const scoreValue = payload?.score
  const score = scoreValue === null || scoreValue === undefined || scoreValue === '' ? null : Number(scoreValue)
  const safeScore = Number.isFinite(score) ? score : null
  const payloadMissedCount = Number(payload?.missed_count ?? payload?.missedCount)
  const missedCount = Number.isFinite(payloadMissedCount) ? payloadMissedCount : countArray(payload?.missed)
  const status: 'ok' | 'warn' = text(payload?.status || review?.status).toLowerCase() === 'ok' && missedCount === 0 ? 'ok' : 'warn'

  return {
    status,
    label: status === 'ok' ? '爆点 OK' : text(payload?.label) || `爆点漏兑现 ${missedCount}`,
    score: safeScore,
    scoreLabel: safeScore === null ? '爆点兑现 -' : `爆点兑现 ${safeScore}`,
    missedCount,
  }
}


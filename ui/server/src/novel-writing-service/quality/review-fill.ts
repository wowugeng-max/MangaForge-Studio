import { asArray, normalizeIssue } from '../../routes/novel-route-utils'
import { STRUCTURED_REVIEW_CHECK_FIELDS } from './structured-review-fields'
import { isMissingStructuredReviewCheck } from './review-merge'
import { revisionReceiptRemainingRisk } from './revision-receipt-risk'
import { preDraftExecutionReceiptSections } from './pre-draft-receipt-sections'
import { compactBriefText } from './text-utils'

export type DeliveryRiskReceiptNormalizer = (
  reviewPayload: any,
  contextPackage?: any,
  chapterText?: string,
) => any[]

function defaultDeliveryRiskReceiptNormalizer(reviewPayload: any = {}) {
  return asArray(reviewPayload?.delivery_risk_receipts || reviewPayload?.deliveryRiskReceipts)
}

let boundDeliveryRiskReceiptNormalizer: DeliveryRiskReceiptNormalizer = defaultDeliveryRiskReceiptNormalizer

/** Bind monofile-owned normalizeDeliveryRiskReceipts without creating import cycles. */
export function bindDeliveryRiskReceiptNormalizer(normalizer: DeliveryRiskReceiptNormalizer) {
  boundDeliveryRiskReceiptNormalizer = normalizer || defaultDeliveryRiskReceiptNormalizer
}

export function normalizeStructuredReviewFillCheck(value: any) {
  if (!value || typeof value !== 'object') return value
  const deliveredEvidence = compactBriefText(
    value?.delivered_evidence
    || value?.deliveredEvidence
    || value?.evidence
    || value?.changed_evidence
    || value?.changedEvidence
    || value?.chapter_evidence
    || value?.chapterEvidence
    || value?.source_excerpt
    || value?.sourceExcerpt,
  )
  const status = compactBriefText(
    value?.status
    || value?.state
    || (value?.delivered === false || revisionReceiptRemainingRisk(value) ? 'fail' : 'pass'),
  ).toLowerCase()
  return {
    ...value,
    status,
    evidence: compactBriefText(value?.evidence || deliveredEvidence || value?.remaining_risk || value?.remainingRisk || value?.fix),
    delivered_evidence: value?.delivered_evidence || value?.deliveredEvidence || deliveredEvidence,
  }
}

export function structuredReviewFillPayloadValues(payload: any, snakeField: string, camelField: string) {
  return [
    ...asArray(payload?.[snakeField] || payload?.[camelField]),
    ...preDraftExecutionReceiptSections(payload)
      .flatMap((section: any) => asArray(section?.[snakeField] || section?.[camelField])),
  ].map(normalizeStructuredReviewFillCheck)
}

export function structuredReviewFillPayloadHasUsableField(payload: any, snakeField: string, camelField: string) {
  const values = structuredReviewFillPayloadValues(payload, snakeField, camelField)
  return values.some((item: any) => !isMissingStructuredReviewCheck(item))
}

export function mergeStructuredReviewFillPayload(
  review: any,
  payload: any,
  contextPackage: any,
  chapterText: string,
  normalizeDeliveryRiskReceipts: DeliveryRiskReceiptNormalizer = boundDeliveryRiskReceiptNormalizer,
) {
  if (!payload || typeof payload !== 'object') return review
  const merged: any = {
    ...review,
    structured_fill_diagnostics: payload?.structured_fill_diagnostics || payload?.structuredFillDiagnostics || review?.structured_fill_diagnostics,
  }
  for (const [snakeField, camelField] of STRUCTURED_REVIEW_CHECK_FIELDS) {
    if (!structuredReviewFillPayloadHasUsableField(payload, snakeField, camelField)) continue
    merged[snakeField] = structuredReviewFillPayloadValues(payload, snakeField, camelField)
      .filter((item: any) => !isMissingStructuredReviewCheck(item))
  }
  if (Array.isArray(payload?.delivery_risk_receipts) || Array.isArray(payload?.deliveryRiskReceipts)) {
    merged.delivery_risk_receipts = normalizeDeliveryRiskReceipts(payload, contextPackage, chapterText)
  }
  if (payload?.next_chapter_quality_plan || payload?.nextChapterQualityPlan) {
    merged.next_chapter_quality_plan = payload.next_chapter_quality_plan || payload.nextChapterQualityPlan
  }
  if (Array.isArray(payload?.issues) || Array.isArray(payload?.findings)) {
    merged.issues = [
      ...asArray(review?.issues),
      ...asArray(payload?.issues),
      ...asArray(payload?.findings),
    ].map(normalizeIssue)
  }
  return merged
}

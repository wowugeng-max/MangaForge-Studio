import { asArray } from '../../routes/novel-route-utils'
import { STRUCTURED_REVIEW_CHECK_FIELDS, STRUCTURED_REVIEW_REQUIRED_FIELDS } from './structured-review-fields'
import { camelizeSnakeField, compactBriefText } from './text-utils'
import { platformCheckNeedsCarryOver } from './platform-carry-over'

function reviewCheckHasContractField(check: any, field: string) {
  const camelField = camelizeSnakeField(field)
  const hasSnake = Object.prototype.hasOwnProperty.call(check || {}, field)
  const hasCamel = camelField !== field && Object.prototype.hasOwnProperty.call(check || {}, camelField)
  if (!hasSnake && !hasCamel) return false
  if (field === 'remaining_risk') return true
  return compactBriefText(check?.[field] || check?.[camelField]) !== ''
}

function structuredReviewCheckMissingRequiredFields(check: any, checkField = '') {
  if (!checkField || !check || typeof check !== 'object') return []
  if (Object.prototype.hasOwnProperty.call(check, 'delivered')) return []
  const requiredFields = STRUCTURED_REVIEW_REQUIRED_FIELDS[checkField] || []
  if (!requiredFields.length) return []
  return requiredFields.filter(field => !reviewCheckHasContractField(check, field))
}

export function hasReviewChecksNeedingRepair(review: any) {
  const directChecks = STRUCTURED_REVIEW_CHECK_FIELDS
    .flatMap(([snakeField, camelField]) => asArray(review?.[snakeField] || review?.[camelField])
      .map(check => ({ check, snakeField })))
  const diagnostics = review?.deslop_gate_diagnostics || review?.deslopGateDiagnostics || {}
  const diagnosticGates = asArray(diagnostics?.gates)
  return directChecks.some(({ check, snakeField }) => (
    platformCheckNeedsCarryOver(check)
    || structuredReviewCheckMissingRequiredFields(check, snakeField).length > 0
  )) || diagnosticGates.some(platformCheckNeedsCarryOver)
}

export function isMissingStructuredReviewCheck(check: any) {
  const key = compactBriefText(check?.key)
  const label = compactBriefText(check?.label)
  const evidence = compactBriefText(check?.evidence)
  return /^missing_/.test(key)
    || /^缺少/.test(label)
    || /模型没有输出|没有输出\s*[a-z_]+|缺少.+自检|缺少.+回执/.test(evidence)
}

export function missingStructuredReviewCheckFields(review: any) {
  return STRUCTURED_REVIEW_CHECK_FIELDS
    .map(([snakeField, camelField]) => {
      const checks = asArray(review?.[snakeField] || review?.[camelField])
      if (!checks.some(isMissingStructuredReviewCheck)) return ''
      return snakeField
    })
    .filter(Boolean)
}

function structuredReviewCheckStableKey(item: any) {
  if (!item || typeof item !== 'object') return String(item)
  return [
    compactBriefText(item?.key),
    compactBriefText(item?.label),
    compactBriefText(item?.evidence),
    compactBriefText(item?.status),
  ].filter(Boolean).join('|') || stringifyRouteJsonSafely(item, undefined, 1200)
}

function mergeStructuredReviewCheckItems(previousItems: any[], recheckItems: any[]) {
  const merged: any[] = []
  const seen = new Set<string>()
  for (const item of [
    ...recheckItems.filter((check: any) => !isMissingStructuredReviewCheck(check)),
    ...previousItems.filter((check: any) => !isMissingStructuredReviewCheck(check)),
  ]) {
    const key = structuredReviewCheckStableKey(item)
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(item)
  }
  return merged
}

export function mergeQualityRecheckReviewWithStructuredEvidence(previousReview: any = {}, recheckReview: any = {}) {
  if (!previousReview || typeof previousReview !== 'object') return recheckReview
  if (!recheckReview || typeof recheckReview !== 'object') return previousReview
  const merged: any = {
    ...previousReview,
    ...recheckReview,
  }
  const preservedFields: string[] = []
  for (const [snakeField, camelField] of STRUCTURED_REVIEW_CHECK_FIELDS) {
    const previousItems = asArray(previousReview?.[snakeField] || previousReview?.[camelField])
    if (!previousItems.some((check: any) => !isMissingStructuredReviewCheck(check))) continue
    const recheckItems = asArray(recheckReview?.[snakeField] || recheckReview?.[camelField])
    const recheckHasMissingPlaceholder = recheckItems.some(isMissingStructuredReviewCheck)
    if (recheckItems.length > 0 && !recheckHasMissingPlaceholder) continue
    const mergedItems = mergeStructuredReviewCheckItems(previousItems, recheckItems)
    if (!mergedItems.length) continue
    merged[snakeField] = mergedItems
    if (Object.prototype.hasOwnProperty.call(merged, camelField)) merged[camelField] = mergedItems
    preservedFields.push(snakeField)
  }
  if (preservedFields.length) {
    merged.quality_recheck_structured_evidence_preserved = {
      fields: preservedFields,
      previous_missing_field_count: missingStructuredReviewCheckFields(previousReview).length,
      recheck_missing_field_count: missingStructuredReviewCheckFields(recheckReview).length,
    }
  }
  return merged
}

function receiptSyncStatus(sync: any) {
  return compactBriefText(sync?.status || sync?.state).toLowerCase()
}

function receiptSyncMissedCount(sync: any) {
  return Number(sync?.missed_count ?? sync?.missedCount ?? sync?.failed_count ?? sync?.failedCount ?? 0) || 0
}

function receiptSyncReceiptCount(sync: any) {
  return Number(sync?.receipt_count ?? sync?.receiptCount ?? sync?.count ?? 0) || 0
}

function receiptSyncIsOk(sync: any) {
  return sync && typeof sync === 'object' && receiptSyncStatus(sync) === 'ok' && receiptSyncMissedCount(sync) <= 0
}

function receiptSyncNeedsGateCheck(sync: any) {
  if (!sync || typeof sync !== 'object') return false
  return receiptSyncStatus(sync) !== 'ok' && receiptSyncMissedCount(sync) > 0
}

function receiptSyncCheckText(check: any) {
  return [
    check?.key,
    check?.sync_key,
    check?.syncKey,
    check?.label,
    check?.name,
    check?.evidence,
    check?.reason,
    check?.fix,
    check?.remaining_risk,
    check?.remainingRisk,
  ].map(item => compactBriefText(item)).filter(Boolean).join('；')
}

function receiptPlaceholderMatches(check: any, receiptKind: 'status_filter' | 'next_quality_plan' | 'scene_card') {
  const text = receiptSyncCheckText(check)
  if (!text) return false
  if (receiptKind === 'status_filter') return /missing_status_filter_receipts|status_filter_receipts|状态筛选回执/.test(text)
  if (receiptKind === 'next_quality_plan') return /missing_next_chapter_quality_plan_receipts|next_chapter_quality_plan_receipts|质量续航回执/.test(text)
  return /scene_card_receipt|scene_card_receipts|场景卡回执|场景回执/.test(text)
}

function buildReceiptSyncGateCheck(sync: any, key: string, label: string, status: 'pass' | 'fail') {
  return {
    key,
    label,
    status,
    evidence: [sync?.label, sync?.summary].map(item => compactBriefText(item)).filter(Boolean).join('：') || label,
    fix: status === 'fail'
      ? asArray(sync?.next_actions || sync?.nextActions).map((item: any) => compactBriefText(item)).filter(Boolean).join('；')
        || '补齐回执并用正文证据证明已落成。'
      : '无需修复。',
    missed_count: receiptSyncMissedCount(sync),
    receipt_count: receiptSyncReceiptCount(sync),
  }
}

function applyReceiptSyncGatePatch(review: any, config: {
  snakeField: string
  camelField: string
  receiptKind: 'status_filter' | 'next_quality_plan' | 'scene_card'
  sync: any
  okKey: string
  failKey: string
  label: string
}) {
  const originalItems = asArray(review?.[config.snakeField] || review?.[config.camelField])
  let nextItems = originalItems
  if (receiptSyncIsOk(config.sync)) {
    nextItems = originalItems.filter((check: any) => !receiptPlaceholderMatches(check, config.receiptKind))
    if (receiptSyncReceiptCount(config.sync) > 0 || config.sync?.requires_receipts || config.sync?.requiresReceipts) {
      nextItems = [
        ...nextItems,
        buildReceiptSyncGateCheck(config.sync, config.okKey, config.label, 'pass'),
      ]
    }
  } else if (receiptSyncNeedsGateCheck(config.sync)) {
    nextItems = [
      ...nextItems,
      buildReceiptSyncGateCheck(config.sync, config.failKey, config.label, 'fail'),
    ]
  }
  return {
    ...review,
    [config.snakeField]: nextItems,
    ...(Object.prototype.hasOwnProperty.call(review || {}, config.camelField) ? { [config.camelField]: nextItems } : {}),
  }
}

export function mergePostDeliveryReceiptSyncIntoQualityGateReview(review: any = {}, syncs: any = {}) {
  let merged = { ...(review || {}) }
  merged = applyReceiptSyncGatePatch(merged, {
    snakeField: 'state_tracking_checks',
    camelField: 'stateTrackingChecks',
    receiptKind: 'status_filter',
    sync: syncs?.statusFilterReceiptSync || syncs?.status_filter_receipts_sync,
    okKey: 'status_filter_receipts_sync_ok',
    failKey: 'status_filter_receipts_sync',
    label: '状态筛选回执',
  })
  merged = applyReceiptSyncGatePatch(merged, {
    snakeField: 'next_chapter_quality_plan_receipts',
    camelField: 'nextChapterQualityPlanReceipts',
    receiptKind: 'next_quality_plan',
    sync: syncs?.nextChapterQualityPlanReceiptSync || syncs?.next_chapter_quality_plan_receipts_sync,
    okKey: 'next_chapter_quality_plan_receipts_sync_ok',
    failKey: 'next_chapter_quality_plan_receipts_sync',
    label: '质量续航回执',
  })
  merged = applyReceiptSyncGatePatch(merged, {
    snakeField: 'quality_audit_checks',
    camelField: 'qualityAuditChecks',
    receiptKind: 'scene_card',
    sync: syncs?.sceneCardReceiptSync || syncs?.scene_card_receipts_sync,
    okKey: 'scene_card_receipts_sync_ok',
    failKey: 'scene_card_receipts_sync',
    label: '场景卡回执',
  })
  return merged
}


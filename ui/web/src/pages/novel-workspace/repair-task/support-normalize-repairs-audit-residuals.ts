import type { AnyRecord } from './utils'
import {
  arrayValue,
  firstText,
  limitedArray,
  objectValue,
  parseJsonValue,
  text,
} from './utils'
import {
  camelFieldName,
  genericClosureEvidenceDetail,
  preDraftExecutionReceiptSources,
  qualityContractMissingFields,
} from './quality-contract'

import {
  deslopRepairReceiptLine,
  qualityAuditRepairReceiptLine,
} from './support-normalize-repairs-audit-quality-deslop'
import {
  proseRevisionReceiptSyncLine,
  revisionCascadeImpactLine,
  revisionContextReceiptLine,
  revisionScopeGuardLine,
} from './support-normalize-repairs-audit-revision'
import {
  syncReceiptGenericEvidenceResiduals,
} from './support-normalize-repairs-audit-pre-draft-state'

export function deslopRepairReceiptSyncPayload(value: any) {
  const source = objectValue(value)
  const review = objectValue(source.review)
  const result = objectValue(source.result)
  return objectValue(
    source.deslop_repair_receipt_sync
    || source.deslopRepairReceiptSync
    || review.deslop_repair_receipt_sync
    || review.deslopRepairReceiptSync
    || result.deslop_repair_receipt_sync
    || result.deslopRepairReceiptSync
    || result,
  )
}

export function deslopRepairReceiptResidualsFromQuality(value: any): string[] {
  const payload = deslopRepairReceiptSyncPayload(value)
  const status = firstText(payload.status).toLowerCase()
  const missedCount = Number(payload.missed_count ?? payload.missedCount)
  const missed = limitedArray(payload.missed, payload.gaps, payload.issues)
    .map(deslopRepairReceiptLine)
    .filter(Boolean)
  const genericReceiptEvidence = syncReceiptGenericEvidenceResiduals(payload, [
    'deslop_repair_receipts',
    'deslopRepairReceipts',
    'repair_receipts',
    'repairReceipts',
    'receipts',
  ], deslopRepairReceiptLine, { keyedReceiptsRequireChangedEvidence: true })
  if (genericReceiptEvidence.length > 0) return genericReceiptEvidence
  if (status === 'ok' && (!Number.isFinite(missedCount) || missedCount <= 0) && missed.length === 0) return []
  if (Number.isFinite(missedCount) && missedCount <= 0 && missed.length === 0) return []
  if (missed.length > 0) return missed
  if (Number.isFinite(missedCount) && missedCount > 0) return [`去AI味修复回执残留 ${missedCount}`]
  return status && status !== 'ok' ? [firstText(payload.label, payload.summary, 'deslop_repair_receipt_sync 未通过')] : []
}

export function revisionSyncPayload(value: any, snakeKey: string, camelKey: string) {
  const source = objectValue(value)
  const review = objectValue(source.review)
  const result = objectValue(source.result)
  return objectValue(
    source[snakeKey]
    || source[camelKey]
    || review[snakeKey]
    || review[camelKey]
    || result[snakeKey]
    || result[camelKey]
    || result,
  )
}

export function revisionCascadeImpactResidualsFromQuality(value: any): string[] {
  const payload = revisionSyncPayload(value, 'revision_cascade_impact_sync', 'revisionCascadeImpactSync')
  const status = firstText(payload.status).toLowerCase()
  const missedCount = Number(payload.missed_count ?? payload.missedCount)
  const missed = limitedArray(payload.missed, payload.gaps, payload.issues, payload.evidence_missing, payload.evidenceMissing)
    .map(revisionCascadeImpactLine)
    .filter(Boolean)
  if (status === 'ok' && (!Number.isFinite(missedCount) || missedCount <= 0) && missed.length === 0) return []
  if (Number.isFinite(missedCount) && missedCount <= 0 && missed.length === 0) return []
  if (missed.length > 0) return missed
  if (Number.isFinite(missedCount) && missedCount > 0) return [`修订级联影响 ${missedCount}`]
  return status && status !== 'ok' ? [firstText(payload.label, payload.summary, 'revision_cascade_impact_sync 未通过')] : []
}

export function revisionScopeGuardResidualsFromQuality(value: any): string[] {
  const payload = revisionSyncPayload(value, 'revision_scope_guard_sync', 'revisionScopeGuardSync')
  const status = firstText(payload.status).toLowerCase()
  const missedCount = Number(payload.missed_count ?? payload.missedCount)
  const missed = limitedArray(payload.missed, payload.gaps, payload.issues)
    .map(revisionScopeGuardLine)
    .filter(Boolean)
  if (status === 'ok' && (!Number.isFinite(missedCount) || missedCount <= 0) && missed.length === 0) return []
  if (Number.isFinite(missedCount) && missedCount <= 0 && missed.length === 0) return []
  if (missed.length > 0) return missed
  if (Number.isFinite(missedCount) && missedCount > 0) return [`修订幅度风险 ${missedCount}`]
  return status && status !== 'ok' ? [firstText(payload.label, payload.summary, 'revision_scope_guard_sync 未通过')] : []
}

export function revisionContextReceiptResidualsFromQuality(value: any): string[] {
  const payload = revisionSyncPayload(value, 'revision_context_receipts_sync', 'revisionContextReceiptsSync')
  const status = firstText(payload.status).toLowerCase()
  const missedCount = Number(payload.missed_count ?? payload.missedCount)
  const missed = limitedArray(payload.missed, payload.gaps, payload.issues)
    .map(revisionContextReceiptLine)
    .filter(Boolean)
  const genericReceiptEvidence = syncReceiptGenericEvidenceResiduals(payload, [
    'revision_context_receipts',
    'revisionContextReceipts',
    'context_receipts',
    'contextReceipts',
    'receipts',
  ], revisionContextReceiptLine, { requiredFields: ['key', 'label', 'status', 'evidence', 'fix', 'source_excerpt'] })
  if (genericReceiptEvidence.length > 0) return genericReceiptEvidence
  if (status === 'ok' && (!Number.isFinite(missedCount) || missedCount <= 0) && missed.length === 0) return []
  if (Number.isFinite(missedCount) && missedCount <= 0 && missed.length === 0) return []
  if (missed.length > 0) return missed
  if (Number.isFinite(missedCount) && missedCount > 0) return [`修订上下文残留 ${missedCount}`]
  return status && status !== 'ok' ? [firstText(payload.label, payload.summary, 'revision_context_receipts_sync 未通过')] : []
}

export function proseRevisionReceiptResidualsFromQuality(value: any): string[] {
  const payload = revisionSyncPayload(value, 'prose_revision_receipt_sync', 'proseRevisionReceiptSync')
  const status = firstText(payload.status).toLowerCase()
  const missedCount = Number(payload.missed_count ?? payload.missedCount)
  const missed = limitedArray(payload.missed, payload.gaps, payload.issues, payload.evidence_missing, payload.evidenceMissing)
    .map(proseRevisionReceiptSyncLine)
    .filter(Boolean)
  const genericReceiptEvidence = syncReceiptGenericEvidenceResiduals(payload, [
    'revision_receipts',
    'revisionReceipts',
    'prose_revision_receipts',
    'proseRevisionReceipts',
    'receipts',
  ], proseRevisionReceiptSyncLine, { keyedReceiptsRequireChangedEvidence: true })
  if (genericReceiptEvidence.length > 0) return genericReceiptEvidence
  if (status === 'ok' && (!Number.isFinite(missedCount) || missedCount <= 0) && missed.length === 0) return []
  if (Number.isFinite(missedCount) && missedCount <= 0 && missed.length === 0) return []
  if (missed.length > 0) return missed
  if (Number.isFinite(missedCount) && missedCount > 0) return [`修订回执残留 ${missedCount}`]
  return status && status !== 'ok' ? [firstText(payload.label, payload.summary, 'prose_revision_receipt_sync 未通过')] : []
}

export function qualityAuditRepairReceiptSyncPayload(value: any) {
  const source = objectValue(value)
  const review = objectValue(source.review)
  const result = objectValue(source.result)
  return objectValue(
    source.quality_audit_repair_receipt_sync
    || source.qualityAuditRepairReceiptSync
    || review.quality_audit_repair_receipt_sync
    || review.qualityAuditRepairReceiptSync
    || result.quality_audit_repair_receipt_sync
    || result.qualityAuditRepairReceiptSync
    || result,
  )
}

export function qualityAuditRepairReceiptResidualsFromQuality(value: any): string[] {
  const payload = qualityAuditRepairReceiptSyncPayload(value)
  const status = firstText(payload.status).toLowerCase()
  const missedCount = Number(payload.missed_count ?? payload.missedCount)
  const missed = limitedArray(payload.missed, payload.gaps, payload.issues)
    .map(qualityAuditRepairReceiptLine)
    .filter(Boolean)
  const genericReceiptEvidence = syncReceiptGenericEvidenceResiduals(payload, [
    'quality_audit_repair_receipts',
    'qualityAuditRepairReceipts',
    'repair_receipts',
    'repairReceipts',
    'receipts',
  ], qualityAuditRepairReceiptLine, { keyedReceiptsRequireChangedEvidence: true })
  if (genericReceiptEvidence.length > 0) return genericReceiptEvidence
  if (status === 'ok' && (!Number.isFinite(missedCount) || missedCount <= 0) && missed.length === 0) return []
  if (Number.isFinite(missedCount) && missedCount <= 0 && missed.length === 0) return []
  if (missed.length > 0) return missed
  if (Number.isFinite(missedCount) && missedCount > 0) return [`质量诊断修复回执缺口 ${missedCount}`]
  return status && status !== 'ok' ? [firstText(payload.label, payload.summary, 'quality_audit_repair_receipt_sync 未通过')] : []
}


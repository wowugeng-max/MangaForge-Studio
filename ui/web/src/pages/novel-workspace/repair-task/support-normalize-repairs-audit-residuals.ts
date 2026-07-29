import type { AnyRecord } from './utils'
import {
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

function hasOwnField(value: AnyRecord, key: string) {
  return Object.prototype.hasOwnProperty.call(value, key)
}

function namedSyncPayloadEvidence(value: any, snakeKey: string, camelKey: string) {
  const source = objectValue(value)
  const review = objectValue(source.review)
  const result = objectValue(source.result)
  const namedCandidates = [
    source[snakeKey],
    source[camelKey],
    review[snakeKey],
    review[camelKey],
    result[snakeKey],
    result[camelKey],
  ]
  for (const candidate of namedCandidates) {
    const payload = objectValue(candidate)
    if (Object.keys(payload).length > 0) return { payload, present: true }
  }
  return { payload: {}, present: false }
}

function syncPayload(value: any, snakeKey: string, camelKey: string) {
  const named = namedSyncPayloadEvidence(value, snakeKey, camelKey)
  if (named.present) return named.payload
  return objectValue(objectValue(value).result)
}

function explicitMissedCount(payload: AnyRecord) {
  const key = hasOwnField(payload, 'missed_count')
    ? 'missed_count'
    : hasOwnField(payload, 'missedCount')
      ? 'missedCount'
      : ''
  if (!key) return { present: false, value: null }
  const raw = payload[key]
  return {
    present: true,
    value: typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 ? raw : null,
  }
}

function syncClosureOutcomeResiduals(
  payload: AnyRecord,
  syncKey: string,
  missed: string[],
  countLabel: string,
): string[] {
  const statusSupplied = hasOwnField(payload, 'status')
  const status = payload.status
  const missedCount = explicitMissedCount(payload)
  if (missed.length > 0) return missed
  if (missedCount.present && missedCount.value === null) return [`${syncKey} 明确闭环结果缺失`]
  if (missedCount.value !== null && missedCount.value > 0) return [`${countLabel} ${missedCount.value}`]
  if (statusSupplied && status !== 'ok') {
    return [firstText(payload.label, payload.summary, `${syncKey} 未通过`)]
  }
  if (status === 'ok' || missedCount.value === 0) return []
  return [`${syncKey} 明确闭环结果缺失`]
}

export function deslopRepairReceiptSyncPayload(value: any) {
  return syncPayload(value, 'deslop_repair_receipt_sync', 'deslopRepairReceiptSync')
}

export function deslopRepairReceiptResidualsFromQuality(value: any): string[] {
  const evidence = namedSyncPayloadEvidence(value, 'deslop_repair_receipt_sync', 'deslopRepairReceiptSync')
  const payload = evidence.payload
  if (!evidence.present) return ['缺少 deslop_repair_receipt_sync 复检结果']
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
  return syncClosureOutcomeResiduals(payload, 'deslop_repair_receipt_sync', missed, '去AI味修复回执残留')
}

export function revisionSyncPayload(value: any, snakeKey: string, camelKey: string) {
  return syncPayload(value, snakeKey, camelKey)
}

export function revisionCascadeImpactResidualsFromQuality(value: any): string[] {
  const evidence = namedSyncPayloadEvidence(value, 'revision_cascade_impact_sync', 'revisionCascadeImpactSync')
  const payload = evidence.payload
  if (!evidence.present) return ['缺少 revision_cascade_impact_sync 复检结果']
  const missed = limitedArray(payload.missed, payload.gaps, payload.issues, payload.evidence_missing, payload.evidenceMissing)
    .map(revisionCascadeImpactLine)
    .filter(Boolean)
  return syncClosureOutcomeResiduals(payload, 'revision_cascade_impact_sync', missed, '修订级联影响')
}

export function revisionScopeGuardResidualsFromQuality(value: any): string[] {
  const evidence = namedSyncPayloadEvidence(value, 'revision_scope_guard_sync', 'revisionScopeGuardSync')
  const payload = evidence.payload
  if (!evidence.present) return ['缺少 revision_scope_guard_sync 复检结果']
  const missed = limitedArray(payload.missed, payload.gaps, payload.issues)
    .map(revisionScopeGuardLine)
    .filter(Boolean)
  return syncClosureOutcomeResiduals(payload, 'revision_scope_guard_sync', missed, '修订幅度风险')
}

export function revisionContextReceiptResidualsFromQuality(value: any): string[] {
  const evidence = namedSyncPayloadEvidence(value, 'revision_context_receipts_sync', 'revisionContextReceiptsSync')
  const payload = evidence.payload
  if (!evidence.present) return ['缺少 revision_context_receipts_sync 复检结果']
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
  return syncClosureOutcomeResiduals(payload, 'revision_context_receipts_sync', missed, '修订上下文残留')
}

export function proseRevisionReceiptResidualsFromQuality(value: any): string[] {
  const evidence = namedSyncPayloadEvidence(value, 'prose_revision_receipt_sync', 'proseRevisionReceiptSync')
  const payload = evidence.payload
  if (!evidence.present) return ['缺少 prose_revision_receipt_sync 复检结果']
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
  return syncClosureOutcomeResiduals(payload, 'prose_revision_receipt_sync', missed, '修订回执残留')
}

export function qualityAuditRepairReceiptSyncPayload(value: any) {
  return syncPayload(value, 'quality_audit_repair_receipt_sync', 'qualityAuditRepairReceiptSync')
}

export function qualityAuditRepairReceiptResidualsFromQuality(value: any): string[] {
  const evidence = namedSyncPayloadEvidence(value, 'quality_audit_repair_receipt_sync', 'qualityAuditRepairReceiptSync')
  const payload = evidence.payload
  if (!evidence.present) return ['缺少 quality_audit_repair_receipt_sync 复检结果']
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
  return syncClosureOutcomeResiduals(payload, 'quality_audit_repair_receipt_sync', missed, '质量诊断修复回执缺口')
}

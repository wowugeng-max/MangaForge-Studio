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
  qualityAuditRepairReceiptLine,
} from './support-normalize-repairs-audit-quality-deslop'

export function revisionCascadeImpactLine(value: any) {
  if (typeof value === 'string') return value
  const item = objectValue(value)
  const target = firstText(item.target, item.label, item.key, item.type, '级联影响')
  const detail = firstText(item.text, item.impact, item.evidence, item.message, item.summary, item.risk)
  const action = firstText(item.required_action, item.requiredAction, item.action, item.fix)
  return [
    target,
    detail ? `影响：${detail}` : '',
    action ? `后续动作：${action}` : '',
  ].filter(Boolean).join('｜')
}

export function normalizeRevisionCascadeImpactRepair(task: AnyRecord) {
  const payload = objectValue(task.payload)
  const normalizedKind = [
    task.issue_type,
    task.issueType,
    task.annotation_category,
    task.annotationCategory,
    task.source_label,
    task.sourceLabel,
    task.action,
    task.message,
  ].map(item => text(item).toLowerCase()).join(' ')
  const isCascade = normalizedKind.includes('revision_cascade_impact')
    || text(task.annotation_category, task.annotationCategory) === 'revision_cascade_impact'
    || text(task.source_label, task.sourceLabel) === '级联修订'
    || text(task.action).includes('cascade_impacts')
  if (!isCascade) return null
  const missed = limitedArray(payload.missed, payload.gaps, payload.issues, payload.evidence_missing, payload.evidenceMissing, task.missed, task.gaps, task.issues)
    .map(revisionCascadeImpactLine)
    .filter(Boolean)
  const nextActions = limitedArray(payload.next_actions, payload.nextActions, task.next_actions, task.nextActions)
    .map(item => text(item))
    .filter(Boolean)
  return {
    issueType: firstText(task.issue_type, task.issueType, payload.key, 'revision_cascade_impact'),
    severity: firstText(task.severity, payload.severity, payload.status),
    sourceLabel: firstText(task.source_label, task.sourceLabel, payload.label, '级联修订'),
    message: firstText(task.message, payload.summary, payload.message),
    action: firstText(task.action, payload.fix, payload.action, ...nextActions),
    missed,
    nextActions,
  }
}

export function revisionScopeGuardLine(value: any) {
  if (typeof value === 'string') return value
  const item = objectValue(value)
  const label = firstText(item.label, item.key, item.type, '修订幅度')
  const detail = firstText(item.text, item.evidence, item.message, item.summary, item.risk)
  const fix = firstText(item.fix, item.action, item.required_action, item.requiredAction)
  return [
    label,
    detail ? `证据：${detail}` : '',
    fix ? `修法：${fix}` : '',
  ].filter(Boolean).join('｜')
}

export function normalizeRevisionScopeGuardRepair(task: AnyRecord) {
  const payload = objectValue(task.payload)
  const normalizedKind = [
    task.issue_type,
    task.issueType,
    task.annotation_category,
    task.annotationCategory,
    task.source_label,
    task.sourceLabel,
    task.action,
    task.message,
  ].map(item => text(item).toLowerCase()).join(' ')
  const isScopeGuard = normalizedKind.includes('revision_scope_guard')
    || text(task.annotation_category, task.annotationCategory) === 'revision_scope_guard'
    || text(task.source_label, task.sourceLabel) === '修订幅度'
    || text(task.action).includes('不要重写整章')
  if (!isScopeGuard) return null
  const missed = limitedArray(payload.missed, payload.gaps, payload.issues, task.missed, task.gaps, task.issues)
    .map(revisionScopeGuardLine)
    .filter(Boolean)
  const nextActions = limitedArray(payload.next_actions, payload.nextActions, task.next_actions, task.nextActions)
    .map(item => text(item))
    .filter(Boolean)
  return {
    issueType: firstText(task.issue_type, task.issueType, payload.key, 'revision_scope_guard'),
    severity: firstText(task.severity, payload.severity, payload.status),
    sourceLabel: firstText(task.source_label, task.sourceLabel, payload.label, '修订幅度'),
    message: firstText(task.message, payload.summary, payload.message),
    action: firstText(task.action, payload.fix, payload.action, ...nextActions),
    missed,
    nextActions,
  }
}

export function revisionContextReceiptLine(value: any) {
  if (typeof value === 'string') return value
  const item = objectValue(value)
  const label = firstText(item.label, item.key, item.type, item.category, '修订上下文')
  const detail = firstText(item.text, item.evidence, item.source_excerpt, item.sourceExcerpt, item.message, item.summary, item.risk)
  const fix = firstText(item.fix, item.action, item.required_action, item.requiredAction)
  return [
    label,
    detail ? `证据：${detail}` : '',
    fix ? `修法：${fix}` : '',
  ].filter(Boolean).join('｜')
}

export function normalizeRevisionContextReceiptRepair(task: AnyRecord) {
  const payload = objectValue(task.payload)
  const normalizedKind = [
    task.issue_type,
    task.issueType,
    task.annotation_category,
    task.annotationCategory,
    task.source_label,
    task.sourceLabel,
    task.action,
    task.message,
  ].map(item => text(item).toLowerCase()).join(' ')
  const isContextReceipt = normalizedKind.includes('revision_context_receipts')
    || text(task.annotation_category, task.annotationCategory) === 'revision_context_receipts'
    || text(task.source_label, task.sourceLabel) === '修订上下文'
  if (!isContextReceipt) return null
  const missed = limitedArray(payload.missed, payload.gaps, payload.issues, task.missed, task.gaps, task.issues)
    .map(revisionContextReceiptLine)
    .filter(Boolean)
  const nextActions = limitedArray(payload.next_actions, payload.nextActions, task.next_actions, task.nextActions)
    .map(item => text(item))
    .filter(Boolean)
  return {
    issueType: firstText(task.issue_type, task.issueType, payload.key, 'revision_context_receipts_sync'),
    severity: firstText(task.severity, payload.severity, payload.status),
    sourceLabel: firstText(task.source_label, task.sourceLabel, payload.label, '修订上下文'),
    message: firstText(task.message, payload.summary, payload.message),
    action: firstText(task.action, payload.fix, payload.action, ...nextActions),
    missed,
    nextActions,
  }
}

export function proseRevisionReceiptSyncLine(value: any) {
  if (typeof value === 'string') return value
  const item = objectValue(value)
  const label = firstText(item.label, item.category, item.key, item.type, '修订回执')
  const detail = firstText(item.text, item.risk, item.remaining_risk, item.remainingRisk, item.message, item.summary)
  const evidence = firstText(item.evidence, item.changed_evidence, item.changedEvidence, item.applied_fix, item.appliedFix)
  return [
    label,
    detail ? `缺口：${detail}` : '',
    evidence ? `证据：${evidence}` : '',
  ].filter(Boolean).join('｜')
}

export function normalizeProseRevisionReceiptSyncRepair(task: AnyRecord) {
  const payload = objectValue(task.payload)
  const normalizedKind = [
    task.issue_type,
    task.issueType,
    task.annotation_category,
    task.annotationCategory,
    task.source_label,
    task.sourceLabel,
    task.action,
    task.message,
  ].map(item => text(item).toLowerCase()).join(' ')
  const isRevisionReceiptSync = normalizedKind.includes('prose_revision_receipt_sync')
    || text(task.annotation_category, task.annotationCategory) === 'prose_revision_receipt_sync'
    || text(task.annotation_category, task.annotationCategory) === 'prose_revision_receipt'
    || text(task.source_label, task.sourceLabel) === '修订回执'
    || text(task.action).includes('revision_receipts')
  if (!isRevisionReceiptSync) return null
  const missed = limitedArray(payload.missed, payload.gaps, payload.issues, task.missed, task.gaps, task.issues)
    .map(proseRevisionReceiptSyncLine)
    .filter(Boolean)
  const nextActions = limitedArray(payload.next_actions, payload.nextActions, task.next_actions, task.nextActions)
    .map(item => text(item))
    .filter(Boolean)
  return {
    issueType: firstText(task.issue_type, task.issueType, payload.key, 'prose_revision_receipt_sync'),
    severity: firstText(task.severity, payload.severity, payload.status),
    sourceLabel: firstText(task.source_label, task.sourceLabel, payload.label, '修订回执'),
    message: firstText(task.message, payload.summary, payload.message),
    action: firstText(task.action, payload.fix, payload.action, ...nextActions),
    missed,
    nextActions,
  }
}

export function normalizeQualityAuditRepairReceiptRepair(task: AnyRecord) {
  const payload = objectValue(task.payload)
  const normalizedKind = [
    task.issue_type,
    task.issueType,
    task.annotation_category,
    task.annotationCategory,
    task.source_label,
    task.sourceLabel,
    task.action,
    task.message,
  ].map(item => text(item).toLowerCase()).join(' ')
  const isRepairReceipt = normalizedKind.includes('quality_audit_repair_receipt')
    || text(task.annotation_category, task.annotationCategory) === 'quality_audit_repair_receipt'
    || text(task.source_label, task.sourceLabel) === '质量回执'
    || text(task.action).includes('quality_audit_repair_receipts')
  if (!isRepairReceipt) return null
  const missed = limitedArray(payload.missed, payload.gaps, payload.issues, task.missed, task.gaps, task.issues)
    .map(qualityAuditRepairReceiptLine)
    .filter(Boolean)
  const nextActions = limitedArray(payload.next_actions, payload.nextActions, task.next_actions, task.nextActions)
    .map(item => text(item))
    .filter(Boolean)
  return {
    issueType: firstText(task.issue_type, task.issueType, payload.key, 'quality_audit_repair_receipt'),
    severity: firstText(task.severity, payload.severity, payload.status),
    sourceLabel: firstText(task.source_label, task.sourceLabel, payload.label, '质量回执'),
    message: firstText(task.message, payload.summary, payload.message),
    action: firstText(task.action, payload.fix, payload.action, ...nextActions),
    missed,
    nextActions,
  }
}


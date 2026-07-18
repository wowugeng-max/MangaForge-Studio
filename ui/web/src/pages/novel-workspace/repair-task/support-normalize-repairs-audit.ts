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

export function qualityAuditCheckLine(value: any) {
  if (typeof value === 'string') return value
  const item = objectValue(value)
  const label = firstText(item.label, item.key, item.type, '质量诊断')
  const status = firstText(item.status, item.result)
  const statusKey = status.toLowerCase()
  const passedLike = ['pass', 'passed', 'ok', 'done', 'true'].includes(statusKey)
  const missingFields = qualityContractMissingFields(item, 'quality_audit_checks')
  const missingDetail = missingFields.length > 0 ? `缺少字段 ${missingFields.join(', ')}` : ''
  const evidence = firstText(item.evidence, item.message, item.summary, item.text)
  const fix = firstText(item.fix, item.action)
  const strategy = firstText(item.strategy)
  return [
    status ? `${status}` : '',
    label,
    passedLike && missingDetail ? missingDetail : '',
    evidence ? `证据：${evidence}` : '',
    fix ? `修法：${fix}` : '',
    strategy ? `策略：${strategy}` : '',
    !passedLike && missingDetail ? missingDetail : '',
  ].filter(Boolean).join('｜')
}

export function qualityAuditCheckFailed(value: any) {
  if (typeof value === 'string') return /fail|failed|warn|warning|missing|missed|block|阻|缺|未/.test(value.toLowerCase())
  const item = objectValue(value)
  const status = firstText(item.status, item.result, item.severity).toLowerCase()
  const score = Number(item.score)
  const missingFields = qualityContractMissingFields(item, 'quality_audit_checks')
  if (missingFields.length > 0) return true
  if (['pass', 'passed', 'ok', 'done', 'true'].includes(status)) return false
  if (['fail', 'failed', 'warn', 'warning', 'missing', 'missed', 'blocker', 'blocked', 'error'].includes(status)) return true
  return Number.isFinite(score) && score < 78
}

export function normalizeQualityAuditRepair(task: AnyRecord) {
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
  if (normalizedKind.includes('quality_audit_repair_receipt')) return null
  const isQualityAudit = normalizedKind.includes('quality_audit')
    || text(task.annotation_category, task.annotationCategory) === 'quality_audit'
    || text(task.source_label, task.sourceLabel) === '质量诊断'
    || text(task.action).includes('quality_audit_checks')
  if (!isQualityAudit) return null
  const checks = limitedArray(payload.checks, task.checks, payload.quality_audit_checks, payload.qualityAuditChecks)
    .map(qualityAuditCheckLine)
    .filter(Boolean)
  return {
    issueType: firstText(task.issue_type, task.issueType, payload.key, 'quality_audit_gap'),
    severity: firstText(task.severity, payload.severity, payload.status),
    sourceLabel: firstText(task.source_label, task.sourceLabel, payload.label, '质量诊断'),
    strategy: firstText(payload.strategy, task.strategy),
    message: firstText(task.message, payload.evidence, payload.message),
    action: firstText(task.action, payload.fix, payload.action),
    checks,
  }
}

export function qualityAuditRepairReceiptLine(value: any) {
  if (typeof value === 'string') return value
  const item = objectValue(value)
  const label = firstText(item.label, item.key, item.check_key, item.checkKey, '质量诊断修复回执')
  const detail = firstText(item.text, item.evidence, item.message, item.summary, item.risk)
  return [label, detail ? `证据：${detail}` : ''].filter(Boolean).join('｜')
}

export function deslopRepairReceiptLine(value: any) {
  if (typeof value === 'string') return value
  const item = objectValue(value)
  const label = firstText(item.label, item.gate, item.key, item.check_key, item.checkKey, '去AI味修复回执')
  const detail = firstText(item.text, item.evidence, item.message, item.summary, item.risk)
  return [label, detail ? `证据：${detail}` : ''].filter(Boolean).join('｜')
}

export function normalizeDeslopRepairReceiptRepair(task: AnyRecord) {
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
  const isRepairReceipt = normalizedKind.includes('deslop_repair_receipt')
    || text(task.annotation_category, task.annotationCategory) === 'deslop_repair_receipt'
    || text(task.source_label, task.sourceLabel) === '去AI味回执'
    || text(task.action).includes('deslop_repair_receipts')
  if (!isRepairReceipt) return null
  const missed = limitedArray(payload.missed, payload.gaps, payload.issues, task.missed, task.gaps, task.issues)
    .map(deslopRepairReceiptLine)
    .filter(Boolean)
  const nextActions = limitedArray(payload.next_actions, payload.nextActions, task.next_actions, task.nextActions)
    .map(item => text(item))
    .filter(Boolean)
  return {
    issueType: firstText(task.issue_type, task.issueType, payload.key, 'deslop_repair_receipt'),
    severity: firstText(task.severity, payload.severity, payload.status),
    sourceLabel: firstText(task.source_label, task.sourceLabel, payload.label, '去AI味回执'),
    message: firstText(task.message, payload.summary, payload.message),
    action: firstText(task.action, payload.fix, payload.action, ...nextActions),
    missed,
    nextActions,
  }
}

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

export function qualityAuditResidualsFromQuality(value: any, issueType = ''): string[] {
  const quality = objectValue(value)
  const review = objectValue(quality.review)
  const payload = parseJsonValue(review.payload) || objectValue(review.payload)
  const normalizedIssueType = text(issueType).toLowerCase()
  const candidates = [
    ...arrayValue(review.quality_audit_checks || review.qualityAuditChecks),
    ...arrayValue(quality.quality_audit_checks || quality.qualityAuditChecks),
    ...arrayValue(payload.self_check?.review?.quality_audit_checks),
    ...arrayValue(payload.self_check?.quality_audit_checks),
    ...arrayValue(payload.quality_audit_checks),
  ]
  return candidates
    .filter(item => {
      if (!qualityAuditCheckFailed(item)) return false
      if (!normalizedIssueType) return true
      const itemKey = firstText(item?.key, item?.type).toLowerCase()
      const itemText = qualityAuditCheckLine(item).toLowerCase()
      return itemKey === normalizedIssueType || itemText.includes(normalizedIssueType)
    })
    .map(qualityAuditCheckLine)
    .filter(Boolean)
}

export function preDraftExecutionReceiptKeyForTask(task: AnyRecord) {
  const issueType = firstText(task.issue_type, task.issueType).toLowerCase()
  const category = firstText(task.annotation_category, task.annotationCategory, task.category).toLowerCase()
  if (issueType.includes('next_chapter_quality_plan_receipts') || category.includes('next_chapter_quality_plan_receipts')) {
    return {
      snake: 'next_chapter_quality_plan_receipts',
      camel: 'nextChapterQualityPlanReceipts',
      label: '质量续航回执',
    }
  }
  if (issueType.includes('status_filter') || category.includes('status_filter')) {
    return {
      snake: 'status_filter_receipts',
      camel: 'statusFilterReceipts',
      label: '状态筛选',
    }
  }
  if (issueType.includes('intent_confirmation') || category.includes('intent_confirmation')) {
    return {
      snake: 'intent_confirmation_checks',
      camel: 'intentConfirmationChecks',
      label: '写前意图确认',
    }
  }
  if (issueType.includes('write_preparation') || category.includes('write_preparation')) {
    return {
      snake: 'write_preparation_checks',
      camel: 'writePreparationChecks',
      label: '写前准备',
    }
  }
  if (issueType.includes('benchmark_recall') || category.includes('benchmark_recall')) {
    return {
      snake: 'benchmark_recall_checks',
      camel: 'benchmarkRecallChecks',
      label: '文风召回',
    }
  }
  return null
}

export const BENCHMARK_RECALL_HARD_GAP_KEYS = [
  'missing_primary_contract',
  'profile_missing',
  'module_missing',
  'rhythm_missing',
  'conflict',
  'module_rhythm_conflict',
]

export function truthyGapValue(value: any) {
  if (value === false || value === null || value === undefined || value === 0) return false
  const normalized = text(value).toLowerCase()
  return !['', 'false', '0', 'no', 'none', 'null', 'undefined', '已关闭', '已解决'].includes(normalized)
}

export function syncReceiptGenericEvidenceResiduals(payload: AnyRecord, receiptKeys: string[], line: (value: any) => string, options: { keyedReceiptsRequireChangedEvidence?: boolean, requiredFields?: string[] } = {}) {
  return [
    ...receiptKeys,
    'completed',
    'completed_receipts',
    'completedReceipts',
  ]
    .flatMap(key => arrayValue(payload[key]))
    .filter(Boolean)
    .map(receipt => {
      const missingRequiredFields = receiptMissingRequiredFieldsDetail(receipt, options.requiredFields || [])
      if (missingRequiredFields) {
        const receiptLine = line(receipt)
        return receiptLine ? `${receiptLine}｜${missingRequiredFields}` : missingRequiredFields
      }
      const missingChangedEvidence = revisionReceiptMissingChangedEvidenceDetail(receipt, options)
      if (missingChangedEvidence) {
        const receiptLine = line(receipt)
        return receiptLine ? `${receiptLine}｜${missingChangedEvidence}` : missingChangedEvidence
      }
      const genericEvidence = genericClosureEvidenceDetail(receipt)
      if (!genericEvidence) return ''
      const receiptLine = line(receipt)
      return receiptLine ? `${receiptLine}｜${genericEvidence}` : genericEvidence
    })
    .filter(Boolean)
    .slice(0, 6)
}

export function receiptMissingRequiredFieldsDetail(item: any, requiredFields: string[] = []) {
  if (requiredFields.length === 0) return ''
  const receipt = objectValue(item)
  const missing = requiredFields.filter(field => {
    if (field === 'source_excerpt') return !firstText(receipt.source_excerpt, receipt.sourceExcerpt)
    if (field === 'changed_evidence') return !firstText(receipt.changed_evidence, receipt.changedEvidence)
    return !firstText(receipt[field])
  })
  return missing.length > 0 ? `缺少 ${missing.join('/')}` : ''
}

export function revisionReceiptMissingChangedEvidenceDetail(item: any, options: { keyedReceiptsRequireChangedEvidence?: boolean } = {}) {
  const receipt = objectValue(item)
  const looksLikeRevisionReceipt = Boolean(
    firstText(receipt.applied_fix, receipt.appliedFix)
    || firstText(receipt.original_evidence, receipt.originalEvidence)
    || firstText(receipt.check_key, receipt.checkKey)
    || (options.keyedReceiptsRequireChangedEvidence ? firstText(receipt.key) : '')
    || (options.keyedReceiptsRequireChangedEvidence ? firstText(receipt.label, receipt.name) : '')
    || firstText(receipt.gate)
    || Number.isFinite(Number(receipt.issue_index ?? receipt.issueIndex)),
  )
  if (!looksLikeRevisionReceipt) return ''
  return firstText(receipt.changed_evidence, receipt.changedEvidence) ? '' : '缺少 changed_evidence，无法定位修订后正文证据'
}

export function benchmarkRecallPreservedHardGaps(item: any) {
  const check = objectValue(item)
  const raw = check.gaps_preserved ?? check.gapsPreserved ?? check.gaps
  const gapObject = objectValue(raw)
  if (Object.keys(gapObject).length > 0) {
    const noBenchmark = truthyGapValue(gapObject.no_benchmark ?? gapObject.noBenchmark)
    if (noBenchmark) return []
    const legacyDeconstruction = truthyGapValue(gapObject.legacy_deconstruction ?? gapObject.legacyDeconstruction)
    return BENCHMARK_RECALL_HARD_GAP_KEYS
      .filter(key => !(legacyDeconstruction && ['module_missing', 'rhythm_missing'].includes(key)))
      .filter(key => truthyGapValue(gapObject[key] ?? gapObject[camelFieldName(key)]))
  }
  const gapItems = Array.isArray(raw) ? raw.map(item => text(item).toLowerCase()).filter(Boolean) : []
  const gapText = gapItems.length > 0 ? gapItems.join(' ') : text(raw).toLowerCase()
  if (!gapText || gapText.includes('no_benchmark')) return []
  const legacyDeconstruction = gapText.includes('legacy_deconstruction')
  return BENCHMARK_RECALL_HARD_GAP_KEYS
    .filter(key => !(legacyDeconstruction && ['module_missing', 'rhythm_missing'].includes(key)))
    .filter(key => {
      if (!gapText.includes(key)) return false
      if (gapText.includes(`${key}=false`) || gapText.includes(`${key}:false`)) return false
      return true
    })
}

export function preDraftExecutionHardGapDetail(item: any, snakeKey = '') {
  if (snakeKey !== 'benchmark_recall_checks') return ''
  const hardGaps = benchmarkRecallPreservedHardGaps(item)
  return hardGaps.length > 0 ? `硬缺口仍未闭环 ${hardGaps.join(', ')}` : ''
}

export function preDraftExecutionCheckFailed(item: any, snakeKey = '') {
  const check = objectValue(item)
  const status = firstText(check.status, check.result, check.state).toLowerCase()
  const remainingRisk = firstText(check.remaining_risk, check.remainingRisk, check.residual_risk, check.residualRisk)
  const contractKey = firstText(snakeKey, check.contract_key, check.contractKey, check.check_group, check.checkGroup)
  const missingFields = contractKey ? qualityContractMissingFields(item, contractKey) : []
  const hardGapDetail = preDraftExecutionHardGapDetail(item, contractKey)
  const genericEvidenceDetail = genericClosureEvidenceDetail(item)
  return check.delivered === false
    || Boolean(remainingRisk)
    || missingFields.length > 0
    || Boolean(hardGapDetail)
    || Boolean(genericEvidenceDetail)
    || ['fail', 'failed', 'warn', 'warning', 'missing', 'missed', 'false', 'no', '0'].includes(status)
}

export function preDraftExecutionCheckLine(item: any, snakeKey = '') {
  const check = objectValue(item)
  const label = firstText(check.label, check.key, check.check_key, check.checkKey, '写前执行回执')
  const missingFields = snakeKey ? qualityContractMissingFields(item, snakeKey) : []
  const status = firstText(check.status, check.result, check.state).toLowerCase()
  const passedLike = ['pass', 'passed', 'ok', 'done', 'true'].includes(status) || check.delivered === true
  const missingDetail = missingFields.length > 0 ? `缺少字段 ${missingFields.join(', ')}` : ''
  const hardGapDetail = preDraftExecutionHardGapDetail(item, snakeKey)
  const genericEvidenceDetail = genericClosureEvidenceDetail(item)
  const detail = firstText(
    hardGapDetail,
    genericEvidenceDetail,
    passedLike ? missingDetail : '',
    check.remaining_risk,
    check.remainingRisk,
    check.evidence,
    check.actual,
    check.message,
    check.text,
    check.description,
    !passedLike ? missingDetail : '',
    check.status,
  )
  return detail && label !== detail ? `${label}：${detail}` : label
}

export function preDraftExecutionResidualsFromQuality(value: any, snakeKey: string, camelKey: string): string[] {
  const candidates = preDraftExecutionReceiptSources(value)
    .flatMap(source => arrayValue(source[snakeKey] || source[camelKey]))
    .map(item => typeof item === 'string' ? item : { ...objectValue(item), contract_key: snakeKey })
  if (candidates.length === 0) return [`缺少 ${snakeKey} 写前执行回执`]
  return candidates
    .filter(item => preDraftExecutionCheckFailed(item, snakeKey))
    .map(item => preDraftExecutionCheckLine(item, snakeKey))
    .filter(Boolean)
}

export function sourceReadinessCheckFailed(item: any) {
  if (typeof item === 'string') return true
  const check = objectValue(item)
  const status = firstText(check.status, check.result, check.state).toLowerCase()
  const remainingRisk = firstText(check.remaining_risk, check.remainingRisk, check.residual_risk, check.residualRisk)
  const missingFields = qualityContractMissingFields(item, 'source_readiness_checks')
  const genericEvidenceDetail = genericClosureEvidenceDetail(item)
  return ['fail', 'failed', 'warn', 'warning', 'missing', 'missed', 'blocked', 'error'].includes(status)
    || check.ready === false
    || check.delivered === false
    || missingFields.length > 0
    || Boolean(genericEvidenceDetail)
    || Boolean(remainingRisk)
}

export function sourceReadinessCheckLine(item: any) {
  if (typeof item === 'string') return item
  const check = objectValue(item)
  const label = firstText(check.label, check.key, check.check_key, check.checkKey, '来源就绪')
  const missingFields = qualityContractMissingFields(item, 'source_readiness_checks')
  const genericEvidenceDetail = genericClosureEvidenceDetail(item)
  if (missingFields.length > 0) return `${label}：缺少字段 ${missingFields.join(', ')}`
  if (genericEvidenceDetail) return `${label}：${genericEvidenceDetail}`
  const detail = firstText(
    check.remaining_risk,
    check.remainingRisk,
    check.evidence,
    check.actual,
    check.message,
    check.text,
    check.description,
    check.fix,
    check.status,
  )
  return detail && label !== detail ? `${label}：${detail}` : label
}

export function sourceReadinessResidualsFromQuality(value: any): string[] {
  const quality = objectValue(value)
  const review = objectValue(quality.review)
  const result = objectValue(quality.result)
  const payload = parseJsonValue(review.payload) || objectValue(review.payload)
  const selfCheck = objectValue(payload.self_check || payload.selfCheck)
  const selfCheckReview = objectValue(selfCheck.review)
  const candidates = [
    ...arrayValue(review.source_readiness_checks || review.sourceReadinessChecks),
    ...arrayValue(quality.source_readiness_checks || quality.sourceReadinessChecks),
    ...arrayValue(result.source_readiness_checks || result.sourceReadinessChecks),
    ...arrayValue(payload.source_readiness_checks || payload.sourceReadinessChecks),
    ...arrayValue(selfCheck.source_readiness_checks || selfCheck.sourceReadinessChecks),
    ...arrayValue(selfCheckReview.source_readiness_checks || selfCheckReview.sourceReadinessChecks),
    ...preDraftExecutionReceiptSources(value)
      .flatMap(source => arrayValue(source.source_readiness_checks || source.sourceReadinessChecks)),
  ]
  if (candidates.length === 0) return ['缺少 source_readiness_checks 复检结果']
  return candidates
    .filter(sourceReadinessCheckFailed)
    .map(sourceReadinessCheckLine)
    .filter(Boolean)
}

export function stateTrackingCheckFailed(item: any) {
  if (typeof item === 'string') return true
  const check = objectValue(item)
  const status = firstText(check.status, check.result, check.state).toLowerCase()
  const remainingRisk = firstText(check.remaining_risk, check.remainingRisk, check.residual_risk, check.residualRisk)
  const missingFields = qualityContractMissingFields(item, 'state_tracking_checks')
  const genericEvidenceDetail = genericClosureEvidenceDetail(item)
  return ['fail', 'failed', 'warn', 'warning', 'missing', 'missed', 'blocked', 'error'].includes(status)
    || check.ready === false
    || check.delivered === false
    || missingFields.length > 0
    || Boolean(genericEvidenceDetail)
    || Boolean(remainingRisk)
}

export function stateTrackingCheckLine(item: any) {
  if (typeof item === 'string') return item
  const check = objectValue(item)
  const label = firstText(check.label, check.key, check.check_key, check.checkKey, '状态跟踪')
  const missingFields = qualityContractMissingFields(item, 'state_tracking_checks')
  const genericEvidenceDetail = genericClosureEvidenceDetail(item)
  if (missingFields.length > 0) return `${label}：缺少字段 ${missingFields.join(', ')}`
  if (genericEvidenceDetail) return `${label}：${genericEvidenceDetail}`
  const detail = firstText(
    check.remaining_risk,
    check.remainingRisk,
    check.evidence,
    check.actual,
    check.message,
    check.text,
    check.description,
    check.fix,
    check.status,
  )
  return detail && label !== detail ? `${label}：${detail}` : label
}

export function stateTrackingResidualsFromQuality(value: any): string[] {
  const quality = objectValue(value)
  const review = objectValue(quality.review)
  const result = objectValue(quality.result)
  const payload = parseJsonValue(review.payload) || objectValue(review.payload)
  const selfCheck = objectValue(payload.self_check || payload.selfCheck)
  const selfCheckReview = objectValue(selfCheck.review)
  const candidates = [
    ...arrayValue(review.state_tracking_checks || review.stateTrackingChecks),
    ...arrayValue(quality.state_tracking_checks || quality.stateTrackingChecks),
    ...arrayValue(result.state_tracking_checks || result.stateTrackingChecks),
    ...arrayValue(payload.state_tracking_checks || payload.stateTrackingChecks),
    ...arrayValue(selfCheck.state_tracking_checks || selfCheck.stateTrackingChecks),
    ...arrayValue(selfCheckReview.state_tracking_checks || selfCheckReview.stateTrackingChecks),
  ]
  if (candidates.length === 0) return ['缺少 state_tracking_checks 复检结果']
  return candidates
    .filter(stateTrackingCheckFailed)
    .map(stateTrackingCheckLine)
    .filter(Boolean)
}


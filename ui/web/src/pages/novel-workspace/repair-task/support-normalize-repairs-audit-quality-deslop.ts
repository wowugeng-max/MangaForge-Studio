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
  rawPassLikeStatusOutcome,
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
  const explicitStatusPassed = rawPassLikeStatusOutcome(item, 'status', 'result', 'severity')
  const score = Number(item.score)
  const missingFields = qualityContractMissingFields(item, 'quality_audit_checks')
  if (missingFields.length > 0) return true
  if (explicitStatusPassed !== null) return !explicitStatusPassed
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

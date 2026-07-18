import { asArray, parseJsonLikePayload } from '../novel-route-utils'
import {
  compactAuditText,
  annotationKey,
} from './builders'

function qualityAuditCheckText(value: any) {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object') return ''
  return [
    value.key,
    value.type,
    value.label,
    value.status,
    value.evidence,
    value.message,
    value.summary,
    value.text,
    value.fix,
    value.strategy,
  ].flat().map(item => String(item || '')).join(' ')
}

function qualityAuditCheckFailed(value: any) {
  if (typeof value === 'string') return true
  const status = String(value?.status || value?.result || '').trim().toLowerCase()
  const score = Number(value?.score)
  return ['fail', 'failed', 'warn', 'warning', 'blocked', 'error'].includes(status)
    || (Number.isFinite(score) && score < 78)
}

export function qualityAuditFailureChecks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || {}
  const review = selfCheck?.review || payload?.review || {}
  return [
    ...asArray(review?.quality_audit_checks || review?.qualityAuditChecks),
    ...asArray(selfCheck?.quality_audit_checks || selfCheck?.qualityAuditChecks),
    ...asArray(payload?.quality_audit_checks || payload?.qualityAuditChecks),
  ].filter(item => !qualityAuditCheckText(item).toLowerCase().includes('scene_card_receipt'))
    .filter(qualityAuditCheckFailed)
}

export function qualityAuditSeverity(checks: any[]) {
  return checks.some(item => {
    if (typeof item === 'string') return false
    const status = String(item?.status || item?.result || '').trim().toLowerCase()
    const score = Number(item?.score)
    return ['fail', 'failed', 'blocked', 'error'].includes(status)
      || (Number.isFinite(score) && score < 65)
  }) ? 'high' : 'medium'
}

export function qualityAuditMessage(checks: any[]) {
  return checks.map(item => {
    if (typeof item === 'string') return item
    return String(item?.evidence || item?.message || item?.summary || item?.text || item?.fix || qualityAuditCheckText(item)).trim()
  }).filter(Boolean).slice(0, 4).join('；') || '质量诊断检查存在未清 fail/warn 项。'
}

function sourceReadinessCheckText(value: any) {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object') return ''
  return [
    value.key,
    value.type,
    value.label,
    value.status,
    value.evidence,
    value.message,
    value.summary,
    value.text,
    value.fix,
    value.required_action,
    value.requiredAction,
  ].flat().map(item => String(item || '')).join(' ')
}

function sourceReadinessCheckNeedsRepair(value: any) {
  if (typeof value === 'string') return true
  const status = String(value?.status || value?.result || value?.state || '').trim().toLowerCase()
  return ['fail', 'failed', 'warn', 'warning', 'missing', 'missed', 'blocked', 'error'].includes(status)
    || value?.ready === false
    || value?.delivered === false
    || Boolean(compactAuditText(value?.remaining_risk || value?.remainingRisk, 500))
}

export function sourceReadinessChecks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  return [
    ...asArray(review?.source_readiness_checks || review?.sourceReadinessChecks),
    ...asArray(selfCheck?.source_readiness_checks || selfCheck?.sourceReadinessChecks),
    ...asArray(payload?.source_readiness_checks || payload?.sourceReadinessChecks),
  ].filter(sourceReadinessCheckNeedsRepair)
}

function sourceReadinessEvidence(check: any) {
  return compactAuditText(
    check?.remaining_risk
    || check?.remainingRisk
    || check?.evidence
    || check?.issue
    || check?.reason
    || check?.description
    || check?.text
    || check?.fix
    || check?.label
    || check?.key,
    500,
  )
}

export function sourceReadinessMessage(checks: any[]) {
  return checks.map(sourceReadinessEvidence).filter(Boolean).slice(0, 4).join('；') || '来源就绪表存在未清 fail/warn 项。'
}

export function sourceReadinessMissedRows(checks: any[]) {
  return checks.map((check: any) => ({
    key: compactAuditText(check?.key || check?.check_key || check?.checkKey, 120),
    label: compactAuditText(check?.label || check?.name || check?.key, 120),
    text: sourceReadinessEvidence(check),
    evidence: compactAuditText(check?.evidence || check?.changed_evidence || check?.changedEvidence, 500),
    remaining_risk: compactAuditText(check?.remaining_risk || check?.remainingRisk, 500),
    fix: compactAuditText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || check?.required_action || check?.requiredAction, 500),
  })).filter(item => item.text || item.evidence || item.remaining_risk || item.fix)
}

function stateTrackingCheckNeedsRepair(value: any) {
  if (typeof value === 'string') return true
  const status = String(value?.status || value?.result || value?.state || '').trim().toLowerCase()
  return ['fail', 'failed', 'warn', 'warning', 'missing', 'missed', 'blocked', 'error'].includes(status)
    || value?.ready === false
    || value?.delivered === false
    || Boolean(compactAuditText(value?.remaining_risk || value?.remainingRisk, 500))
}

export function stateTrackingChecks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  return [
    ...asArray(review?.state_tracking_checks || review?.stateTrackingChecks),
    ...asArray(selfCheck?.state_tracking_checks || selfCheck?.stateTrackingChecks),
    ...asArray(payload?.state_tracking_checks || payload?.stateTrackingChecks),
  ].filter(stateTrackingCheckNeedsRepair)
}

function stateTrackingEvidence(check: any) {
  return compactAuditText(
    check?.remaining_risk
    || check?.remainingRisk
    || check?.evidence
    || check?.issue
    || check?.reason
    || check?.description
    || check?.text
    || check?.fix
    || check?.label
    || check?.key,
    500,
  )
}

export function stateTrackingMessage(checks: any[]) {
  return checks.map(stateTrackingEvidence).filter(Boolean).slice(0, 4).join('；') || '状态跟踪检查存在未清 fail/warn 项。'
}

export function stateTrackingMissedRows(checks: any[]) {
  return checks.map((check: any) => ({
    key: compactAuditText(check?.key || check?.check_key || check?.checkKey, 120),
    label: compactAuditText(check?.label || check?.name || check?.key, 120),
    text: stateTrackingEvidence(check),
    evidence: compactAuditText(check?.evidence || check?.changed_evidence || check?.changedEvidence, 500),
    remaining_risk: compactAuditText(check?.remaining_risk || check?.remainingRisk, 500),
    fix: compactAuditText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || check?.required_action || check?.requiredAction, 500),
  })).filter(item => item.text || item.evidence || item.remaining_risk || item.fix)
}

function qualityContractCheckNeedsRepair(value: any) {
  if (typeof value === 'string') return true
  const status = String(value?.status || value?.result || value?.state || '').trim().toLowerCase()
  return ['fail', 'failed', 'warn', 'warning', 'missing', 'missed', 'blocked', 'error'].includes(status)
    || value?.ready === false
    || value?.delivered === false
    || value?.passed === false
    || value?.ok === false
    || Boolean(compactAuditText(value?.remaining_risk || value?.remainingRisk, 500))
}

export function qualityContractChecks(payload: any, snakeKey: string, camelKey: string) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  return [
    ...asArray(review?.[snakeKey] || review?.[camelKey]),
    ...asArray(selfCheck?.[snakeKey] || selfCheck?.[camelKey]),
    ...asArray(payload?.[snakeKey] || payload?.[camelKey]),
  ].filter(qualityContractCheckNeedsRepair)
}

function qualityContractEvidence(check: any) {
  return compactAuditText(
    check?.remaining_risk
    || check?.remainingRisk
    || check?.evidence
    || check?.issue
    || check?.reason
    || check?.description
    || check?.text
    || check?.fix
    || check?.label
    || check?.key,
    500,
  )
}

export function qualityContractMessage(checks: any[], fallback: string) {
  return checks.map(qualityContractEvidence).filter(Boolean).slice(0, 4).join('；') || fallback
}

export function qualityContractMissedRows(checks: any[]) {
  return checks.map((check: any) => ({
    key: compactAuditText(check?.key || check?.check_key || check?.checkKey, 120),
    label: compactAuditText(check?.label || check?.name || check?.key, 120),
    text: qualityContractEvidence(check),
    evidence: compactAuditText(check?.evidence || check?.changed_evidence || check?.changedEvidence, 500),
    remaining_risk: compactAuditText(check?.remaining_risk || check?.remainingRisk, 500),
    fix: compactAuditText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || check?.required_action || check?.requiredAction, 500),
  })).filter(item => item.text || item.evidence || item.remaining_risk || item.fix)
}

export function sceneCardDirectiveCheckKey(check: any) {
  const key = String(check?.key || check?.check_key || check?.checkKey || check?.type || '').trim()
  return /^scene_card_\d+_(execution|forbidden)_directives$/i.test(key) ? key : ''
}

function uniqueObjectReferences(values: any[]) {
  const seen = new Set<any>()
  return values.filter((value) => {
    if (!value || typeof value !== 'object') return false
    if (seen.has(value)) return false
    seen.add(value)
    return true
  })
}

function deliveryReceiptsFrom(value: any = {}) {
  if (!value || typeof value !== 'object') return {}
  const rawPayload = value.raw_payload || value.rawPayload || {}
  return value.oh_story_delivery_receipts
    || value.ohStoryDeliveryReceipts
    || rawPayload.oh_story_delivery_receipts
    || rawPayload.ohStoryDeliveryReceipts
    || {}
}

function preDraftExecutionReceiptSections(payload: any = {}) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const receiptSources = uniqueObjectReferences([
    deliveryReceiptsFrom(review),
    deliveryReceiptsFrom(selfCheck),
    deliveryReceiptsFrom(payload),
  ])
  return uniqueObjectReferences([
    review?.pre_draft_execution_receipts || review?.preDraftExecutionReceipts,
    selfCheck?.pre_draft_execution_receipts || selfCheck?.preDraftExecutionReceipts,
    payload?.pre_draft_execution_receipts || payload?.preDraftExecutionReceipts,
    ...receiptSources.map(source => source?.pre_draft_execution_receipts || source?.preDraftExecutionReceipts),
  ])
}

function preDraftExecutionCheckNeedsRepair(value: any) {
  const status = compactAuditText(value?.status, 40).toLowerCase()
  if (['fail', 'failed', 'warn', 'warning', 'missing', 'missed', 'false', 'no', '0'].includes(status)) return true
  if (value?.delivered === false) return true
  return Boolean(compactAuditText(value?.remaining_risk || value?.remainingRisk, 500))
}

export function preDraftExecutionChecks(payload: any, snakeKey: string, camelKey: string) {
  return preDraftExecutionReceiptSections(payload)
    .flatMap(section => asArray(section?.[snakeKey] || section?.[camelKey]))
    .filter(preDraftExecutionCheckNeedsRepair)
}

function preDraftExecutionEvidence(check: any) {
  return compactAuditText(
    check?.remaining_risk
    || check?.remainingRisk
    || check?.evidence
    || check?.issue
    || check?.reason
    || check?.description
    || check?.text
    || check?.label
    || check?.key,
    500,
  )
}

export function preDraftExecutionMessage(checks: any[]) {
  return checks.map(preDraftExecutionEvidence).filter(Boolean).slice(0, 3).join('；')
}

export function preDraftExecutionMissedRows(checks: any[]) {
  return checks.map((check: any) => ({
    key: compactAuditText(check?.key || check?.check_key || check?.checkKey, 120),
    label: compactAuditText(check?.label || check?.name || check?.key, 120),
    text: preDraftExecutionEvidence(check),
    evidence: compactAuditText(check?.evidence || check?.changed_evidence || check?.changedEvidence, 500),
    remaining_risk: compactAuditText(check?.remaining_risk || check?.remainingRisk, 500),
    fix: compactAuditText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || check?.remaining_risk || check?.remainingRisk, 500),
  })).filter(item => item.text || item.evidence || item.remaining_risk || item.fix)
}

export function deliveryRiskMissedCount(risk: any) {
  const count = Number(risk?.missed_count ?? risk?.missedCount ?? risk?.risk_count ?? risk?.riskCount)
  if (Number.isFinite(count)) return Math.max(0, count)
  return asArray(risk?.missed || risk?.gaps || risk?.issues || risk?.evidence_missing || risk?.evidenceMissing).length
}

export function deliveryRiskMissedMessage(risk: any, fallback: string) {
  return [
    ...asArray(risk?.missed || risk?.gaps || risk?.issues || risk?.evidence_missing || risk?.evidenceMissing).map((item: any) => {
      if (typeof item === 'string') return item
      return String(item?.text || item?.evidence || item?.message || item?.summary || item?.risk || item?.required_action || item?.requiredAction || item?.target || item?.label || '').trim()
    }),
    ...asArray(risk?.next_actions || risk?.nextActions).map((item: any) => String(item || '').trim()),
    String(risk?.summary || '').trim(),
  ].filter(Boolean).slice(0, 3).join('；') || fallback
}

export function deslopRepairReceiptCount(risk: any) {
  const count = Number(risk?.missed_count ?? risk?.missedCount)
  if (Number.isFinite(count)) return Math.max(0, count)
  return asArray(risk?.missed || risk?.gaps || risk?.issues).length
}

export function deslopRepairReceiptMessage(risk: any) {
  return [
    ...asArray(risk?.missed || risk?.gaps || risk?.issues).map((item: any) => {
      if (typeof item === 'string') return item
      return String(item?.text || item?.evidence || item?.message || item?.summary || item?.risk || item?.label || '').trim()
    }),
    ...asArray(risk?.next_actions || risk?.nextActions).map((item: any) => String(item || '').trim()),
    String(risk?.summary || '').trim(),
  ].filter(Boolean).slice(0, 3).join('；') || 'deslop_repair_receipts 没有逐条证明去AI味修复已闭环。'
}

export function qualityAuditRepairReceiptCount(risk: any) {
  const count = Number(risk?.missed_count ?? risk?.missedCount)
  if (Number.isFinite(count)) return Math.max(0, count)
  return asArray(risk?.missed || risk?.gaps || risk?.issues).length
}

export function qualityAuditRepairReceiptMessage(risk: any) {
  return [
    ...asArray(risk?.missed || risk?.gaps || risk?.issues).map((item: any) => {
      if (typeof item === 'string') return item
      return String(item?.text || item?.evidence || item?.message || item?.summary || item?.risk || item?.label || '').trim()
    }),
    ...asArray(risk?.next_actions || risk?.nextActions).map((item: any) => String(item || '').trim()),
    String(risk?.summary || '').trim(),
  ].filter(Boolean).slice(0, 3).join('；') || 'quality_audit_repair_receipts 没有逐条证明质量诊断修复已闭环。'
}

export function latestAnnotationStatus(reviews: any[]) {
  const map = new Map<string, any>()
  reviews
    .filter(item => item.review_type === 'review_annotation_status')
    .slice()
    .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')))
    .forEach(item => {
      const payload = parseJsonLikePayload(item.payload) || {}
      if (payload.annotation_key) map.set(payload.annotation_key, { ...payload, review: item })
    })
  return map
}

export function pushAnnotation(items: any[], statuses: Map<string, any>, raw: any) {
  const key = raw.key || annotationKey(raw)
  const state = statuses.get(key) || {}
  items.push({
    key,
    status: state.status || raw.status || 'open',
    resolved_at: state.resolved_at || raw.resolved_at || null,
    resolution_note: state.note || raw.resolution_note || '',
    severity: raw.severity || 'medium',
    category: raw.category || 'general',
    kind: raw.kind || 'issue',
    title: raw.title || raw.message || '审阅批注',
    message: raw.message || raw.title || '',
    action: raw.action || raw.suggestion || '',
    chapter_id: raw.chapter_id || null,
    chapter_no: raw.chapter_no || null,
    source: raw.source || 'review',
    source_label: raw.source_label || raw.source || '审阅',
    review_id: raw.review_id || null,
    created_at: raw.created_at || '',
    payload: raw.payload || {},
  })
}


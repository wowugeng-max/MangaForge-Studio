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
  qualityAuditCheckFailed,
  qualityAuditCheckLine,
} from './support-normalize-repairs-audit-quality-deslop'

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


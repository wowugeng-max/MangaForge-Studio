import type { AnyRecord } from './utils'
import {
  arrayValue,
  firstText,
  objectValue,
  parseJsonValue,
  text,
} from './utils'
import {
  summarizeEvidenceItem,
  metricNumber,
  preDraftExecutionReceiptSources,
  genericClosureEvidenceDetail,
} from './quality-contract-evidence'
import { QUALITY_CONTRACT_REQUIRED_FIELDS } from './quality-contract-fields'

const RAW_PASS_LIKE_STATUSES = ['pass', 'passed', 'ok', 'done', 'true']

export function listQualityContractRequiredFieldKeys() {
  return Object.keys(QUALITY_CONTRACT_REQUIRED_FIELDS)
}

export function listQualityContractRequiredFields() {
  return Object.fromEntries(
    Object.entries(QUALITY_CONTRACT_REQUIRED_FIELDS).map(([key, fields]) => [key, [...fields]]),
  )
}

export function camelFieldName(field: string) {
  return field.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

export function rawPassLikeStatusOutcome(value: AnyRecord, ...keys: string[]): boolean | null {
  const suppliedKey = keys.find(key => Object.prototype.hasOwnProperty.call(value, key))
  if (!suppliedKey) return null
  return RAW_PASS_LIKE_STATUSES.includes(value[suppliedKey])
}

export function hasContractField(check: AnyRecord, field: string) {
  const camelField = camelFieldName(field)
  const hasSnake = Object.prototype.hasOwnProperty.call(check, field)
  const hasCamel = camelField !== field && Object.prototype.hasOwnProperty.call(check, camelField)
  if (!hasSnake && !hasCamel) return false
  if (field === 'remaining_risk') return true
  return firstText(check[field], check[camelField]) !== ''
}

export function qualityContractMissingFields(item: any, snakeKey: string) {
  if (typeof item === 'string') return []
  const requiredFields = QUALITY_CONTRACT_REQUIRED_FIELDS[snakeKey] || []
  if (requiredFields.length === 0) return []
  const check = objectValue(item)
  return requiredFields.filter(field => !hasContractField(check, field))
}

export function qualityContractCheckFailed(item: any, snakeKey = '') {
  if (typeof item === 'string') return true
  const check = objectValue(item)
  const explicitStatusPassed = rawPassLikeStatusOutcome(check, 'status', 'result', 'state')
  const remainingRisk = firstText(check.remaining_risk, check.remainingRisk, check.residual_risk, check.residualRisk)
  const missingFields = qualityContractMissingFields(item, snakeKey)
  const genericEvidenceDetail = genericClosureEvidenceDetail(item)
  return explicitStatusPassed === false
    || check.ready === false
    || check.delivered === false
    || check.passed === false
    || check.ok === false
    || Boolean(remainingRisk)
    || Boolean(genericEvidenceDetail)
    || missingFields.length > 0
}

export function qualityContractCheckLine(item: any, fallback: string, snakeKey = '') {
  if (typeof item === 'string') return item
  const check = objectValue(item)
  const label = firstText(check.label, check.key, check.check_key, check.checkKey, fallback)
  const missingFields = qualityContractMissingFields(item, snakeKey)
  const status = firstText(check.status, check.result, check.state).toLowerCase()
  const passedLike = ['pass', 'passed', 'ok', 'done', 'true'].includes(status)
  const missingDetail = missingFields.length > 0 ? `缺少字段 ${missingFields.join(', ')}` : ''
  const genericEvidenceDetail = genericClosureEvidenceDetail(item)
  const detail = firstText(
    genericEvidenceDetail,
    passedLike ? missingDetail : '',
    check.remaining_risk,
    check.remainingRisk,
    check.evidence,
    check.actual,
    check.message,
    check.text,
    check.description,
    check.fix,
    !passedLike ? missingDetail : '',
    check.status,
  )
  return detail && label !== detail ? `${label}：${detail}` : label
}

export function qualityContractResidualsFromQuality(value: any, snakeKey: string, camelKey: string, missingLabel: string): string[] {
  const quality = objectValue(value)
  const review = objectValue(quality.review)
  const result = objectValue(quality.result)
  const payload = parseJsonValue(review.payload) || objectValue(review.payload)
  const selfCheck = objectValue(payload.self_check || payload.selfCheck)
  const selfCheckReview = objectValue(selfCheck.review)
  const candidates = [
    ...arrayValue(review[snakeKey] || review[camelKey]),
    ...arrayValue(quality[snakeKey] || quality[camelKey]),
    ...arrayValue(result[snakeKey] || result[camelKey]),
    ...arrayValue(payload[snakeKey] || payload[camelKey]),
    ...arrayValue(selfCheck[snakeKey] || selfCheck[camelKey]),
    ...arrayValue(selfCheckReview[snakeKey] || selfCheckReview[camelKey]),
    ...preDraftExecutionReceiptSources(value)
      .flatMap(source => arrayValue(source[snakeKey] || source[camelKey])),
  ]
  if (candidates.length === 0) return [`缺少 ${snakeKey} 复检结果`]
  return candidates
    .filter(item => qualityContractCheckFailed(item, snakeKey))
    .map(item => qualityContractCheckLine(item, missingLabel, snakeKey))
    .filter(Boolean)
}

export function deterministicProseCleanupFailed(item: any) {
  const cleanup = objectValue(item)
  const status = firstText(cleanup.status, cleanup.result, cleanup.state).toLowerCase()
  const riskCount = metricNumber(cleanup.risk_count ?? cleanup.riskCount)
  const categoryRisks = arrayValue(cleanup.categories)
    .some(category => {
      const normalized = objectValue(category)
      const count = metricNumber(normalized.count)
      const categoryStatus = firstText(normalized.status, normalized.result, normalized.state).toLowerCase()
      return (count !== null && count > 0)
        || ['fail', 'failed', 'warn', 'warning', 'missing', 'missed', 'blocked', 'error'].includes(categoryStatus)
    })
  return ['fail', 'failed', 'warn', 'warning', 'missing', 'missed', 'blocked', 'error'].includes(status)
    || (riskCount !== null && riskCount > 0)
    || cleanup.ok === false
    || cleanup.passed === false
    || categoryRisks
}

export function deterministicProseCleanupLine(item: any) {
  const cleanup = objectValue(item)
  const label = firstText(cleanup.label, cleanup.key, '确定性清理')
  const riskCount = metricNumber(cleanup.risk_count ?? cleanup.riskCount)
  const categories = arrayValue(cleanup.categories)
    .map(category => {
      const normalized = objectValue(category)
      const categoryLabel = firstText(normalized.label, normalized.key, normalized.name, '风险项')
      const count = metricNumber(normalized.count)
      const evidence = firstText(normalized.evidence, normalized.example, normalized.text, normalized.message)
      return [
        categoryLabel,
        count !== null ? `${count}` : '',
        evidence,
      ].filter(Boolean).join('：')
    })
    .filter(Boolean)
  const detail = categories.length > 0
    ? categories.slice(0, 3).join('；')
    : firstText(cleanup.summary, cleanup.message, cleanup.evidence, cleanup.status, '仍有残留')
  return [
    label,
    riskCount !== null ? `risk_count ${riskCount}` : '',
    detail,
  ].filter(Boolean).join('：')
}

export function deterministicProseCleanupResidualsFromQuality(value: any): string[] {
  const quality = objectValue(value)
  const review = objectValue(quality.review)
  const result = objectValue(quality.result)
  const payload = parseJsonValue(review.payload) || objectValue(review.payload)
  const selfCheck = objectValue(payload.self_check || payload.selfCheck)
  const selfCheckReview = objectValue(selfCheck.review)
  const candidates = [
    review.deterministic_prose_cleanup,
    review.deterministicProseCleanup,
    quality.deterministic_prose_cleanup,
    quality.deterministicProseCleanup,
    result.deterministic_prose_cleanup,
    result.deterministicProseCleanup,
    payload.deterministic_prose_cleanup,
    payload.deterministicProseCleanup,
    selfCheck.deterministic_prose_cleanup,
    selfCheck.deterministicProseCleanup,
    selfCheckReview.deterministic_prose_cleanup,
    selfCheckReview.deterministicProseCleanup,
  ].filter(candidate => candidate !== undefined && candidate !== null && candidate !== '')
  if (candidates.length === 0) return ['缺少 deterministic_prose_cleanup 复检结果']
  return candidates
    .filter(deterministicProseCleanupFailed)
    .map(deterministicProseCleanupLine)
    .filter(Boolean)
}

function sceneCardReceiptCheckKey(value: any) {
  if (typeof value === 'string') return ''
  const check = objectValue(value)
  return firstText(check.key, check.type, check.check_key, check.checkKey, check.issue_type, check.issueType).toLowerCase()
}

function sceneCardReceiptCheckMatches(value: any, issueType: string) {
  const normalizedIssueType = text(issueType).toLowerCase()
  const specificIssueType = /^scene_card_receipt_\d+_/.test(normalizedIssueType)
  if (typeof value === 'string') {
    const normalizedValue = value.toLowerCase()
    if (specificIssueType) return normalizedValue.split(/[^a-z0-9_]+/).includes(normalizedIssueType)
    return normalizedValue.includes(normalizedIssueType || 'scene_card_receipt')
  }
  const checkKey = sceneCardReceiptCheckKey(value)
  if (checkKey === 'scene_card_receipts_sync_ok' || checkKey === 'scene_card_receipts_sync') return true
  if (specificIssueType) return checkKey === normalizedIssueType
  return checkKey.includes(normalizedIssueType || 'scene_card_receipt')
}

function aggregateSceneCardReceiptCountCleared(check: AnyRecord, checkKey: string) {
  if (checkKey !== 'scene_card_receipts_sync_ok' && checkKey !== 'scene_card_receipts_sync') return true
  const countKey = ['missed_count', 'missedCount']
    .find(key => Object.prototype.hasOwnProperty.call(check, key))
  if (!countKey) return false
  const missedCount = check[countKey]
  return typeof missedCount === 'number'
    && Number.isFinite(missedCount)
    && missedCount >= 0
    && missedCount === 0
}

function sceneCardReceiptCheckPassed(value: any) {
  if (typeof value === 'string') {
    const status = firstText(value.split(/[|｜]/, 1)[0]).toLowerCase()
    return ['pass', 'passed', 'ok', 'done', 'true'].includes(status)
  }
  const check = objectValue(value)
  const checkKey = sceneCardReceiptCheckKey(check)
  const status = firstText(check.status, check.result, check.state).toLowerCase()
  const affirmativeBoolean = check.passed === true
    || check.ok === true
    || check.delivered === true
    || check.ready === true
  return !qualityContractCheckFailed(value)
    && aggregateSceneCardReceiptCountCleared(check, checkKey)
    && (['pass', 'passed', 'ok', 'done', 'true'].includes(status) || affirmativeBoolean)
}

export function sceneCardReceiptResidualsFromQuality(value: any, issueType = ''): string[] {
  const quality = objectValue(value)
  const review = objectValue(quality.review)
  const payload = parseJsonValue(review.payload) || objectValue(review.payload)
  const missingKey = text(issueType).toLowerCase() || 'scene_card_receipt'
  const candidates = [
    ...arrayValue(review.issues),
    ...arrayValue(quality.issues),
    ...arrayValue(payload.issues),
    ...arrayValue(review.quality_audit_checks || review.qualityAuditChecks),
    ...arrayValue(quality.quality_audit_checks || quality.qualityAuditChecks),
    ...arrayValue(payload.self_check?.review?.quality_audit_checks),
    ...arrayValue(payload.self_check?.quality_audit_checks),
    ...arrayValue(payload.quality_audit_checks),
  ]
  if (candidates.length === 0) return [`缺少 ${missingKey} 复检结果`]
  const matching = candidates
    .map(item => {
      return { item, line: summarizeEvidenceItem(item) }
    })
    .filter(candidate => sceneCardReceiptCheckMatches(candidate.item, issueType))
  if (matching.length === 0) return [`缺少 ${missingKey} 复检结果`]
  return matching
    .filter(candidate => {
      return !sceneCardReceiptCheckPassed(candidate.item)
    })
    .map(candidate => {
      if (typeof candidate.item === 'string' || qualityContractCheckFailed(candidate.item)) return candidate.line
      return `${candidate.line || missingKey}：明确通过状态缺失`
    })
    .filter(Boolean)
}

export function sceneCardDirectiveCheckText(value: any) {
  if (typeof value === 'string') return text(value)
  const check = objectValue(value)
  return [
    check.key,
    check.label,
    check.type,
    check.status,
    check.result,
    check.evidence,
    check.fix,
    check.message,
    check.summary,
    check.text,
    check.remaining_risk,
    check.remainingRisk,
  ].map(item => text(item)).filter(Boolean).join(' ')
}

export function sceneCardDirectiveCheckMatches(value: any, issueType: string) {
  const valueText = sceneCardDirectiveCheckText(value)
  const normalizedIssueType = issueType.toLowerCase()
  return Boolean(normalizedIssueType && valueText.toLowerCase().includes(normalizedIssueType))
    || /scene[_\s-]*card[_\s-]*\d+[_\s-]*(execution[_\s-]*directives|forbidden[_\s-]*directives)/i.test(valueText)
    || /场景卡(执行|禁令)/.test(valueText)
}

export function sceneCardDirectiveResidualsFromQuality(value: any, issueType: string): string[] {
  const quality = objectValue(value)
  const review = objectValue(quality.review)
  const result = objectValue(quality.result)
  const payload = parseJsonValue(review.payload) || objectValue(review.payload)
  const selfCheck = objectValue(payload.self_check || payload.selfCheck)
  const selfCheckReview = objectValue(selfCheck.review)
  const candidates = [
    ...arrayValue(review.prose_craft_checks || review.proseCraftChecks),
    ...arrayValue(quality.prose_craft_checks || quality.proseCraftChecks),
    ...arrayValue(result.prose_craft_checks || result.proseCraftChecks),
    ...arrayValue(payload.prose_craft_checks || payload.proseCraftChecks),
    ...arrayValue(selfCheck.prose_craft_checks || selfCheck.proseCraftChecks),
    ...arrayValue(selfCheckReview.prose_craft_checks || selfCheckReview.proseCraftChecks),
    ...arrayValue(review.quality_audit_checks || review.qualityAuditChecks),
    ...arrayValue(quality.quality_audit_checks || quality.qualityAuditChecks),
    ...arrayValue(result.quality_audit_checks || result.qualityAuditChecks),
    ...arrayValue(payload.quality_audit_checks || payload.qualityAuditChecks),
    ...arrayValue(selfCheck.quality_audit_checks || selfCheck.qualityAuditChecks),
    ...arrayValue(selfCheckReview.quality_audit_checks || selfCheckReview.qualityAuditChecks),
    ...arrayValue(review.issues),
    ...arrayValue(quality.issues),
    ...arrayValue(result.issues),
    ...arrayValue(payload.issues),
  ].filter(item => sceneCardDirectiveCheckMatches(item, issueType))
  if (candidates.length === 0) return [`缺少 ${issueType || 'scene_card_*_execution_directives'} 复检结果`]
  return candidates
    .filter(qualityContractCheckFailed)
    .map(item => qualityContractCheckLine(item, '场景卡执行禁令'))
    .filter(Boolean)
}

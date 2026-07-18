import type { ProseAdmissionWarning } from '../../novel-writing/prose-admission-policy'
import { markBlockedInvalidError } from '../../novel-writing/prose-admission-policy'
import {
  isRejectedProseContractionFinishReason,
  normalizeProseContractionFinishReason,
  normalizeProseContractionIncompleteReason,
} from '../../novel-writing/word-target'
import { asArray, buildLLMResultDiagnostics } from '../../routes/novel-route-utils'

export type ProseTransportTruncationCode = 'PROSE_DRAFT_TRUNCATED' | 'PROSE_REVISION_TRUNCATED'

export function hasProseTransportIncompleteDetails(result: any) {
  return [result, result?.raw, ...asArray(result?.raw?.choices), result?.raw?.response].some(value => (
    value
    && typeof value === 'object'
    && (
      (Object.prototype.hasOwnProperty.call(value, 'incomplete_details')
        && value.incomplete_details !== null
        && value.incomplete_details !== undefined)
      || (Object.prototype.hasOwnProperty.call(value, 'incompleteDetails')
        && value.incompleteDetails !== null
        && value.incompleteDetails !== undefined)
    )
  ))
}

export function rejectedProseTransportFinishReason(result: any) {
  const sources = [result, result?.raw, ...asArray(result?.raw?.choices), result?.raw?.response]
  for (const source of sources) {
    for (const candidate of [source?.finish_reason, source?.finishReason, source?.stop_reason, source?.stopReason]) {
      const reason = normalizeProseContractionFinishReason({ finish_reason: candidate })
      if (isRejectedProseContractionFinishReason(reason)) return reason
    }
  }
  return null
}

export function assertCompleteProseTransportResult(result: any, code: ProseTransportTruncationCode) {
  const finishReason = rejectedProseTransportFinishReason(result)
    || normalizeProseContractionFinishReason(result)
  const incompleteReason = normalizeProseContractionIncompleteReason(result)
  const incompleteDetailsPresent = hasProseTransportIncompleteDetails(result)
  if (!isRejectedProseContractionFinishReason(finishReason) && !incompleteDetailsPresent) return

  const diagnostics = buildLLMResultDiagnostics(result)
  const phase = code === 'PROSE_DRAFT_TRUNCATED' ? '正文初稿' : '正文修订'
  const error = Object.assign(new Error(`${phase}输出被截断`), {
    code,
    finish_reason: finishReason,
    incomplete_reason: incompleteReason,
    incomplete_details_present: incompleteDetailsPresent,
    llm_diagnostics: {
      ...diagnostics,
      finish_reason: finishReason || diagnostics.finish_reason,
      incomplete_reason: incompleteReason,
      incomplete_details_present: incompleteDetailsPresent,
    },
  })
  throw markBlockedInvalidError(error, {
    code: code.toLowerCase(),
    source: 'transport',
    message: `${phase}输出被截断，不能作为完整章节正文入库。`,
    details: { finish_reason: finishReason, incomplete_reason: incompleteReason },
  })
}

export function proseAdmissionWarning(
  source: ProseAdmissionWarning['source'],
  code: any,
  message: any,
  details?: any,
): ProseAdmissionWarning {
  const warning: ProseAdmissionWarning = {
    source,
    code: String(code || 'warning').trim() || 'warning',
    message: String(message || code || 'warning').slice(0, 500),
  }
  if (details !== undefined) warning.details = details
  return warning
}

export function collectStructuredReviewWarnings(review: any): ProseAdmissionWarning[] {
  const warnings: ProseAdmissionWarning[] = []
  for (const [field, value] of Object.entries(review || {})) {
    if (!Array.isArray(value) || !/(?:checks|findings|failures)$/i.test(field)) continue
    for (const item of value) {
      if (!item || typeof item !== 'object') continue
      const status = String((item as any).status || '').toLowerCase()
      const severity = String((item as any).severity || '').toUpperCase()
      if (!['fail', 'warn'].includes(status) && !['S1', 'S2'].includes(severity)) continue
      warnings.push(proseAdmissionWarning(
        'quality',
        (item as any).key || field,
        (item as any).message || (item as any).evidence || (item as any).label || `${field} reported ${status || severity}`,
        { field, item },
      ))
    }
  }
  return warnings
}

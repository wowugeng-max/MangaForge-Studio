import { asArray } from '../../routes/novel-route-utils'
import { STRUCTURED_REVIEW_CHECK_FIELDS } from './structured-review-fields'

export function hasFailingReviewChecks(review: any) {
  const directChecks = STRUCTURED_REVIEW_CHECK_FIELDS
    .flatMap(([snakeField, camelField]) => asArray(review?.[snakeField] || review?.[camelField]))
  const diagnostics = review?.deslop_gate_diagnostics || review?.deslopGateDiagnostics || {}
  const diagnosticGates = asArray(diagnostics?.gates)
  return [...directChecks, ...diagnosticGates]
    .some((check: any) => String(check?.status || '').toLowerCase() === 'fail')
}

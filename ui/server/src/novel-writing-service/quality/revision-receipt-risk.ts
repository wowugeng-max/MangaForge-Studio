import { isGenericDeliveryRiskEvidence } from './platform-carry-over'
import { compactBriefText } from './text-utils'

export function revisionReceiptRemainingRisk(value: any) {
  const risk = compactBriefText(value?.remaining_risk || value?.remainingRisk || value?.risk)
  if (!risk) return revisionReceiptMissingChangedEvidenceRisk(value) || revisionReceiptGenericEvidenceRisk(value)
  const normalized = risk.toLowerCase()
  if (['无', 'none', 'no', 'n/a', 'null', 'false', '0'].includes(normalized)) return ''
  return risk
}

export function revisionReceiptMissingChangedEvidenceRisk(value: any) {
  const looksLikeRevisionReceipt = Boolean(
    compactBriefText(value?.applied_fix || value?.appliedFix)
    || compactBriefText(value?.original_evidence || value?.originalEvidence)
    || compactBriefText(value?.check_key || value?.checkKey)
    || compactBriefText(value?.key)
    || compactBriefText(value?.label || value?.name)
    || compactBriefText(value?.gate)
    || Number.isFinite(Number(value?.issue_index ?? value?.issueIndex)),
  )
  if (!looksLikeRevisionReceipt) return ''
  const changedEvidence = compactBriefText(value?.changed_evidence || value?.changedEvidence)
  return changedEvidence ? '' : '缺少 changed_evidence，无法定位修订后正文证据。'
}

export function revisionReceiptGenericEvidenceRisk(value: any) {
  const evidenceValues = [
    value?.changed_evidence,
    value?.changedEvidence,
    value?.evidence,
    value?.source_excerpt,
    value?.sourceExcerpt,
    value?.chapter_evidence,
    value?.chapterEvidence,
  ].map((item: any) => compactBriefText(item)).filter(Boolean)
  const genericEvidence = evidenceValues.find(isGenericDeliveryRiskEvidence)
  return genericEvidence ? `changed_evidence 证据泛化，无法定位修订后正文：${genericEvidence}` : ''
}

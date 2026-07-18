import { compactBriefText } from './text-utils'
import { deliveryRiskEvidenceSearchText } from './platform-carry-over'

export function receiptEvidenceLocatedInProse(evidence: any, chapterText: any) {
  const evidenceText = compactBriefText(evidence)
  const prose = deliveryRiskEvidenceSearchText(chapterText)
  if (!evidenceText || !prose) return true
  const normalized = deliveryRiskEvidenceSearchText(evidenceText)
  if (normalized && prose.includes(normalized)) return true
  return evidenceText
    .split(/[，。！？、；：,.!?;:|｜\n\r]+/g)
    .map(item => deliveryRiskEvidenceSearchText(item))
    .filter(item => item.length >= 6)
    .some(item => prose.includes(item))
}

export function receiptEvidenceLocatedInQualityPlanSegment(evidence: any, chapterText: any, segment: string) {
  const prose = String(chapterText || '')
  if (!segment || !compactBriefText(evidence) || !prose) return true
  if (segment === 'opening_actions') {
    return receiptEvidenceLocatedInProse(evidence, prose.slice(0, 300))
  }
  if (segment === 'ending_actions') {
    return receiptEvidenceLocatedInProse(evidence, prose.slice(Math.max(0, prose.length - 300)))
  }
  if (segment === 'middle_actions') {
    const middleText = prose.length > 600 ? prose.slice(300, prose.length - 300) : prose
    return receiptEvidenceLocatedInProse(evidence, middleText)
  }
  return true
}


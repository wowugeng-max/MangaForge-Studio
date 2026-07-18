import { appendProseQualityDeliveryRiskCarryOverRowsCore } from './delivery-risk-carry-over-prose-quality-core'
import { appendProseQualityDeliveryRiskCarryOverRowsMid } from './delivery-risk-carry-over-prose-quality-mid'
import { appendProseQualityDeliveryRiskCarryOverRowsExtended } from './delivery-risk-carry-over-prose-quality-extended'

/** Append prose-quality-derived carry-over risk rows for the previous chapter. */
export function appendProseQualityDeliveryRiskCarryOverRows(
  riskRows: any[],
  proseQualityEntry: { review?: any; payload?: any },
) {
  appendProseQualityDeliveryRiskCarryOverRowsCore(riskRows, proseQualityEntry)
  appendProseQualityDeliveryRiskCarryOverRowsMid(riskRows, proseQualityEntry)
  appendProseQualityDeliveryRiskCarryOverRowsExtended(riskRows, proseQualityEntry)
}

export {
  appendProseQualityDeliveryRiskCarryOverRowsCore,
  appendProseQualityDeliveryRiskCarryOverRowsMid,
}

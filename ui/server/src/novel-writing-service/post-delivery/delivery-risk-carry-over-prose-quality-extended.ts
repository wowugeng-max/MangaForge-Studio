import { appendProseQualityDeliveryRiskCarryOverRowsExtendedAssets } from './delivery-risk-carry-over-prose-quality-extended-assets'
import { appendProseQualityDeliveryRiskCarryOverRowsExtendedCraft } from './delivery-risk-carry-over-prose-quality-extended-craft'

export function appendProseQualityDeliveryRiskCarryOverRowsExtended(
  riskRows: any[],
  proseQualityEntry: any,
) {
  appendProseQualityDeliveryRiskCarryOverRowsExtendedAssets(riskRows, proseQualityEntry)
  appendProseQualityDeliveryRiskCarryOverRowsExtendedCraft(riskRows, proseQualityEntry)
}

export {
  appendProseQualityDeliveryRiskCarryOverRowsExtendedAssets,
  appendProseQualityDeliveryRiskCarryOverRowsExtendedCraft,
}

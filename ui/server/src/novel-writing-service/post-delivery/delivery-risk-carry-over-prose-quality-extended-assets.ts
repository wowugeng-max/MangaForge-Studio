import { appendProseQualityDeliveryRiskCarryOverRowsExtendedAssetsA } from './delivery-risk-carry-over-prose-quality-extended-assets-a'
import { appendProseQualityDeliveryRiskCarryOverRowsExtendedAssetsB } from './delivery-risk-carry-over-prose-quality-extended-assets-b'

export function appendProseQualityDeliveryRiskCarryOverRowsExtendedAssets(
  riskRows: any[],
  proseQualityEntry: any,
) {
  appendProseQualityDeliveryRiskCarryOverRowsExtendedAssetsA(riskRows, proseQualityEntry)
  appendProseQualityDeliveryRiskCarryOverRowsExtendedAssetsB(riskRows, proseQualityEntry)
}

export {
  appendProseQualityDeliveryRiskCarryOverRowsExtendedAssetsA,
  appendProseQualityDeliveryRiskCarryOverRowsExtendedAssetsB,
}

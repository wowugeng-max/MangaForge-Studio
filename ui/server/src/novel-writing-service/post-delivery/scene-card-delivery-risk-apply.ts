import {
  collectDeliveryRiskCarryOverActionContext,
} from './scene-card-delivery-risk-apply-context'
import {
  applyDeliveryRiskCarryOverToSceneCard,
} from './scene-card-delivery-risk-apply-card'

export function applyDeliveryRiskCarryOverToSceneCards(sceneCards: any[], contextPackage: any = {}) {
  if (!sceneCards.length) return sceneCards
  const ctx = collectDeliveryRiskCarryOverActionContext(sceneCards, contextPackage)
  if (!ctx) return sceneCards
  return sceneCards.map((card, index) => applyDeliveryRiskCarryOverToSceneCard(card, index, ctx))
}

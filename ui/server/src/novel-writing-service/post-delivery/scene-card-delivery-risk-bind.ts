import { asArray } from '../../routes/novel-route-utils'
import { styleFingerprintSceneDirective } from '../../novel-writing/style-fingerprint'
import { sceneCardMentionsConcept } from '../../novel-writing/scene-card-readiness'
import { compactBriefText, uniqueBriefStrings } from '../quality/text-utils'
import {
  deliveryRiskItemText,
  deliveryRiskCarryOversFromContext,
} from './delivery-risk-core'

type AnyFn = (...args: any[]) => any

let explicitNewConceptNames: AnyFn = (_contextPackage: any = {}) => []

export function bindSceneCardDeliveryRiskDeps(deps: {
  explicitNewConceptNames?: AnyFn
} = {}) {
  if (deps.explicitNewConceptNames) explicitNewConceptNames = deps.explicitNewConceptNames
}

export function mergeSceneCardStringList(existing: any, additions: any, limit = 18) {
  return uniqueBriefStrings([
    ...asArray(existing).map((item: any) => String(item)).filter(Boolean),
    ...asArray(additions).map((item: any) => String(item)).filter(Boolean),
  ], limit)
}

export function appendSceneCardText(existing: any, additions: any, limit = 260) {
  const parts = uniqueBriefStrings([
    compactBriefText(existing),
    ...asArray(additions).map((item: any) => compactBriefText(item)).filter(Boolean),
  ], 8)
  return compactBriefText(parts.join('；'), limit)
}

export function applyStyleFingerprintToSceneCards(sceneCards: any[], contextPackage: any = {}) {
  const directive = styleFingerprintSceneDirective(contextPackage)
  if (!directive) return sceneCards
  return sceneCards.map(card => ({
    ...card,
    style_directives: mergeSceneCardStringList(card.style_directives, [directive]),
    serial_risk_repairs: mergeSceneCardStringList(card.serial_risk_repairs, ['文风指纹']),
  }))
}

export function applyExplicitNewConceptAnchorsToSceneCards(sceneCards: any[], contextPackage: any = {}) {
  if (!sceneCards.length) return sceneCards
  const names = explicitNewConceptNames(contextPackage)
  if (!names.length) return sceneCards

  return sceneCards.map(card => {
    const matchedNames = names.filter(name => sceneCardMentionsConcept(card, name))
    if (!matchedNames.length) return card
    const conceptAnchorRules = matchedNames.map(name => `“${name}”首次出现必须用角色动作反应、对话半句或物理后果带出当下作用；不得整段讲来历、原理或等级。`)
    return {
      ...card,
      concept_anchor_rules: mergeSceneCardStringList(card.concept_anchor_rules, conceptAnchorRules),
      serial_risk_repairs: mergeSceneCardStringList(card.serial_risk_repairs, ['新概念锚点']),
    }
  })
}


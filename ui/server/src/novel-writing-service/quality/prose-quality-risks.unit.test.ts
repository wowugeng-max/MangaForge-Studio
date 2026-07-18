import { describe, expect, test } from 'bun:test'
import {
  makeDeliveryRiskItem,
  genericSyncRiskStagedActions,
  buildFallbackNextChapterQualityPlan,
  proseQualityGateFailureRisks,
} from './prose-quality-risks'

describe('makeDeliveryRiskItem', () => {
  test('prefixes label', () => {
    expect(makeDeliveryRiskItem('同步风险', { label: '章首缺口' }, 1)).toBe('同步风险：章首缺口')
  })
})

describe('genericSyncRiskStagedActions', () => {
  test('builds staged actions for generic sync risk', () => {
    const actions = genericSyncRiskStagedActions('core_contract_sync', ['核心承诺未兑现'])
    expect(actions.openingActions[0]).toContain('开篇承接')
    expect(actions.middleActions[0]).toContain('中段兑现')
    expect(actions.endingActions[0]).toContain('章尾复核')
  })
})

describe('buildFallbackNextChapterQualityPlan', () => {
  test('returns structured fallback plan object', () => {
    const plan = buildFallbackNextChapterQualityPlan(
      { delivery_risk_receipts: [{ delivered: false, required_action: '开篇承接敲门', remaining_risk: '未闭环' }] },
      { chapter_target: { delivery_risk_carry_over: { items: ['敲门'], required_actions: ['开篇承接敲门'] } } },
      '章首。中段。章末。',
    )
    expect(plan).toBeTruthy()
  })
})

describe('proseQualityGateFailureRisks', () => {
  test('reads quality gate failure payloads', () => {
    const risks = proseQualityGateFailureRisks({
      review: { passed: false, score: 60, needs_revision: true },
    })
    expect(Array.isArray(risks)).toBe(true)
  })
})

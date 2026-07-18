import { describe, expect, test } from 'bun:test'
import {
  normalizeDeliveryRiskCarryOverContext,
  uniqueDeliveryRiskReceipts,
  deliveryRiskItemText,
  inferDeliveryRiskReceiptRepairSegment,
} from './delivery-risk-core'
import { receiptEvidenceLocatedInProse, receiptEvidenceLocatedInQualityPlanSegment } from '../quality/receipt-evidence'

describe('deliveryRiskItemText', () => {
  test('joins label and body', () => {
    expect(deliveryRiskItemText({ label: '风险', issue: '未承接' })).toBe('风险：未承接')
  })
})

describe('normalizeDeliveryRiskCarryOverContext', () => {
  test('bounds and stages required actions', () => {
    const ctx = normalizeDeliveryRiskCarryOverContext({
      items: ['章首承接缺口'],
      required_actions: ['开篇必须接住敲门声', '中段推进证据链', '章末留下新名单悬念'],
      source_chapter_no: 3,
    })
    expect(ctx?.source_chapter_no).toBe(3)
    expect(ctx?.opening_actions?.length).toBeGreaterThan(0)
    expect(ctx?.middle_actions?.length).toBeGreaterThan(0)
    expect(ctx?.ending_actions?.length).toBeGreaterThan(0)
  })
})

describe('uniqueDeliveryRiskReceipts', () => {
  test('dedupes by risk and action', () => {
    const rows = uniqueDeliveryRiskReceipts([
      { risk_item: 'A', required_action: '补开篇' },
      { risk_item: 'A', required_action: '补开篇' },
      { risk_item: 'B', required_action: '补章末' },
    ])
    expect(rows).toHaveLength(2)
  })
})

describe('receiptEvidenceLocatedInQualityPlanSegment', () => {
  test('checks opening window', () => {
    const text = `${'开篇承接敲门声。'.repeat(20)}${'中段推进。'.repeat(40)}${'章末名单。'.repeat(20)}`
    expect(receiptEvidenceLocatedInProse('敲门声', text)).toBe(true)
    expect(inferDeliveryRiskReceiptRepairSegment({ required_action: '开篇补敲门' })).toBe('opening_actions')
    expect(receiptEvidenceLocatedInQualityPlanSegment('敲门声', text, 'opening_actions')).toBe(true)
  })
})

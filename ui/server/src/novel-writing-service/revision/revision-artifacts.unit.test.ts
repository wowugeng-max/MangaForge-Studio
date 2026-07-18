import { describe, expect, test } from 'bun:test'
import {
  mergeProseRevisionArtifacts,
  meaningfulRevisionValue,
} from './revision-artifacts'
import { revisionReceiptRemainingRisk } from '../quality/revision-receipt-risk'

describe('revisionReceiptRemainingRisk', () => {
  test('treats none-like remaining risk as cleared', () => {
    expect(revisionReceiptRemainingRisk({ remaining_risk: '无' })).toBe('')
    expect(revisionReceiptRemainingRisk({ remaining_risk: 'NONE' })).toBe('')
  })

  test('flags missing changed_evidence on revision-like receipts', () => {
    expect(revisionReceiptRemainingRisk({
      applied_fix: '补章首承接',
      key: 'handoff',
    })).toContain('changed_evidence')
  })
})

describe('mergeProseRevisionArtifacts', () => {
  test('merges receipt arrays and prefers latest scalar artifacts', () => {
    const merged = mergeProseRevisionArtifacts(
      {
        revision_receipts: [{ key: 'a' }],
        scene_breakdown: ['old'],
        continuity_notes: 'keep-me-if-next-empty',
      },
      {
        revision_receipts: [{ key: 'b' }],
        scene_breakdown: ['new'],
        oh_story_delivery_receipts: {
          delivery_risk_receipts: [{ risk_item: 'x', remaining_risk: '无' }],
        },
      },
    )

    expect(merged.revision_receipts).toEqual([{ key: 'a' }, { key: 'b' }])
    expect(merged.scene_breakdown).toEqual(['new'])
    expect(merged.continuity_notes).toBe('keep-me-if-next-empty')
    expect(merged.oh_story_delivery_receipts.delivery_risk_receipts).toHaveLength(1)
    expect(meaningfulRevisionValue(merged)).toBe(true)
  })
})

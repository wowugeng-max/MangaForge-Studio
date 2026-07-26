import { describe, expect, test } from 'bun:test'
import {
  evaluateEndingReserveSpendRisk,
  normalizeEndingReserveLedger,
  patchProjectWithEndingReserveLedger,
  spendEndingReserveItem,
  unlockEndingReserveItem,
} from './ending-reserve-ledger'

describe('ending reserve ledger', () => {
  test('normalizes ledger and unlocks by volume', () => {
    const ledger = normalizeEndingReserveLedger({
      trump_cards: [
        { id: 'trump_1', label: '头号宿敌', earliest_volume: 3 },
        { id: 'trump_2', label: '终极真相', earliest_volume: 5 },
      ],
      upgrade_steps: ['一阶', '二阶', '三阶', '四阶'],
    })
    expect(ledger.version).toBe('oh_story_ending_reserve_ledger_v1')
    expect(ledger.upgrade_steps[0].status).toBe('unlocked')

    const early = unlockEndingReserveItem(ledger, { item_id: 'trump_1', volume: 1 })
    expect(early.ok).toBe(false)

    const ok = unlockEndingReserveItem(ledger, { item_id: 'trump_1', volume: 3, chapter_no: 88, note: '卷三中段' })
    expect(ok.ok).toBe(true)
    expect(ok.ledger.unlocked_ids).toContain('trump_1')
    expect(ok.ledger.trump_cards.find((item: any) => item.id === 'trump_1')?.status).toBe('unlocked')
  })

  test('spends reserve and patches project writing bible', () => {
    const base = normalizeEndingReserveLedger({
      trump_cards: [{ id: 'trump_1', label: '金手指上限', earliest_volume: 2 }],
    })
    const unlocked = unlockEndingReserveItem(base, { item_id: 'trump_1', volume: 2 })
    const spent = spendEndingReserveItem(unlocked.ledger, { item_id: 'trump_1', volume: 2, note: '触顶' })
    expect(spent.ok).toBe(true)
    expect(spent.ledger.spent_ids).toContain('trump_1')
    expect(spent.ledger.trump_cards.find((item: any) => item.id === 'trump_1')?.status).toBe('spent')

    const patch = patchProjectWithEndingReserveLedger({ reference_config: { writing_bible: {} } }, spent.ledger)
    expect(patch.reference_config.writing_bible.reader_contract_progression.ending_reserve.version).toBe('oh_story_ending_reserve_ledger_v1')
  })

  test('flags early final-boss semantics as risk', () => {
    const ledger = normalizeEndingReserveLedger({
      trump_cards: [{ id: 'trump_1', label: '头号宿敌黑塔主', earliest_volume: 6 }],
      upgrade_steps: ['一', '二'],
    })
    const risk = evaluateEndingReserveSpendRisk(ledger, {
      volume: 1,
      chapter_summary: '本章直接了结头号宿敌黑塔主，并触达金手指上限。',
    })
    expect(risk.level).toBe('契约破坏')
    expect(risk.reasons.length).toBeGreaterThan(0)
  })
})

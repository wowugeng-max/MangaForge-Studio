import { describe, expect, test } from 'bun:test'
import {
  assessReaderContractRisk,
  buildEndingReservePlan,
  buildReaderContractProgression,
  formatReaderContractProgressionPrompt,
} from './reader-contract-progression'

describe('reader contract progression', () => {
  test('builds ending reserve with capacity check', () => {
    const plan = buildEndingReservePlan({
      target_words: 1_200_000,
      words_per_step: 100_000,
      upgrade_steps: ['一阶', '二阶', '三阶', '四阶', '五阶', '六阶', '七阶', '八阶', '九阶', '十阶', '十一阶', '十二阶'],
    })
    expect(plan.version).toBe('oh_story_ending_reserve_v1')
    expect(plan.trump_cards.length).toBeGreaterThan(0)
    expect(plan.capacity_check.ok).toBe(true)
  })

  test('flags contract-breaking agency loss', () => {
    const risk = assessReaderContractRisk({
      summary: '政府收编后旁观者替主角拿核心收益，无交换让渡',
    })
    expect(risk.level).toBe('契约破坏')
    expect(risk.fixes.length).toBeGreaterThan(0)
  })

  test('formats prompt with core constraints', () => {
    const contract = buildReaderContractProgression({
      genre: '规则怪谈',
      platform: '番茄男频',
      reader_promise: '读者来看主角破规则并活下去',
    })
    const prompt = formatReaderContractProgressionPrompt(contract)
    expect(prompt).toContain('终局储备')
    expect(prompt).toContain('因果权')
    expect(contract.version).toBe('oh_story_reader_contract_progression_v1')
  })
})

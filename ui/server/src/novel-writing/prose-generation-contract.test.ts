import { describe, expect, test } from 'bun:test'
import {
  buildProseGenerationContract,
  mergeProseGenerationRequestOverrides,
  normalizeProseContractKey,
} from './prose-generation-contract'

describe('prose generation contract', () => {
  test('merges snake and camel request constraints into both context levels', () => {
    const merged = mergeProseGenerationRequestOverrides(
      {
        chapter_target: { chapter_no: 10, title: '合围' },
        preflight: { ready: true, strict_ready: true },
      },
      {
        chapter_launch_gate: { status: 'blocked', summary: '承接项缺失' },
        longformCompass: { readerPromise: '超人以行动碾碎怪谈规则' },
        batchPreflight: {
          deliveryRiskCarryOver: { items: ['接住第九章合围'] },
          chapterHandoffContract: { previousHandoff: '追捕队封死四面出口。' },
        },
        million_word_runway: { mode: 'single_chapter' },
      },
    )

    expect(merged.chapter_launch_gate.status).toBe('blocked')
    expect(merged.chapter_target.chapter_launch_gate.status).toBe('blocked')
    expect(merged.longform_compass.readerPromise).toContain('超人')
    expect(merged.chapter_target.delivery_risk_carry_over.items[0]).toContain('第九章')
    expect(merged.chapter_target.previous_handoff).toContain('封死四面出口')
    expect(merged.chapter_target.million_word_runway.mode).toBe('single_chapter')
  })

  test('normalizes aliases and removes only a terminal contract suffix', () => {
    expect(normalizeProseContractKey('quality_audit_contract')).toBe('quality_audit')
    expect(normalizeProseContractKey('characterBehaviorContract')).toBe('character_behavior')
    expect(normalizeProseContractKey('story_power')).toBe('story_power')
  })

  test('clones and freezes the contract without freezing the caller context', () => {
    const context = {
      chapter_target: {
        chapter_no: 10,
        title: '合围',
        scene_cards: [{ scene_no: 1, goal: '破开包围' }],
      },
      preflight: { ready: true, strict_ready: true },
      oh_story_director: { readiness: 'ready', selected_contracts: [] },
    }
    const contract = buildProseGenerationContract(context)

    context.chapter_target.title = '调用方后改标题'

    expect(contract.chapter.title).toBe('合围')
    expect(Object.isFrozen(contract)).toBe(true)
    expect(Object.isFrozen(contract.context.chapter_target)).toBe(true)
    expect(() => {
      ;(contract.context.chapter_target as any).title = '非法修改'
    }).toThrow()
  })
})

import { describe, expect, test } from 'bun:test'
import {
  buildProseGenerationContract,
  evaluateProsePreDraftGate,
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

  test('preserves complete required request constraints until the total prompt budget compiler', () => {
    const handoffTail = 'REQUIRED_REQUEST_HANDOFF_TAIL'
    const arrayTail = 'REQUIRED_REQUEST_ARRAY_ITEM_13'
    const depthTail = 'REQUIRED_REQUEST_DEPTH_TAIL'
    let nested: any = { value: depthTail }
    for (let depth = 0; depth < 6; depth += 1) nested = { next: nested }

    const merged = mergeProseGenerationRequestOverrides(
      { chapter_target: { chapter_no: 10, title: '合围' } },
      {
        longformCompass: {
          mustServe: Array.from({ length: 13 }, (_, index) => index === 12 ? arrayTail : `长线义务${index + 1}`),
          nested,
        },
        batchPreflight: {
          chapterHandoffContract: {
            previousHandoff: `${'承接'.repeat(451)}${handoffTail}`,
          },
        },
      },
    )
    const contract = buildProseGenerationContract(merged)

    expect(merged.chapter_target.previous_handoff).toContain(handoffTail)
    expect(merged.chapter_target.longform_compass.mustServe).toHaveLength(13)
    expect(merged.chapter_target.longform_compass.mustServe[12]).toBe(arrayTail)
    expect(JSON.stringify(contract.context.longform_compass)).toContain(depthTail)
  })

  test('keeps safe-batch chapter duties while dropping nested prose payloads', () => {
    const merged = mergeProseGenerationRequestOverrides(
      { chapter_target: { chapter_no: 10, title: '合围' } },
      {
        nextBatchBrief: {
          batchGoal: '连续三章推进内门势力线',
          chapters: [{
            chapterNo: 10,
            title: '镇门危局',
            chapterTask: '主角主动突破地面火力网',
            conflict: '履带装甲车封死出口',
            endingHook: '枯井下出现无尽回廊',
            mainlineProgress: '由地面追捕转入复眼遗迹主线',
            chapterText: '不应把完整正文带入 required 合同',
            rawPayload: { debug: '不应带入模型上下文' },
          }],
        },
      },
    )

    expect(merged.chapter_target.next_batch_brief.chapters).toEqual([{
      chapterNo: 10,
      title: '镇门危局',
      chapterTask: '主角主动突破地面火力网',
      conflict: '履带装甲车封死出口',
      endingHook: '枯井下出现无尽回廊',
      mainlineProgress: '由地面追捕转入复眼遗迹主线',
    }])
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

  test('does not let allow_incomplete bypass a hard launch gate', () => {
    const contract = buildProseGenerationContract({
      chapter_target: { chapter_no: 10, scene_cards: [{ scene_no: 1 }] },
      preflight: { ready: true, strict_ready: true },
      chapter_launch_gate: { status: 'blocked', summary: '第九章合围没有承接动作' },
      oh_story_director: { readiness: 'ready', required_repairs: [] },
    })

    const decision = evaluateProsePreDraftGate(contract, {
      requireSceneCards: true,
      allowIncomplete: true,
    })

    expect(decision).toMatchObject({
      passed: false,
      code: 'PROSE_LAUNCH_GATE_BLOCKED',
    })
    expect(decision.reasons.join('；')).toContain('合围')
  })

  test('blocks strict preflight independently from general preflight readiness', () => {
    const contract = buildProseGenerationContract({
      chapter_target: { chapter_no: 10, scene_cards: [{ scene_no: 1 }] },
      preflight: {
        ready: true,
        strict_ready: false,
        blockers: [],
        warnings: ['连续性材料不足'],
        checks: [{ key: 'continuity', ok: false, severity: 'medium', fix: '补齐第九章尾段。' }],
      },
      oh_story_director: { readiness: 'needs_repair', required_repairs: [] },
    })

    expect(evaluateProsePreDraftGate(contract, { allowIncomplete: true })).toMatchObject({
      passed: false,
      code: 'PROSE_STRICT_PREFLIGHT_BLOCKED',
    })
  })

  test('allows scene-card generation only after every earlier hard gate passes', () => {
    const contract = buildProseGenerationContract({
      chapter_target: { chapter_no: 10, scene_cards: [] },
      preflight: { ready: true, strict_ready: true },
      oh_story_director: { readiness: 'ready', required_repairs: [] },
    })

    expect(evaluateProsePreDraftGate(contract, { requireSceneCards: false }).passed).toBe(true)
    expect(evaluateProsePreDraftGate(contract, { requireSceneCards: true })).toMatchObject({
      passed: false,
      code: 'PROSE_SCENE_CARDS_BLOCKED',
    })
  })

  test('blocks a non-ready oh-story director after preflight passes', () => {
    const contract = buildProseGenerationContract({
      chapter_target: { chapter_no: 10, scene_cards: [{ scene_no: 1 }] },
      preflight: { ready: true, strict_ready: true },
      oh_story_director: {
        readiness: 'needs_repair',
        required_repairs: [{ key: 'continuity', detail: '补齐第九章尾段。' }],
      },
    })

    expect(evaluateProsePreDraftGate(contract)).toMatchObject({
      passed: false,
      code: 'PROSE_OH_STORY_GATE_BLOCKED',
      reasons: ['补齐第九章尾段。'],
    })
  })
})

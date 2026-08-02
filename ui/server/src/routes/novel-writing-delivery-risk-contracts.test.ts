import { describe, expect, test } from 'bun:test'
import {
  buildFallbackNextChapterQualityPlan,
  normalizeDeliveryRiskCarryOverContext,
  normalizeDeliveryRiskReceipts,
} from './novel-writing-service'
import {
  buildFallbackNextChapterQualityPlan as canonicalBuildFallbackNextChapterQualityPlan,
  normalizeDeliveryRiskCarryOverContext as canonicalNormalizeDeliveryRiskCarryOverContext,
  normalizeDeliveryRiskReceipts as canonicalNormalizeDeliveryRiskReceipts,
} from '../novel-writing-service'

describe('novel writing delivery-risk contracts', () => {
  test('compatibility shim preserves canonical delivery-risk live bindings', () => {
    expect(buildFallbackNextChapterQualityPlan).toBe(canonicalBuildFallbackNextChapterQualityPlan)
    expect(normalizeDeliveryRiskCarryOverContext).toBe(canonicalNormalizeDeliveryRiskCarryOverContext)
    expect(normalizeDeliveryRiskReceipts).toBe(canonicalNormalizeDeliveryRiskReceipts)
  })

  test('normalizes recursive delivery-risk carry-over into bounded actionable tasks', () => {
    const carryOver = normalizeDeliveryRiskCarryOverContext({
      total_count: 200,
      label: '待修复 200',
      items: [
        '复核承接：复核承接：复核承接：创作契约：核心承诺缺口 2',
        '复核承接：复核承接：复核承接：创作契约：核心承诺缺口 2',
        '缺少 delivery_risk_receipts：复核承接：补航线：航线风险 4',
        '模型自检未逐项输出该承接风险的 delivery_risk_receipts，无法证明正文已兑现。',
      ],
      required_actions: [
        '修复：修复：第6章交稿风险必须在本章开篇、场景推进或章末钩子中得到可见承接。',
        '已存回执开篇承接：前300字先执行上一章 delivery_risk_receipts 的 required_action，把未交付风险转成当前场景目标；第6章交稿风险必须在本章开篇、场景推进或章末钩子中得到可见承接。',
        '修复：用账册缺页逼证人改口。',
      ],
      opening_actions: [
        '复核承接开篇修复：前300字按 delivery_risk_receipts 的 risk_item/required_action 补可见承接；用账册缺页逼证人改口。',
      ],
    })

    const joined = [
      ...(carryOver?.items || []),
      ...(carryOver?.required_actions || []),
      ...(carryOver?.opening_actions || []),
      ...(carryOver?.middle_actions || []),
      ...(carryOver?.ending_actions || []),
    ].join('｜')

    expect(carryOver).not.toBeNull()
    expect(carryOver?.total_count).toBeLessThanOrEqual(8)
    expect(carryOver?.items).toContain('创作契约：核心承诺缺口 2')
    expect(joined).toContain('账册缺页')
    expect(joined).toContain('开篇承接：用账册缺页逼证人改口')
    expect(joined).not.toMatch(/复核承接：复核承接/)
    expect(joined).not.toMatch(/缺少\s*delivery_risk_receipts/)
    expect(joined).not.toMatch(/模型自检未逐项输出/)
    expect(joined).not.toMatch(/已存回执/)
    expect(joined).not.toMatch(/第6章交稿风险必须在本章开篇、场景推进或章末钩子中得到可见承接/)
  })

  test('does not multiply missing-receipt diagnostics into hundreds of delivery risk receipts', () => {
    const noisyItems = Array.from({ length: 50 }, (_, index) => (
      index % 2 === 0
        ? `复核承接：复核承接：补关系：关系增量缺口 ${index % 5}`
        : `缺少 delivery_risk_receipts：复核承接：补资产状态：资产状态增量缺口 ${index % 5}`
    ))
    const noisyActions = Array.from({ length: 50 }, (_, index) => (
      index % 3 === 0
        ? `修复：修复：第${index + 1}章交稿风险必须在本章开篇、场景推进或章末钩子中得到可见承接。`
        : `修复：用账册缺页逼证人改口 ${index % 4}。`
    ))
    const receipts = normalizeDeliveryRiskReceipts(
      {},
      {
        chapter_target: {
          delivery_risk_carry_over: {
            total_count: 200,
            items: noisyItems,
            required_actions: noisyActions,
            opening_actions: noisyActions,
            middle_actions: noisyActions,
            ending_actions: noisyActions,
          },
        },
      },
    )
    const joined = receipts.map((item: any) => [
      item.risk_item,
      item.required_action,
      item.evidence,
      item.remaining_risk,
    ].join('｜')).join('｜')

    expect(receipts.length).toBeLessThanOrEqual(8)
    expect(joined).toContain('账册缺页')
    expect(joined).not.toMatch(/复核承接：复核承接/)
    expect(joined).toContain('承接回执缺失')
    expect(joined).not.toMatch(/缺少\s*delivery_risk_receipts/)
    expect(joined).not.toMatch(/模型自检未逐项输出该承接风险/)
    expect(joined).not.toMatch(/交稿风险必须在本章开篇、场景推进或章末钩子中得到可见承接/)
  })

  test('compacts recursive diagnostics from model-supplied delivery risk receipts', () => {
    const receipts = normalizeDeliveryRiskReceipts(
      {
        delivery_risk_receipts: [
          {
            risk_item: '复核承接：复核承接：创作契约：核心承诺缺口 2',
            required_action: '已存回执开篇承接：前300字先执行上一章 delivery_risk_receipts 的 required_action，把未交付风险转成当前场景目标；用账册缺页逼证人改口。',
            delivered: false,
            evidence: '模型自检未逐项输出该承接风险的 delivery_risk_receipts，无法证明正文已兑现。',
            remaining_risk: '缺少 delivery_risk_receipts：复核承接：复核承接：创作契约：核心承诺缺口 2｜第8章交稿风险必须在本章开篇、场景推进或章末钩子中得到可见承接。',
          },
        ],
      },
      {},
      '江哲把账册缺页按在灯下，逼证人改口。',
    )
    const joined = receipts.map((item: any) => [
      item.risk_item,
      item.required_action,
      item.evidence,
      item.remaining_risk,
    ].join('｜')).join('｜')

    expect(receipts).toHaveLength(1)
    expect(joined).toContain('创作契约：核心承诺缺口 2')
    expect(joined).toContain('账册缺页')
    expect(joined).not.toMatch(/缺少\s*delivery_risk_receipts/)
    expect(joined).not.toMatch(/复核承接：复核承接/)
    expect(joined).not.toMatch(/模型自检未逐项输出/)
    expect(joined).not.toMatch(/交稿风险必须在本章开篇、场景推进或章末钩子中得到可见承接/)
  })

  test('builds a complete fallback next-chapter quality plan without passing failed checks', () => {
    const plan = buildFallbackNextChapterQualityPlan(
      {
        score: 80,
        target_reader_checks: [
          {
            key: 'missing_target_reader_checks',
            label: '缺少目标读者自检',
            status: 'fail',
            fix: '按目标读者合同补出读者想看的规则反杀和情绪回报。',
          },
        ],
        conflict_structure_checks: [
          {
            key: 'missing_conflict_structure_checks',
            label: '缺少冲突结构自检',
            status: 'fail',
            fix: '补足阻止者、退出代价和中段行动阻拦。',
          },
        ],
        delivery_risk_receipts: [
          {
            risk_item: '章末追读',
            required_action: '下一章前300字必须接住账册缺页。',
            delivered: false,
            remaining_risk: '账册缺页没有变成下一章行动压力。',
          },
        ],
      },
      {
        chapter_target: {
          title: '旧账缺页',
          ending_hook: '账册缺页背面出现第二枚私印。',
        },
      },
      '沈霜把账册缺页按在灯下。\n\n缺页背面，有第二枚私印。',
    )

    expect(plan).toMatchObject({
      version: 'oh_story_next_chapter_quality_plan_v1',
    })
    expect(plan.quality_focus.join('｜')).toContain('缺少目标读者自检')
    expect(plan.quality_focus.join('｜')).toContain('缺少冲突结构自检')
    expect(plan.opening_actions.join('｜')).toContain('账册缺页')
    expect(plan.middle_actions.join('｜')).toContain('补足阻止者、退出代价和中段行动阻拦')
    expect(plan.ending_actions.join('｜')).toContain('账册缺页背面出现第二枚私印')
    expect(plan.avoid_repetition.join('｜')).toContain('不要用旁白宣布已修复')
    expect(plan.evidence_basis.join('｜')).toContain('账册缺页没有变成下一章行动压力')
    expect(plan.ending_contract).toMatchObject({
      final_state: expect.stringContaining('第二枚私印'),
      unresolved_question: expect.stringContaining('旧账缺页'),
      next_chapter_pull: expect.stringContaining('账册缺页背面出现第二枚私印'),
      handoff_to_next: expect.stringContaining('前300字'),
    })
  })
})

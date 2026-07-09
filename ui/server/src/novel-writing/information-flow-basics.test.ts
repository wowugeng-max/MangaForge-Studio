import { describe, expect, test } from 'bun:test'
import {
  buildInformationFlowInfodumpCheck,
  buildInformationFlowNextObjectiveCheck,
  buildInformationFlowTransitionCompressionCheck,
  informationFlowArray,
  informationFlowPriority,
  normalizeInformationFlowCheck,
} from './information-flow-basics'

describe('information flow basic sync checks', () => {
  test('normalizes nested information flow values into compact unique strings', () => {
    expect(informationFlowArray(['信息团A', ['信息团B']], ' 信息团A ', '', null)).toEqual([
      '信息团A',
      '信息团B',
    ])
  })

  test('confirms information flow anchors when all planned items land in prose', () => {
    const check = normalizeInformationFlowCheck(
      'information_units',
      '信息团',
      ['账册尾号指向库房', '证人改口暴露规则漏洞'],
      '账册尾号指向库房，证人改口暴露规则漏洞。',
      '补信息团',
      34,
    )

    expect(check?.delivered).toBe(true)
    expect(check?.status).toBe('ok')
    expect(check?.evidence).toEqual(expect.arrayContaining(['账册尾号指向库房', '证人改口暴露规则漏洞']))
  })

  test('warns when planned information flow anchors are missing', () => {
    const check = normalizeInformationFlowCheck(
      'reveal_order',
      '揭示顺序',
      ['先发现账册，再验证尾号，最后反转规则漏洞'],
      '这一段只写众人赶路，没有发现、验证、反转或回收。',
      '重排揭示顺序',
      34,
    )

    expect(check?.delivered).toBe(false)
    expect(check?.status).toBe('warn')
    expect(check?.missed_items).toContain('先发现账册，再验证尾号，最后反转规则漏洞')
    expect(check?.repair_instruction).toBe('重排揭示顺序')
  })

  test('detects transition compression risks and useful transition signals', () => {
    const risky = buildInformationFlowTransitionCompressionCheck(
      { transition_compression_rules: ['过渡不是填充'] },
      '他们走过长廊，寒暄了几句，随后他们来到了新的院子。',
    )
    const delivered = buildInformationFlowTransitionCompressionCheck(
      { transition_compression_rules: ['过渡不是填充'] },
      '过渡不是填充，这一句直接带过路程，只留下压力延续、回应悬念和下一步目标。',
    )

    expect(risky?.delivered).toBe(false)
    expect(risky?.missed_items).toEqual(expect.arrayContaining(['纯移动过渡', '寒暄过渡', '概括式换场']))
    expect(delivered?.delivered).toBe(true)
    expect(delivered?.evidence).toEqual(expect.arrayContaining(['过渡压缩信号可见', '过渡承担信息/风险/情绪/目标']))
  })

  test('requires a next objective after gain signals', () => {
    const check = buildInformationFlowNextObjectiveCheck(
      { next_objective_rules: ['提升后立即给下一目标'] },
      '他拿到资格，通过考核，众人欢呼许久，终于可以休息。',
    )
    const delivered = buildInformationFlowNextObjectiveCheck(
      { next_objective_rules: ['提升后立即给下一目标'] },
      '他拿到资格，通过考核；下一步必须三日内赶往禁库，面对更高门槛和新线索。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.missed_items).toContain('提升后停在庆祝/休息')
    expect(delivered?.delivered).toBe(true)
    expect(delivered?.evidence).toEqual(expect.arrayContaining(['阶段性目标达成', '下一目标明示', '目标带期限/代价']))
  })

  test('builds infodump check from injected scanners and summary markers', () => {
    const check = buildInformationFlowInfodumpCheck(
      { no_infodump_guardrails: ['信息必须随冲突释放'] },
      '制度分为三层，事情进入下一阶段。',
      {
        scanInfodumpRisks: () => [{ evidence: '第1段像设定说明', fix: '拆进冲突' }],
        scanDialogueInfodumpRisks: () => [{ evidence: '对白像科普嘴', fix: '改成逼问' }],
      },
    )

    expect(check?.delivered).toBe(false)
    expect(check?.status).toBe('warn')
    expect(check?.evidence).toEqual(expect.arrayContaining([
      '第1段像设定说明',
      '对白像科普嘴',
      '正文用解释背景、制度分层或“事情进入下一阶段”概括信息推进。',
    ]))
  })

  test('prioritizes information flow repairs', () => {
    expect(informationFlowPriority([
      { key: 'no_infodump_guardrails' },
      { key: 'next_objective_after_gain' },
    ])).toBe('优先补提升后下一目标')

    expect(informationFlowPriority([
      { key: 'information_units' },
      { key: 'reveal_order' },
    ])).toBe('优先修揭示顺序')
  })
})

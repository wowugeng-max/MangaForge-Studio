import { describe, expect, test } from 'bun:test'
import { inheritContractProse, refitContractFromSamples, refitGenreContracts } from './fingerprint-contract-refit'
import type { FingerprintContract } from './prose-fingerprint-lib'

function builtinContract(): FingerprintContract {
  return {
    version: 1,
    name: 'builtin_global',
    built_from: ['old-1'],
    target: {
      cv_para: [0.5, 0.7],
      single_sentence_para_ratio: [0.8, 0.97],
      two_sentence_para_ratio: [0.02, 0.15],
      dialogue_para_ratio: [0.1, 0.33],
      max_mid_streak_max: 6,
      template_contrast_per_1k_max: 1,
      stock_adverb_per_1k_max: 1.5,
      clinical_hit_per_1k_max: 0.5,
      subject_ta_opener_ratio_max: 0.312,
    },
    avoid: ['禁对仗宣判句', '禁章末电影定格', '禁临床三联'],
    prefer: ['短触感一句一段', '私心挂动作'],
    prompt_directives: [
      '【朱雀叙事硬门槛 · 合同层 · 高于统计形态】',
      '【Humanize双轮·系统】Pass A结构重写；Pass B人味。',
      '他/姓名起句占比 ≤0.312；优先物件/触感/半截对白起句。',
      '禁止章末电影定格（空气凝固/紧绷钢丝）。',
    ],
    narrative_hard: { bans: ['多体同构复检'], must_deliver: ['当面短对白推责'], zero_family_keys: ['hw_symmetry_pipeline'] } as any,
  }
}

/** 段落形态刻意不同于 builtin，确保拟合出的 target 会变。 */
function sampleText(seed: number) {
  const paras: string[] = []
  for (let i = 0; i < 40; i += 1) {
    if (i % 5 === 0) paras.push(`“先别动。”他把手电递过去，声音压得很低。`)
    else if (i % 3 === 0) paras.push(`窗台上的灰积了一层第${seed}-${i}处。铁皮柜发出闷响。`)
    else paras.push(`他伸手摸了一下门框第${seed}-${i}道。`)
  }
  return paras.join('\n\n')
}

function samples(n: number, genre = '都市') {
  return Array.from({ length: n }, (_, i) => ({ id: `s-${genre}-${i}`, genre, text: sampleText(i) }))
}

describe('fingerprint contract refit', () => {
  test('inheritContractProse keeps builtin prose fields verbatim', () => {
    const builtin = builtinContract()
    const fitted: FingerprintContract = {
      ...builtin,
      name: 'refit',
      avoid: ['只有7条里的一条'],
      prefer: ['少的'],
      prompt_directives: ['【人工网文指纹合同 · refit】', '他/姓名起句占比 ≤0.35；优先物件/触感/半截对白起句。'],
      narrative_hard: undefined,
      target: { ...builtin.target, subject_ta_opener_ratio_max: 0.35 },
    }
    const merged = inheritContractProse(fitted, builtin)
    expect(merged.avoid).toEqual(builtin.avoid)
    expect(merged.prefer).toEqual(builtin.prefer)
    expect(merged.narrative_hard).toEqual(builtin.narrative_hard)
    expect(merged.prompt_directives.length).toBe(builtin.prompt_directives.length)
    expect(merged.prompt_directives).toContain('禁止章末电影定格（空气凝固/紧绷钢丝）。')
    expect(merged.prompt_directives).toContain('他/姓名起句占比 ≤0.35；优先物件/触感/半截对白起句。')
    expect(merged.prompt_directives.some((line) => line.includes('≤0.312'))).toBe(false)
    expect(merged.target.subject_ta_opener_ratio_max).toBe(0.35)
  })

  test('refitContractFromSamples refits target while inheriting prose', () => {
    const builtin = builtinContract()
    const contract = refitContractFromSamples({ samples: samples(6), builtin, name: 'refit_global' })
    expect(contract.name).toBe('refit_global')
    expect(contract.avoid).toEqual(builtin.avoid)
    expect(contract.prompt_directives.length).toBe(builtin.prompt_directives.length)
    expect(contract.built_from.length).toBe(6)
    expect(contract.target.dialogue_para_ratio[0]).toBeLessThanOrEqual(contract.target.dialogue_para_ratio[1])
  })

  test('refitContractFromSamples is deterministic for the same input', () => {
    const builtin = builtinContract()
    const a = refitContractFromSamples({ samples: samples(5), builtin })
    const b = refitContractFromSamples({ samples: samples(5), builtin })
    expect(a.target).toEqual(b.target)
  })

  test('refitGenreContracts needs at least three samples per genre', () => {
    const builtin = builtinContract()
    const genreBuiltins = { urban: { ...builtin, name: 'genre_urban_都市' } }
    const out = refitGenreContracts({
      samples: [...samples(4, '都市'), ...samples(2, '科幻')],
      builtin,
      genreBuiltins,
    })
    expect(Object.keys(out)).toEqual(['urban'])
    expect(out.urban.avoid).toEqual(builtin.avoid)
  })

  test('refitContractFromSamples throws on empty sample list', () => {
    expect(() => refitContractFromSamples({ samples: [], builtin: builtinContract() })).toThrow(/no samples/i)
  })
})

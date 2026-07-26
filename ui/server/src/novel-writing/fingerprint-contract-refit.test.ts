import { describe, expect, test } from 'bun:test'
import { inheritContractProse, refitContractFromSamples, refitGenreContracts } from './fingerprint-contract-refit'
import type { FingerprintContract } from './prose-fingerprint-lib'

/**
 * The real shipped builtin contract (workspace/fingerprint-lib/contracts/active-contract.json),
 * inlined so the test doesn't depend on that file's contents drifting over time. built_from is
 * truncated to one id — its length isn't part of what this test verifies. Every avoid/prefer/
 * prompt_directives/narrative_hard entry below is copied verbatim from the real contract.
 */
function builtinContract(): FingerprintContract {
  return {
    version: 1,
    name: 'qidian_free_rank_human',
    built_from: ['human_qd_1038504669_774650090'],
    target: {
      cv_para: [0.483, 0.699],
      single_sentence_para_ratio: [0.792, 0.977],
      two_sentence_para_ratio: [0.021, 0.168],
      dialogue_para_ratio: [0.099, 0.328],
      max_mid_streak_max: 6,
      template_contrast_per_1k_max: 1,
      stock_adverb_per_1k_max: 1.5,
      clinical_hit_per_1k_max: 0.5,
      subject_ta_opener_ratio_max: 0.35,
    },
    avoid: [
      '甲床青灰临床三联',
      '编号拼音自注',
      '章末电影定格升华',
      '对仗宣判句',
      '临床/尸温/测温教科书腔（会抬朱雀纯AI）',
      '不是A而是B / 极其/微微/缓缓 模板修辞',
      '中句节拍器：连续 ≥6 个中句同带',
      '全章 100% 一句一段匀速且无双句密段',
      '主语姓名流水线过高',
      '多体同构复检/规程辩论/名册对号/电影尾镜（朱雀叙事硬门槛）',
      '未划定区域lore、银行stamp拼接、半科普因果讲义',
      '章末电影定格',
      '完整检查闭环无打断',
      '标准答疑腔对白',
      '论文腔扩展（进行…工作/得以实现）',
      '纯同义词替换墙',
      '为降AI而注水',
    ],
    prefer: [
      '短触感一句一段 + 关键选择双句密段混排',
      '私心噪声不对称（手套黏/消息没回/改口），禁词表轮换',
      '对白短、独立成段',
      '章末可见动作收束，不升华不宣判',
      '当面推责对白 + 物件阻力 + 私心挂动作（朱雀叙事交付）',
      '关键确认后立刻被打断',
      '超短独立节拍段（≤8字）',
      '岗位脾气短对白',
      '段长故意不匀：短句底+少量双句密段',
      '结构重写优先于同义替换',
      'Pass A破平行后 Pass B补在场纹理',
      '字数锁±10%且去聊天包装',
    ],
    // Indices 14/15/16/17/18/19 embed target numbers; every other line is a fixed-text
    // directive that a refit must leave byte-for-byte alone (name header at 13 included).
    prompt_directives: [
      '禁止甲床青灰临床三联与微不可察/死一样的寂静空词；改脏触感+乱对白。',
      '禁止编号拼音自注（而LX正是…习惯用法）；证据只留看不清的字并立刻藏证。',
      '禁止章末电影定格（空气凝固/紧绷钢丝/挺直脊梁/连一步不让开）。',
      '禁止对仗宣判句（活人的温度/死人的体征/所有征象都在指向）。',
      '冲突写成岗位甩锅/空床/谁垫钱，不要程序不合规长辩论收束。',
      '禁止核销确认/编号命运纸；证据最多看不清的字+立刻藏证。',
      '禁止电梯/负一/搁置室长段lore；未知空间最多一个可听见细节后立刻业务摩擦。',
      '禁止多体同温同构：全章最多一次触感异常；第2/3对象只留差异或打断。',
      '【朱雀叙事指纹增强】禁止硬bank盖章句；私心必须挂在当面冲突动作上。',
      '【朱雀叙事硬门槛 · 合同层 · 高于统计形态】',
      '硬禁止：多体同构复检；规程辩论/合规讲义；名册/处方/身份证对号；空电梯/未划定区域lore/铁门电影尾；银行stamp拼接；半科普讲义；临床连击。',
      '硬交付：当面短对白推责；物件阻力触感；私心挂动作（bank≤1）；一句一段底色+少量双句密段；章末未完成动作收束。',
      '统计合同（cv/一句一段）只作辅证；朱雀叙事模式任一命中=合同硬失败。',
      '【人工网文指纹合同 · qidian_free_rank_human】',
      '句长突发 cv 目标 0.483–0.699；中句同带连续 ≤6。',
      '一句一段占比目标 0.792–0.977；双句密段 0.021–0.168。',
      '对白段占比目标 0.099–0.328。',
      '禁临床命中（每千字 ≤0.5）；模板对比每千字 ≤1；套话副词每千字 ≤1.5。',
      '他/姓名起句占比 ≤0.35；优先物件/触感/半截对白起句。',
      '合同由 810 条 human_webnovel 样本拟合。',
      '【R57人工正交付】关键确认后立刻打断；≥2处≤8字超短节拍段；岗位脾气对白；段长不匀；禁对仗/定格/拼音自注/完整检查闭环。',
      '【R57反平滑】允许半截想法与口误改口；禁止完美因果链+对称金句。',
      '【Humanize双轮·系统】Pass A结构重写：破平行/破平滑因果/句长不匀/禁模板开收；Pass B人味：视角私心+身体+半拍+物件阻力；禁止论文腔注水。',
      '【Humanize硬合同】不改事实；字数±10%；结构重写优先于同义替换；只输出正文。',
    ],
    narrative_hard: {
      zero_family_keys: [
        'hw_multi_body_same_death',
        'hw_multi_body_same_temp_chain',
        'hw_symmetry_pipeline',
        'hw_procedure_manual',
        'hw_procedure_debate_conflict',
        'hw_ending_procedure_debate',
        'hw_roster_fate',
        'hw_identity_ticket_reveal',
        'hw_self_name_reveal',
        'hw_identity_halfcode_reveal',
        'hw_ending_cinematic_stack',
        'hw_ending_suspense_template',
        'hw_ending_shadow_stretch',
        'hw_cinematic_transition',
        'hw_abandoned_nobody_cares_spam',
        'hw_abandoned_lore',
        'hw_semi_science_lecture',
        'hw_clinical_cascade_phrase',
        'hw_clinical_lecture_in_dialog',
        'hw_private_noise_bank_overuse',
        'hw_private_noise_bank_cluster',
        'hw_fate_oracle',
        'hw_rule_ledger',
        'hw_ledger_bill_reveal',
        'hw_abandoned_space_lore',
        'hw_private_noise_bank_hard_stamp',
      ],
      bans: [
        '多体同构复检（同样的温热/同样的无脉搏/连续两具/三具带温总结）',
        '规程辩论/合规讲义/签字胁迫收束',
        '名册/核销/处方/身份证对号入座',
        '空电梯/未划定区域lore/铁门电影尾/不疾不徐敲门',
        '银行stamp拼接（先不写系统/纸页毛刺连贴）',
        '半科普因果讲义（按理说/按常理体温应降）',
        '临床连击讲义（瞳孔+心电+铁律并列）',
        '硬bank stamp零命中（先不写系统/纸页毛刺/把门扣上没再解释）',
        '电梯/负一/搁置室lore密度过高',
        '多体同温同构结构复检（并排三具/一模一样触感）',
        '核销确认/编号命运纸揭示',
      ],
      must_deliver: [
        '当面短对白推责（独立成段）',
        '物件阻力触感（立刻接选择）',
        '半截私心挂在动作上（全章bank≤1）',
        '一句一段底色 + 关键处少量双句密段',
        '章末未完成动作收束（禁电影尾镜）',
        '硬bank stamp=0',
        '当面业务摩擦短对白（非程序辩论）',
        '第二/三对象禁止同温同构复检',
        '关键确认后立刻被打断',
        '至少2处超短独立节拍段',
        '岗位脾气短对白',
      ],
    } as any,
  }
}

/** 拟合出的新 target/directives，数值与 builtin 全部不同，用来验证覆盖是否精确命中。 */
function fittedContract(): FingerprintContract {
  const builtin = builtinContract()
  return {
    ...builtin,
    name: 'refit_global',
    built_from: ['s-都市-0', 's-都市-1'],
    avoid: ['只有一条'],
    prefer: ['少的'],
    narrative_hard: undefined,
    target: {
      cv_para: [0.201, 0.303],
      single_sentence_para_ratio: [0.85, 0.99],
      two_sentence_para_ratio: [0.01, 0.09],
      dialogue_para_ratio: [0.05, 0.2],
      max_mid_streak_max: 4,
      template_contrast_per_1k_max: 0.6,
      stock_adverb_per_1k_max: 0.9,
      clinical_hit_per_1k_max: 0.2,
      subject_ta_opener_ratio_max: 0.22,
    },
    prompt_directives: [
      '【人工网文指纹合同 · refit_global】',
      '句长突发 cv 目标 0.201–0.303；中句同带连续 ≤4。',
      '一句一段占比目标 0.85–0.99；双句密段 0.01–0.09。',
      '对白段占比目标 0.05–0.2。',
      '禁临床命中（每千字 ≤0.2）；模板对比每千字 ≤0.6；套话副词每千字 ≤0.9。',
      '他/姓名起句占比 ≤0.22；优先物件/触感/半截对白起句。',
      '合同由 6 条 human_webnovel 样本拟合。',
    ],
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
    const fitted = fittedContract()
    const merged = inheritContractProse(fitted, builtin)
    expect(merged.avoid).toEqual(builtin.avoid)
    expect(merged.prefer).toEqual(builtin.prefer)
    expect(merged.narrative_hard).toEqual(builtin.narrative_hard)
    expect(merged.prompt_directives.length).toBe(builtin.prompt_directives.length)
    expect(merged.target.subject_ta_opener_ratio_max).toBe(0.22)

    // The 6 lines that embed target numbers must all pick up the refitted values —
    // and the fitted directive array is the only place those new numbers come from.
    const numericIndexToFittedIndex: Record<number, number> = { 14: 1, 15: 2, 16: 3, 17: 4, 18: 5, 19: 6 }
    for (const [builtinIndexStr, fittedIndex] of Object.entries(numericIndexToFittedIndex)) {
      const builtinIndex = Number(builtinIndexStr)
      expect(merged.prompt_directives[builtinIndex]).toBe(fitted.prompt_directives[fittedIndex])
      expect(merged.prompt_directives[builtinIndex]).not.toBe(builtin.prompt_directives[builtinIndex])
    }

    // Every other line — including the name header at 13 — stays byte-identical to builtin.
    for (let i = 0; i < builtin.prompt_directives.length; i += 1) {
      if (i in numericIndexToFittedIndex) continue
      expect(merged.prompt_directives[i]).toBe(builtin.prompt_directives[i])
    }
  })

  test('refitContractFromSamples refits target while inheriting prose', () => {
    const builtin = builtinContract()
    const contract = refitContractFromSamples({ samples: samples(6), builtin, name: 'refit_global' })
    expect(contract.name).toBe('refit_global')
    expect(contract.avoid).toEqual(builtin.avoid)
    expect(contract.prompt_directives.length).toBe(builtin.prompt_directives.length)
    expect(contract.built_from.length).toBe(6)
    expect(contract.target.dialogue_para_ratio[0]).toBeLessThanOrEqual(contract.target.dialogue_para_ratio[1])
    // The refitted cv line must reflect the actually-fitted target, not the builtin's.
    expect(contract.prompt_directives[14]).toContain(`${contract.target.cv_para[0]}`)
    expect(contract.prompt_directives[14]).not.toContain('0.483–0.699')
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

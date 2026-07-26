import { describe, expect, test } from 'bun:test'
import {
  attachPovLensesToSceneCards,
  buildPovCharacterStatePatch,
  buildPovRepairInstructions,
  buildCharacterPovUiSnapshot,
  compileChapterPovPlan,
  compileAssetPovBindings,
  formatCharacterPovPrompt,
  formatSceneCardPovPrompt,
  scanCharacterPovRisks,
  sanitizeCharacterPovAntiAiStock,
  measureProseStatisticalFingerprint,
} from './character-pov'
import { buildModelFamilyStrategy } from './model-family-strategy'
import {
  buildWritingPrecisionPlan,
  formatSceneCardPrecisionPrompt,
  formatWritingPrecisionPrompt,
} from './writing-precision-prompt'
import { scanProseForQualityLoop } from '../novel-writing-service/quality/prose-quality-entry'

describe('character pov system', () => {
  const context = {
    characters: [
      { name: '林序', role_type: 'protagonist', motivation: '生存并揭秘' },
      { name: '小刘', role: 'supporting' },
    ],
    chapter_target: {
      chapter_no: 1,
      goal: '确认带温尸体异常并拿到名单线索',
      conflict: '温尸与失踪名单逼近自身',
      ending_hook: '必须赶去槐树路',
      scene_cards: [
        {
          scene_no: 1,
          title: '急诊接诊',
          characters_present: ['林序', '小刘'],
          conflict: '三具温尸',
          density_level: 'medium',
          protagonist_agency_action: '决定亲自查遗物',
        },
        {
          scene_no: 2,
          title: '名单发现',
          characters_present: ['林序'],
          conflict: '名单出现自己缩写',
          density_level: 'dense',
          protagonist_agency_action: '决定支开小刘请假',
        },
      ],
    },
  }

  test('compiles chapter and scene pov lenses from context', () => {
    const plan = compileChapterPovPlan(context)
    expect(plan.primary_pov).toBe('林序')
    expect(plan.pov_mode).toBe('deep_limited')
    expect(plan.scene_lenses).toHaveLength(2)
    expect(plan.scene_lenses[0].pov_character).toBe('林序')
    expect(plan.scene_lenses[1].decision_in_scene).toContain('请假')
    expect(plan.scene_lenses[0].want_now).toBeTruthy()
    expect(plan.scene_lenses[0].fear_or_cost_now).toBeTruthy()
  })

  test('attaches pov_lens onto scene cards', () => {
    const plan = compileChapterPovPlan(context)
    const cards = attachPovLensesToSceneCards(context.chapter_target.scene_cards, plan)
    expect(cards[0].pov_lens.pov_character).toBe('林序')
    expect(cards[1].pov_lens.decision_in_scene).toBeTruthy()
    expect(cards[0].emotion_in_situation).toBeTruthy()
  })

  test('formats pov constraints into writing precision prompts', () => {
    const precision = buildWritingPrecisionPlan({ contextPackage: context })
    expect(precision.pov_plan.primary_pov).toBe('林序')
    expect(precision.scene_cards_with_pov[0].pov_lens.pov_character).toBe('林序')

    const prose = formatWritingPrecisionPrompt(precision).join('\n')
    expect(prose).toContain('角色视角合同')
    expect(prose).toContain('林序')
    expect(prose).toContain('want_now')
    expect(prose).toContain('decision_in_scene')
    expect(prose).toContain('反朱雀AI特征')
    expect(prose).toContain('最高优先·朱雀绿段')
    expect(prose).toContain('绿段质感')

    const scene = formatSceneCardPrecisionPrompt(precision).join('\n')
    expect(scene).toContain('pov_lens')
    expect(scene).toContain('decision_in_scene')
  })

  test('scans clinical pipeline and atmosphere stock as soft pov risks', () => {
    const text = [
      '空气里弥漫着消毒水味。',
      '林序眉头紧锁。',
      '瞳孔散大固定，对光反射消失。',
      '心电图拉直线。',
      '测温枪没有坏。',
      '一种无法形容的压迫感压过来。',
    ].join('\n')
    const findings = scanCharacterPovRisks(text, context)
    expect(findings.some((item) => item.key === 'pov_clinical_pipeline' && item.status === 'warn')).toBe(true)
    expect(findings.some((item) => item.key === 'pov_atmosphere_stock' && item.status === 'warn')).toBe(true)
  })

  test('scans author explain / omniscient / outline ending as pov risks', () => {
    const bad = [
      '林序看着名单。',
      '这意味着，有人刚刚把他写了上去。',
      '科学的逻辑正在被撕扯。',
      '他不知道的是，门外已经有人在等他。',
      '名单上的问号，正在倒计时。',
    ].join('\n')
    const findings = scanCharacterPovRisks(bad, context)
    const keys = findings.map((item) => item.key)
    expect(keys).toContain('pov_author_explain')
    expect(keys).toContain('pov_omniscient_leak')
    expect(keys).toContain('pov_outline_ending')
    expect(buildPovRepairInstructions(findings).length).toBeGreaterThan(0)
  })

  test('quality loop hard-fails author explain cavity under pov scan', () => {
    const text = [
      '林序扯掉手套。',
      '这意味着对方不是普通死者。',
      '他必须在天亮前去一趟槐树路。',
    ].join('\n')
    const scan = scanProseForQualityLoop(text, context, {
      target: 4200,
      min: 3780,
      max: 4620,
      label: '标准章',
    })
    const keys = scan.hard_failures.map((item: any) => item.key)
    expect(keys.some((key: string) => key.includes('pov_') || /这意味着|解释/.test(String(key)))).toBe(true)
  })

  test('builds non-destructive knowledge residue for character state', () => {
    const text = [
      '林序发现名单上有自己的缩写。',
      '他确认体温没有下降。',
      '为什么会出现这个地址？',
      '他手心出汗，决定先请假。',
    ].join('\n')
    const patch = buildPovCharacterStatePatch({
      chapterText: text,
      povCharacter: '林序',
      chapterNo: 1,
      existingState: { knowledge_now: ['已知急诊有三具温尸'] },
    })
    expect(patch.knowledge_now?.length).toBeGreaterThan(1)
    expect(patch.open_questions?.some((item: string) => item.includes('地址'))).toBe(true)
    expect(patch.last_pov_chapter).toBe(1)
    expect(patch.emotional_state).toBeTruthy()
  })

  test('compiles knowledge ledger and family intensity', () => {
    const gemini = buildModelFamilyStrategy({ model_name: 'gemini-3.5-flash', provider_id: 'gemini' })
    const plan = compileChapterPovPlan({
      ...context,
      characters: [
        {
          name: '林序',
          role_type: 'protagonist',
          current_state: {
            knowledge_now: ['三具温尸'],
            misbeliefs: ['以为是猝死'],
            open_questions: ['名单是谁写的'],
          },
        },
      ],
    }, { modelFamilyStrategy: gemini })
    expect(plan.pov_intensity).toBe('strict')
    expect(plan.multi_pov_policy.default_locked).toBe(true)
    expect(plan.knowledge_ledger.some((item) => item.character === '林序' && item.known.includes('三具温尸'))).toBe(true)
    expect(plan.family_pov_directives.join('\n')).toContain('Gemini')
    const prompt = formatCharacterPovPrompt(plan).join('\n')
    expect(prompt).toContain('角色认知账本')
    expect(prompt).toContain('多视角门禁')
  })

  test('blocks unauthorized pov switch under strict intensity', () => {
    const findings = scanCharacterPovRisks(
      '小刘心想：这事太邪门了。\n林序继续查遗物。',
      {
        ...context,
        model_family_strategy: buildModelFamilyStrategy({ model_name: 'gemini-3.5-flash' }),
      },
    )
    expect(findings.some((item) => item.key === 'pov_unauthorized_switch')).toBe(true)
  })

  test('ui snapshot exposes primary pov scenes and violations', () => {
    const snap = buildCharacterPovUiSnapshot({
      contextPackage: context,
      chapterText: '这意味着名单被改过。',
      modelFamilyStrategy: buildModelFamilyStrategy({ model_name: 'gpt-4.1' }),
    })
    expect(snap.primaryPov).toBe('林序')
    expect(snap.scenes.length).toBeGreaterThan(0)
    expect(snap.violations.some((item) => item.key === 'pov_author_explain')).toBe(true)
  })

  test('state patch writes knowledge ledger with misbeliefs', () => {
    const patch = buildPovCharacterStatePatch({
      chapterText: '林序发现名单。他以为只是巧合。为什么会有地址？',
      povCharacter: '林序',
      chapterNo: 2,
    })
    expect(patch.knowledge_ledger.known.length).toBeGreaterThan(0)
    expect(patch.knowledge_ledger.misbeliefs.length).toBeGreaterThan(0)
    expect(patch.knowledge_ledger.open_questions.length).toBeGreaterThan(0)
  })

  test('scene card prompt helpers expose pov requirements', () => {
    const plan = compileChapterPovPlan(context)
    expect(formatCharacterPovPrompt(plan).join('\n')).toContain('深有限')
    expect(formatSceneCardPovPrompt(plan).join('\n')).toContain('pov_lens')
  })

  test('P2 authorized secondary short cuts only when explicit', () => {
    const locked = compileChapterPovPlan({
      ...context,
      chapter_target: {
        ...context.chapter_target,
        scene_cards: [
          {
            scene_no: 1,
            title: '急诊',
            characters_present: ['林序', '小刘'],
            conflict: '温尸',
            density_level: 'medium',
            protagonist_agency_action: '查遗物',
            // no secondary authorization
          },
        ],
      },
    })
    expect(locked.allowed_secondary_povs).not.toContain('小刘')
    expect(locked.secondary_cut_policy.short_cut_only).toBe(true)

    const withCut = compileChapterPovPlan({
      ...context,
      chapter_target: {
        ...context.chapter_target,
        scene_cards: [
          {
            scene_no: 1,
            title: '急诊',
            characters_present: ['林序', '小刘'],
            conflict: '温尸',
            density_level: 'medium',
            protagonist_agency_action: '查遗物',
            secondary_cut: {
              character: '小刘',
              max_lines: 2,
              purpose: '旁观恐惧',
              return_to_primary: '立刻回到林序',
            },
          },
        ],
      },
    })
    expect(withCut.allowed_secondary_povs).toContain('小刘')
    expect(withCut.secondary_cut_policy.allowed[0].character).toBe('小刘')
    expect(withCut.scene_lenses[0].secondary_cut?.max_lines).toBe(2)
    const prompt = formatCharacterPovPrompt(withCut).join('\n')
    expect(prompt).toContain('短切授权')
    expect(prompt).toContain('对白视角过滤')
  })

  test('P2 dialogue mind-read and asset firewall scans', () => {
    const ctx = {
      ...context,
      setting_context: {
        chapter_usage: [
          { name: '名单祭品规则', usage_role: 'forbidden' },
          { name: '体温异常', usage_role: 'required' },
        ],
        entities: [
          { name: '名单祭品规则', entity_type: 'rule', state_json: { revealed: false } },
        ],
      },
      chapter_target: {
        ...context.chapter_target,
        scene_cards: [
          {
            scene_no: 1,
            title: '急诊',
            characters_present: ['林序', '小刘'],
            forbidden_settings: ['名单祭品规则'],
            used_settings: ['体温异常'],
            conflict: '温尸',
            protagonist_agency_action: '查遗物',
            secondary_cut: { character: '小刘', max_lines: 1, purpose: '信息差' },
          },
        ],
      },
    }
    const bindings = compileAssetPovBindings(ctx, '林序')
    expect(bindings.forbidden_assets).toContain('名单祭品规则')
    expect(bindings.knowable_assets).toContain('体温异常')

    const findings = scanCharacterPovRisks(
      [
        '“先别动。”小刘说完，其实他心里已经明白名单祭品规则就是真相。',
        '小刘心想：完了。',
        '小刘暗想：再待下去必死。',
        '小刘心里清楚不能报警。',
        '名单祭品规则就是用来筛选祭品的。',
      ].join('\n'),
      ctx,
    )
    expect(findings.some((item) => item.key === 'pov_dialogue_mind_read')).toBe(true)
    expect(findings.some((item) => item.key === 'pov_asset_firewall_leak')).toBe(true)
    expect(findings.some((item) => item.key === 'pov_secondary_cut_overstay')).toBe(true)
  })

  test('P2 scene card prompt requires secondary_cut schema', () => {
    const plan = compileChapterPovPlan(context)
    const prompt = formatSceneCardPovPrompt(plan).join('\n')
    expect(prompt).toContain('secondary_cut')
    expect(prompt).toContain('secondary_authorized')
  })

  test('sanitizes anti-ai stock phrases deterministically', () => {
    const raw = [
      '这说明对方不是普通死者。',
      '他深吸一口气，强迫自己冷静下来。',
      '一片死寂。',
      '等待着命运的下一次宣判。',
    ].join('\n')
    const cleaned = sanitizeCharacterPovAntiAiStock(raw)
    expect(cleaned).not.toContain('这说明')
    expect(cleaned).not.toContain('命运的下一次宣判')
    expect(cleaned).not.toContain('深吸一口气')
    expect(cleaned).not.toContain('一片死寂')
    const findings = scanCharacterPovRisks(cleaned, context)
    expect(findings.filter((item) => item.status === 'fail').length).toBe(0)
  })

  test('warns on forced slang pack and metaphor stack', () => {
    const text = [
      '这该死的夜班还没结束。',
      '他觉得自己正往一个看不见底的冰窟窿里掉。',
      '周围全是刀子一样的视线。',
    ].join('\n')
    const findings = scanCharacterPovRisks(text, context)
    expect(findings.some((item) => item.key === 'pov_forced_slang_pack')).toBe(true)
    expect(findings.some((item) => item.key === 'pov_metaphor_stack')).toBe(true)
  })

  test('warns on statistical metronome and sparse private noise', () => {
    const mid = '他看了一眼记录本上的空栏，又把目光挪开。'
    // need >=24 paras and mid-streak >=6
    const metronome = Array.from({ length: 28 }, () => mid).join('\n')
    const findingsA = scanCharacterPovRisks(metronome, context)
    expect(findingsA.some((item) => item.key === 'pov_sentence_metronome')).toBe(true)

    // need >=1200 chars with no private-noise cues
    const sparse = Array.from({ length: 80 }, (_, i) => `他继续核对第${i + 1}项遗物编号，轮子在走廊里慢慢往前推。`).join('\n')
    const stats = measureProseStatisticalFingerprint(sparse)
    expect(stats.char_count).toBeGreaterThanOrEqual(1200)
    expect(stats.private_noise_count).toBe(0)
    const findingsB = scanCharacterPovRisks(sparse, context)
    expect(findingsB.some((item) => item.key === 'pov_private_noise_sparse')).toBe(true)
  })

  test('format prompt carries statistical fingerprint iron laws', () => {
    const plan = compileChapterPovPlan(context)
    const prompt = formatCharacterPovPrompt(plan).join('\n')
    expect(prompt).toContain('反朱雀统计指纹')
    expect(prompt).toContain('400–600')
    expect(prompt).toContain('双句密段')
    expect(prompt).toContain('不对称')
  })

  test('warns when whole chapter is pure one-sentence paragraphs', () => {
    const text = Array.from({ length: 50 }, (_, i) => `他核对第${i + 1}项记录。`).join('\n')
    const findings = scanCharacterPovRisks(text, context)
    expect(findings.some((item) => item.key === 'pov_all_single_sentence_monotony')).toBe(true)
  })

})

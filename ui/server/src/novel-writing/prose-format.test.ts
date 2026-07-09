import { describe, expect, test } from 'bun:test'
import { scanBannedWordLeaks } from './deslop-scans'
import {
  maskYamlFrontMatterForProseScans,
  normalizeDeterministicProseFormat,
  normalizeDeterministicProseDeslopTerms,
  normalizeDeterministicProseLanguageFragments,
  normalizeDeterministicProsePunctuation,
  resolveProseLanguageRiskReview,
  scanPeriodMonotonyRisks,
  scanProseLanguageRisks,
  scanProseFormatRisks,
  scanPunctuationToneRisks,
  stripProseEngineeringAppendix,
} from './prose-format'
import { buildDeterministicProseCleanupReport } from './deterministic-prose-cleanup'

describe('prose format and punctuation utilities', () => {
  test('detects hard punctuation and period-only monotony', () => {
    const punctuation = scanPunctuationToneRisks([
      '第14章 第三个证人',
      '证人低着头，说：“我……我不知道——真的不知道!!!”',
      '李辰盯着他：“你确定？？？”',
    ].join('\n'))
    const monotony = scanPeriodMonotonyRisks([
      '第14章 第三个证人',
      '李辰站在门口。',
      '门外没有声音。',
      '水迹停在脚边。',
      '张智看着墙上的表。',
      '秒针停在十二点。',
      '宿舍里的人都没有动。',
      '广播里的电流声慢慢变轻。',
      '管理员的影子贴在玻璃上。',
    ].join('\n'))

    expect(punctuation.map((item: any) => item.key)).toEqual(expect.arrayContaining([
      'punctuation_hard_pause_line_2',
      'punctuation_random_pile_line_2',
      'punctuation_random_pile_line_3',
    ]))
    expect(monotony).toHaveLength(1)
    expect(monotony[0].key).toBe('punctuation_period_monotony')
  })

  test('detects markdown, indentation, blank lines, and mixed chapter markers', () => {
    const formatChecks = scanProseFormatRisks([
      '第三章 风起',
      '他停在门口。',
      '',
      '',
      '　　门外的影子动了一下。',
      '**这不是正文应该保留的加粗标记。**',
    ].join('\n'))
    const markerChecks = scanProseFormatRisks([
      '###1.',
      '门外传来第一声敲门。',
      '###第二章',
      '广播改了规则。',
      '3.',
      '名单上多出一个名字。',
    ].join('\n'))

    expect(formatChecks.map((item: any) => item.key)).toEqual(expect.arrayContaining([
      'format_blank_line_4',
      'format_indentation_line_5',
      'format_markdown_line_6',
    ]))
    expect(markerChecks).toHaveLength(1)
    expect(markerChecks[0].key).toBe('format_chapter_marker_mixed')
  })

  test('normalizes deterministic prose format while preserving yaml front matter', () => {
    const result = normalizeDeterministicProseFormat([
      '---',
      'title: **旧案**',
      'stage: draft',
      '---',
      '第三章 风起',
      '',
      '　　门外的影子动了一下。',
      '**他把门推开。**',
      '> 走廊里没有脚步声。',
    ].join('\n'))

    expect(result.text).toBe([
      '---',
      'title: **旧案**',
      'stage: draft',
      '---',
      '第三章 风起',
      '',
      '门外的影子动了一下。',
      '他把门推开。',
      '走廊里没有脚步声。',
    ].join('\n'))
    expect(result.rules).toEqual(expect.arrayContaining([
      'indentation_removed',
      'markdown_bold_removed',
      'markdown_quote_marker_removed',
    ]))
  })

  test('normalizes hard punctuation while preserving yaml and fenced blocks', () => {
    const result = normalizeDeterministicProsePunctuation([
      '---',
      'title: 旧案……未结',
      'range: 7 - 9',
      '---',
      '第三章 风起',
      '```note',
      '引用：他停了……这里不是正文。',
      '```',
      '他停了……门外的影子动了——又像没动。',
      '她看了看3-5号门--都锁着。',
      '---',
    ].join('\n'))

    expect(result.text).toContain('title: 旧案……未结')
    expect(result.text).toContain('range: 7 - 9')
    expect(result.text).toContain('引用：他停了……这里不是正文。')
    expect(result.text).toContain('他停了，门外的影子动了，又像没动。')
    expect(result.text).toContain('她看了看3到5号门，都锁着。')
    expect(result.rules).toEqual(expect.arrayContaining([
      'ellipsis_to_comma',
      'dash_to_comma',
      'numeric_range_to_chinese',
      'standalone_rule_line_removed',
    ]))
  })

  test('masks yaml front matter before prose scans', () => {
    expect(maskYamlFrontMatterForProseScans([
      '---',
      'title: 旧案……未结',
      'range: 7 - 9',
      '---',
      '第三章 风起',
      '他停了……门外的影子动了。',
    ].join('\n'))).toBe([
      '',
      '',
      '',
      '',
      '第三章 风起',
      '他停了……门外的影子动了。',
    ].join('\n'))
  })

  test('allows one blank line between web-novel paragraphs', () => {
    const text = [
      '第三章 风起',
      '',
      '门外的影子动了一下。',
      '',
      '他把门推开。',
      '',
      '走廊里没有脚步声。',
    ].join('\n')

    expect(scanProseFormatRisks(text)).toHaveLength(0)
    expect(normalizeDeterministicProseFormat(text)).toMatchObject({
      text,
      changed: false,
      change_count: 0,
    })
  })

  test('blocks non-Chinese prose language drift before quality gate storage', () => {
    const risks = scanProseLanguageRisks([
      'O silêncio que se seguiu ao estilhaçar do pergaminho foi absoluto.',
      '',
      'Jiang Zhe não desviou o olhar.',
      '',
      '"Onde está Lu Changfeng?" A pergunta foi curta.',
    ].join('\n'))

    expect(risks).toHaveLength(1)
    expect(risks[0]).toMatchObject({
      key: 'language_drift_non_chinese',
      status: 'fail',
      severity: 'blocking',
    })
    expect(risks[0].fix).toContain('简体中文')
  })

  test('blocks lowercase English glue words embedded in Chinese prose', () => {
    const risks = scanProseLanguageRisks('老陈看着江哲，只用纯肉身力量 and 太极暗劲就一拳轰碎了邪神意志投影。')

    expect(risks).toHaveLength(1)
    expect(risks[0]).toMatchObject({
      key: 'language_drift_latin_fragment',
      status: 'fail',
      severity: 'blocking',
    })
    expect(risks[0].evidence).toContain('and')
  })

  test('normalizes lowercase English glue words between Chinese prose fragments', () => {
    const result = normalizeDeterministicProseLanguageFragments('老陈看着江哲，只用纯肉身力量 and 太极暗劲，but 没有退。')

    expect(result).toMatchObject({
      changed: true,
      change_count: 2,
    })
    expect(result.text).toContain('纯肉身力量和太极暗劲')
    expect(result.text).toContain('但没有退')
    expect(scanProseLanguageRisks(result.text)).toHaveLength(0)
  })

  test('normalizes English pronoun fragments glued to Chinese prose', () => {
    const result = normalizeDeterministicProseLanguageFragments('江哲收回右手。 his五指在掌心合拢，遮住黑痕。')

    expect(result).toMatchObject({
      changed: true,
      change_count: 1,
    })
    expect(result.text).toContain('他的五指在掌心合拢')
    expect(scanProseLanguageRisks(result.text)).toHaveLength(0)
  })

  test('normalizes English of fragments before Chinese prose', () => {
    const result = normalizeDeterministicProseLanguageFragments('灰色卫衣 of 衣角在翻卷的迷雾中猎猎作响。')

    expect(result).toMatchObject({
      changed: true,
      change_count: 1,
    })
    expect(result.text).toContain('灰色卫衣的衣角')
    expect(scanProseLanguageRisks(result.text)).toHaveLength(0)
  })

  test('normalizes AI scene template phrases without deleting concrete sensory detail', () => {
    const result = normalizeDeterministicProseLanguageFragments('车门弹开。空气中弥漫着刺鼻的硝烟与高维辐射交织的怪异气味。江哲按住口袋里的核心。')

    expect(result).toMatchObject({
      changed: true,
    })
    expect(result.text).not.toContain('空气中弥漫')
    expect(result.text).toContain('刺鼻的硝烟')
    expect(result.text).toContain('江哲按住口袋里的核心')
    expect(scanBannedWordLeaks(result.text).map((item: any) => item.pattern)).not.toContain('AI风场景套话')
  })

  test('normalizes simple oh-story banned terms after model repair', () => {
    const result = normalizeDeterministicProseDeslopTerms([
      '江哲的指尖微微一僵。',
      '',
      '铜盘缓缓收回，冰冷的判定结果压在桌面上。',
      '',
      '名单缺口隐约露出一角。',
    ].join('\n'))

    expect(result).toMatchObject({
      changed: true,
    })
    expect(result.rules).toEqual(expect.arrayContaining([
      'weak_adverb_removed',
      'abstract_cold_result_grounded',
      'vague_visibility_grounded',
    ]))
    expect(result.text).not.toContain('微微')
    expect(result.text).not.toContain('缓缓')
    expect(result.text).not.toContain('冰冷')
    expect(result.text).not.toContain('隐约')
    expect(scanBannedWordLeaks(result.text).map((item: any) => item.pattern)).not.toEqual(expect.arrayContaining([
      '微微',
      '缓缓',
      '冰冷',
      '隐约',
    ]))
  })

  test('normalizes real repair residue from oh-story deslop gate evidence', () => {
    const result = normalizeDeterministicProseDeslopTerms([
      '金属的冰冷温润顺着指尖传入神经。',
      '',
      '老陈明白，这道令牌本身的规则，已经把整片药铺都变成了死局。',
      '',
      '这并非偶然的装饰，而是与他口袋里那封暗金信件上的字迹完全一致。',
      '',
      '不仅如此，在死线与手掌接触的刹那，江哲反向捕捉到了天平内部的一道规则脉络。',
      '',
      '这意味着，只要他维持凡人伪装，对方就无法强行出手。',
    ].join('\n'))

    expect(result).toMatchObject({
      changed: true,
    })
    expect(result.rules).toEqual(expect.arrayContaining([
      'cold_banned_term_removed',
      'mental_telling_prefix_removed',
      'contrast_explanation_simplified',
      'explanation_connector_removed',
    ]))
    expect(result.text).not.toContain('冰冷')
    expect(result.text).not.toContain('明白')
    expect(result.text).not.toContain('并非')
    expect(result.text).not.toContain('不仅如此')
    expect(result.text).not.toContain('这意味着')
    expect(scanBannedWordLeaks(result.text).map((item: any) => item.pattern)).not.toEqual(expect.arrayContaining([
      '冰冷',
      '他/她意识到……',
      '并非A，而是B',
    ]))
  })

  test('normalizes late deterministic cleanup residue from real prose repair output', () => {
    const result = normalizeDeterministicProseDeslopTerms([
      '那漆黑的令牌正面，在石缝里微微一震，露出了里面一截极细的旧字。',
      '',
      '无声炸开，顺着他的指尖和掌心，钻入了他的血肉之中。',
    ].join('\n'))

    expect(result).toMatchObject({
      changed: true,
    })
    expect(result.rules).toEqual(expect.arrayContaining([
      'weak_adverb_removed',
      'mechanical_action_chain_grounded',
    ]))
    expect(result.text).not.toContain('微微')
    expect(result.text).not.toContain('无声炸开，顺着')
  })

  test('normalizes gate residue from final quality recheck evidence', () => {
    const result = normalizeDeterministicProseDeslopTerms([
      '这个意外的收获让江哲心中大定。原来门后的诱捕，不仅是陷阱，更是诡序之主降临仪轨的核心节点。',
      '',
      '黑衣人无声地跟在后面，皮衣摩擦声在浓雾里连成一片阴冷的潮汐。他们的复眼在浓雾中闪烁着光芒，死死盯着江哲的后脑勺。',
      '',
      '老陈瘫软在断裂的木柱旁，指尖在碎裂的木屑里抠出几道血痕，喉咙里发出低哑的嗬嗬声。',
    ].join('\n'))

    expect(result).toMatchObject({
      changed: true,
    })
    expect(result.rules).toEqual(expect.arrayContaining([
      'mental_telling_sentence_removed',
      'contrast_explanation_simplified',
      'weak_adverb_removed',
      'stock_visual_phrase_grounded',
      'stock_throat_sound_grounded',
    ]))
    expect(result.text).not.toContain('心中大定')
    expect(result.text).not.toContain('不仅是')
    expect(result.text).not.toContain('无声地')
    expect(result.text).not.toContain('阴冷的潮汐')
    expect(result.text).not.toContain('闪烁着光芒')
    expect(result.text).not.toContain('嗬嗬声')
  })

  test('normalizes late deslop residue from real deterministic cleanup recheck evidence', () => {
    const result = normalizeDeterministicProseDeslopTerms([
      '那不是普通骨节的活动，而是肌肉与骨骼在旧规则里重新对齐。',
      '',
      '那不是普通的能量，而是某种由纯粹法则凝成的死寂，不带一丝杂质。',
      '',
      '银线顺着他的掌心皮肤瞬间钻入血肉，宛如一条咆哮的银龙。',
      '',
      '惨绿雾气疯狂汇聚，疯狂地朝右盘蔓延，又在称量结束后缓缓褪去。',
      '',
      '黑衣人不带半点温度地看着他，不远不近地跟随在门外。',
    ].join('\n'))

    expect(result).toMatchObject({
      changed: true,
    })
    expect(result.rules).toEqual(expect.arrayContaining([
      'contrast_explanation_simplified',
      'absolute_purity_grounded',
      'mechanical_action_chain_grounded',
      'stock_metaphor_grounded',
      'frenzy_adverb_grounded',
      'weak_adverb_removed',
      'abstract_cold_result_grounded',
    ]))
    expect(result.text).not.toContain('那不是普通')
    expect(result.text).not.toContain('不带一丝杂质')
    expect(result.text).not.toContain('瞬间钻入')
    expect(result.text).not.toContain('宛如一条咆哮的银龙')
    expect(result.text).not.toContain('疯狂汇聚')
    expect(result.text).not.toContain('疯狂地朝')
    expect(result.text).not.toContain('缓缓褪去')
    expect(result.text).not.toContain('不带半点温度')
    expect(result.text).not.toContain('不远不近地跟随')
  })

  test('normalizes final deterministic cleanup residue from real gemini run', () => {
    const result = normalizeDeterministicProseDeslopTerms([
      '天平在这一瞬间剧烈地摇晃起来。左盘上那些死寂的绿荧和因果律死线疯狂蠕动，化作铺天盖地的尖细绿芒，像毒针般狠狠地扎向江哲的右掌。',
      '',
      '那不是偶然的装饰，而是同一种古老铭刻的断笔。',
      '',
      '黑袍男人一言不发，带着数十名黑衣追索者跟了上来。他们没有阻拦，也没有散去，而是隔着三十步的距离，在粘稠的惨绿色浓雾中跟随。',
      '',
      '砸在江哲脚边半碎的青砖上，嗤地一声蚀出深坑，冒出刺鼻的白烟。',
      '',
      '江哲的超人视力清晰地看到，天平的左盘上，已经开始有一根根由死寂绿荧凝聚而成的因果律死线在浮现。',
      '',
      '那些死线在空气中发出滋滋的腐蚀声，凡是触碰到的物质，无论是石板还是空气，都会被蚀出一道黑痕。',
      '',
      '但江哲面无表情地迈出一步，右掌稳稳地贴在了青铜右盘上，掌心与金属表面接触。',
      '',
      '无数绿色的数据流急速闪烁，甚至因为数据过载而发出了极其微弱的滋滋声，镜片表面甚至出现了一道细微的裂纹。',
      '',
      '那些足以在瞬间将普通灵能者消融成黑水的死线，在接触到江哲皮肤的一瞬间，却像找不到入口的毒虫。',
      '',
      '甚至连他手背上被死线擦出的黑痕，也只是在表层停留了不到半秒，便被彻底压进皮下。',
      '',
      '黑袍男人右眼上的单片眼镜片，在这一瞬间停滞。镜片上无数绿色的数据流全部清空。',
    ].join('\n'))

    expect(result).toMatchObject({
      changed: true,
    })
    expect(result.rules).toEqual(expect.arrayContaining([
      'instant_adverb_grounded',
      'frenzy_adverb_grounded',
      'stock_metaphor_grounded',
      'contrast_explanation_simplified',
      'with_phrase_grounded',
      'mechanical_parallel_sentence_split',
      'perception_filter_sentence_grounded',
      'universal_clause_grounded',
    ]))
    expect(result.text).not.toContain('这一瞬间')
    expect(result.text).not.toContain('剧烈地')
    expect(result.text).not.toContain('疯狂蠕动')
    expect(result.text).not.toContain('像毒针般')
    expect(result.text).not.toContain('那不是偶然')
    expect(result.text).not.toContain('，带着')
    expect(result.text).not.toContain('青砖上，嗤地一声蚀出深坑，冒出')
    expect(result.text).not.toContain('清晰地看到，天平的左盘上，已经开始有')
    expect(result.text).not.toContain('凡是触碰到的物质，无论是')
    expect(result.text).not.toContain('面无表情地迈出一步，右掌稳稳地贴在了青铜右盘上，掌心')
    expect(result.text).not.toContain('数据流急速闪烁，甚至因为数据过载')
    expect(result.text).not.toContain('在瞬间将普通灵能者')
    expect(result.text).not.toContain('像找不到入口的毒虫')
    expect(result.text).not.toContain('甚至连他手背上')
  })

  test('normalizes final gemini cleanup residue without leaving mode 7 rhythm risk', () => {
    const result = normalizeDeterministicProseDeslopTerms(
      '甚至连他手背上被死线擦出的黑痕，也只是在表层停留了不到半秒，便被彻底压进皮下，转化为一缕温热的灵能流。'
    )
    const cleanup = buildDeterministicProseCleanupReport({ id: 10, chapter_no: 10 }, result.text)

    expect(result).toMatchObject({
      changed: true,
    })
    expect(result.rules).toContain('explanation_connector_removed')
    expect(cleanup.risk_count).toBe(0)
  })

  test('normalizes final gemini mouth-reaction residue without leaving mode 7 rhythm risk', () => {
    const result = normalizeDeterministicProseDeslopTerms(
      '又看向那尊没有倾斜的天平，兜帽阴影下的干瘪嘴唇剧烈蠕动着，却一个字都没能说出来。'
    )
    const cleanup = buildDeterministicProseCleanupReport({ id: 10, chapter_no: 10 }, result.text)

    expect(result).toMatchObject({
      changed: true,
    })
    expect(result.rules).toContain('mechanical_parallel_sentence_split')
    expect(cleanup.risk_count).toBe(0)
  })

  test('normalizes final gemini hand-cover residue without leaving mode 7 rhythm risk', () => {
    const result = normalizeDeterministicProseDeslopTerms(
      '江哲收回右手，五指在掌心攥紧，遮住了那几道正在褪去的黑痕。'
    )
    const cleanup = buildDeterministicProseCleanupReport({ id: 10, chapter_no: 10 }, result.text)

    expect(result).toMatchObject({
      changed: true,
    })
    expect(result.rules).toContain('mechanical_parallel_sentence_split')
    expect(cleanup.risk_count).toBe(0)
  })

  test('normalizes final gemini intent-explanation residue without leaving mode 7 rhythm risk', () => {
    const result = normalizeDeterministicProseDeslopTerms(
      '这老头显然看出了黑袍男人的意图，对方在拿他当筹码，逼江哲在众目睽睽之下暴露出不属于凡人的力量。'
    )
    const cleanup = buildDeterministicProseCleanupReport({ id: 10, chapter_no: 10 }, result.text)

    expect(result).toMatchObject({
      changed: true,
    })
    expect(result.rules).toContain('mechanical_parallel_sentence_split')
    expect(cleanup.risk_count).toBe(0)
  })

  test('normalizes final gemini injury-reaction residue without leaving mode 7 rhythm risk', () => {
    const result = normalizeDeterministicProseDeslopTerms(
      '老陈胸前的墨斑再次剧烈地收缩，勒得他喉咙里发出微弱的声响，再也说不出一个字。'
    )
    const cleanup = buildDeterministicProseCleanupReport({ id: 10, chapter_no: 10 }, result.text)

    expect(result).toMatchObject({
      changed: true,
    })
    expect(result.rules).toContain('mechanical_parallel_sentence_split')
    expect(cleanup.risk_count).toBe(0)
  })

  test('normalizes final gemini decisive-motion residue without leaving mode 7 rhythm risk', () => {
    const result = normalizeDeterministicProseDeslopTerms(
      '他转过身，一步踏碎了地上的石板，毅然迈步走向了那条通往黑色大门的石板路。'
    )
    const cleanup = buildDeterministicProseCleanupReport({ id: 10, chapter_no: 10 }, result.text)

    expect(result).toMatchObject({
      changed: true,
    })
    expect(result.rules).toContain('mechanical_parallel_sentence_split')
    expect(cleanup.risk_count).toBe(0)
  })

  test('normalizes final gemini looming-eye residue without leaving mode 7 rhythm risk', () => {
    const result = normalizeDeterministicProseDeslopTerms(
      '几道比白衣祭司更强横、带着恐怖威压的猩红复眼，此刻正一只只睁开，贪婪而阴冷地俯瞰着下方街区。'
    )
    const cleanup = buildDeterministicProseCleanupReport({ id: 10, chapter_no: 10 }, result.text)

    expect(result).toMatchObject({
      changed: true,
    })
    expect(result.rules).toContain('mechanical_parallel_sentence_split')
    expect(cleanup.risk_count).toBe(0)
  })

  test('removes resolved language fragment failures from review checks after normalization', () => {
    const result = normalizeDeterministicProseLanguageFragments('江哲同时压住金骨 and 太极暗劲。')
    const review = resolveProseLanguageRiskReview({
      quality_audit_checks: [
        { key: 'language_drift_latin_fragment', status: 'fail' },
        { key: 'scene_card_execution', status: 'pass' },
      ],
    }, result.text)

    expect(review.quality_audit_checks).toEqual([{ key: 'scene_card_execution', status: 'pass' }])
  })

  test('strips oh-story engineering receipt appendix from chapter prose', () => {
    const result = stripProseEngineeringAppendix([
      '江哲站在废墟中央。',
      '',
      '迷雾里传来履带碾碎石子的声音。',
      '',
      '---',
      '',
      '### 📋 oh_story_delivery_receipts（项目闭环交付回执）',
      '',
      '#### 1. chapter_blueprint（章节蓝图兑现回执）',
      '- **target_emotion**: 承接上一章压力。',
    ].join('\n'))

    expect(result).toMatchObject({
      changed: true,
      removed_line_count: 6,
    })
    expect(result.text).toBe([
      '江哲站在废墟中央。',
      '',
      '迷雾里传来履带碾碎石子的声音。',
    ].join('\n'))
  })
})

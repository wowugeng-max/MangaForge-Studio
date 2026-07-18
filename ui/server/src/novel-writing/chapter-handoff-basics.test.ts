import { describe, expect, test } from 'bun:test'
import {
  buildChapterHandoffDeterministicCheck,
  chapterHandoffItems,
  chapterHandoffNegativeScope,
  chapterHandoffPriority,
  normalizeChapterHandoffDeliveryCheck,
  extractStrongHandoffAnchors,
  enrichContextWithStrongHandoff,
  compactHandoffObligation,
  openingPlanSkipsStrongHandoff,
  alignChapterOpeningToPreviousHandoff,
  resolveOutgoingChapterHandoff,
  readChapterOutgoingHandoff,
} from './chapter-handoff-basics'

describe('chapter handoff basic sync checks', () => {
  test('normalizes handoff items from strings and structured rows', () => {
    expect(chapterHandoffItems([
      '  上一章账册变红  ',
      { text: '主角必须追问证人' },
      { label: '主角必须追问证人' },
      { summary: '旧印开始发烫' },
    ])).toEqual([
      '上一章账册变红',
      '主角必须追问证人',
      '旧印开始发烫',
    ])
  })

  test('detects negative chapter handoff scope signals', () => {
    expect(chapterHandoffNegativeScope('新剧情直接开始，上一章的危机被忘在一边。')).toBe(true)
    expect(chapterHandoffNegativeScope('开篇先处理上一章账册变红，再让证人改口。')).toBe(false)
  })

  test('confirms opening-only handoff delivery inside the opening window', () => {
    const check = normalizeChapterHandoffDeliveryCheck(
      'previous_handoff',
      '上一章最后一幕',
      ['上一章账册变红', '证人当场改口'],
      '上一章账册变红，证人当场改口。主角立刻追问旧印来源。',
      { openingOnly: true, threshold: 32 },
    )

    expect(check?.status).toBe('ok')
    expect(check?.match_scope).toBe('opening')
    expect(check?.score).toBe(100)
    expect(check?.missed_items).toEqual([])
  })

  test('warns when opening-only evidence lands too late', () => {
    const check = normalizeChapterHandoffDeliveryCheck(
      'opening_obligations',
      '开篇义务',
      ['上一章账册变红'],
      `${'过场'.repeat(460)}上一章账册变红`,
      { openingOnly: true, threshold: 32 },
    )

    expect(check?.status).toBe('warn')
    expect(check?.match_scope).toBe('opening')
    expect(check?.missed_items).toEqual(['上一章账册变红'])
    expect(check?.repair_instruction).toContain('开篇前300字必须补开篇义务')
  })

  test('blocks delivery when the prose explicitly drops the previous chapter handoff', () => {
    const check = normalizeChapterHandoffDeliveryCheck(
      'previous_handoff',
      '上一章最后一幕',
      ['上一章账册变红'],
      '上一章账册变红，但主角没有处理上一章，直接重开新场景。',
      { openingOnly: true, threshold: 32 },
    )

    expect(check?.status).toBe('warn')
    expect(check?.score).toBe(22)
    expect(check?.evidence).toContain('正文出现未承接上一章的负向信号')
    expect(check?.delivered).toBe(false)
  })

  test('builds deterministic handoff warnings from forbidden continuity breaks', () => {
    const check = buildChapterHandoffDeterministicCheck('新剧情直接开始，上一章危机暂时不重要。')

    expect(check?.key).toBe('chapter_handoff_forbidden')
    expect(check?.status).toBe('warn')
    expect(check?.missed_items).toContain('期待债断线')
    expect(check?.missed_items).toContain('无桥接重开')
    expect(check?.repair_instruction).toContain('开篇先承接上一章最后一幕')
  })

  test('prioritizes handoff repair categories', () => {
    expect(chapterHandoffPriority([
      { key: 'previous_handoff' },
      { key: 'chapter_handoff_forbidden' },
    ])).toBe('优先清章首硬伤')
    expect(chapterHandoffPriority([{ key: 'opening_obligations' }])).toBe('优先补开篇义务')
    expect(chapterHandoffPriority([{ key: 'must_deliver' }])).toBe('优先补必兑现项')
    expect(chapterHandoffPriority([{ key: 'keep_alive' }])).toBe('')
  })
})

describe('strong handoff anchors', () => {
  test('extracts actionable anchors from ending hook', () => {
    const anchors = extractStrongHandoffAnchors({
      endingHook: '护士在地上痛苦地爬行，身体开始融化，江哲一脚踩在她的头上，冷冷地问：“医生办公室的钥匙在哪？”',
    })
    expect(anchors.join('、')).toMatch(/钥匙/)
    expect(anchors.some(item => /护士|融化|江哲|办公室/.test(item))).toBe(true)
  })

  test('enrichContextWithStrongHandoff fills anchors, obligations and first-scene transition', () => {
    const enriched = enrichContextWithStrongHandoff({
      chapter_target: {
        chapter_no: 5,
        previous_handoff: '第4章《深夜的查房风波》 章末钩子：护士融化，江哲踩头追问医生办公室的钥匙在哪？；最后一幕：护士在地上爬行，身体融化。',
        scene_cards: [{ scene_no: 1, title: '目标入场', purpose: '看医生守则' }],
      },
      continuity: {
        previous_chapter: {
          chapter_no: 4,
          ending_hook: '护士在地上痛苦地爬行，身体开始融化，江哲一脚踩在她的头上，冷冷地问：“医生办公室的钥匙在哪？”',
          ending_excerpt: '江哲将力量控制得妙到毫巅……“医生办公室的钥匙在哪？”',
        },
      },
    })
    expect(enriched.chapter_target.requiredHandoffAnchors.length).toBeGreaterThan(0)
    expect(enriched.chapter_target.opening_obligations.join('；')).toContain('开篇前300字')
    expect(enriched.chapter_target.scene_cards[0].transition_from_previous).toContain('钥匙')
  })

  test('compactHandoffObligation prefers 章末钩子 over long excerpt', () => {
    const compact = compactHandoffObligation('第4章 章末钩子：护士融化，江哲追问钥匙；最后一幕：' + '很长的正文'.repeat(40))
    expect(compact).toContain('钥匙')
    expect(compact.length).toBeLessThan(120)
  })

  test('extracts confrontation anchors from ending excerpt, not only short hook', () => {
    const anchors = extractStrongHandoffAnchors({
      endingHook: '江哲走出病房，迎面撞上了巡逻的保安诡异，保安手里拿着电击棍，狞笑着向江哲走来。',
      endingExcerpt: '巡逻保安手中的电击棍拥有绝对的判定。宵禁时间被击中的患者会被规则抹去。保安诡异狞笑着，手中的电击棍高高举起，狠狠砸下！江哲站在原地。',
    })
    expect(anchors).toEqual(expect.arrayContaining(['保安', '电击棍']))
    expect(anchors.some(item => /江哲|宵禁|走廊|病房/.test(item))).toBe(true)
  })

  test('detects multi-beat goals that skip previous unresolved action', () => {
    const goal = '保安试图用电击棍制服江哲，江哲单手握住电击棍，一路来到重症监护室，准备开始物理治疗。'
    expect(openingPlanSkipsStrongHandoff(goal, ['保安', '电击棍'], '保安举起电击棍砸下')).toBe(true)
    expect(openingPlanSkipsStrongHandoff('开篇先接住保安电击棍砸下，再进入重症监护室。', ['保安', '电击棍'], '保安举起电击棍砸下')).toBe(false)
  })

  test('alignChapterOpeningToPreviousHandoff forces handoff-first scene and goal', () => {
    const aligned = alignChapterOpeningToPreviousHandoff({
      previousHandoff: '第5章 章末钩子：江哲走出病房，迎面撞上了巡逻的保安诡异，保安手里拿着电击棍，狞笑着向江哲走来。',
      anchors: ['保安', '电击棍', '江哲'],
      target: {
        goal: '保安诡异试图用电击棍制服江哲，江哲吸入高压电后一路来到重症监护室，准备开始物理治疗。',
        chapter_blueprint: { opening_hook: '江哲来到重症监护室，准备对怪物开始物理治疗' },
        scene_cards: [{ scene_no: 1, title: '物理治疗开场', purpose: '进入重症监护室对肿瘤怪物开始物理治疗' }],
      },
    })
    expect(aligned.scene_cards[0].transition_from_previous).toContain('电击棍')
    expect(aligned.scene_cards[0].purpose).toContain('开篇先接住')
    expect(aligned.goal).toContain('开篇先接住')
    expect(aligned.chapter_blueprint.opening_hook).toContain('开篇先接住')
    expect(aligned.handoff_opening_alignment.multi_beat_goal_realigned).toBe(true)
  })

  test('enrichContextWithStrongHandoff realigns multi-beat ch6-like seed from ch5 confrontation', () => {
    const enriched = enrichContextWithStrongHandoff({
      chapter_target: {
        chapter_no: 6,
        previous_handoff: '第5章《医患身份的颠倒逻辑》 章末钩子：江哲走出病房，迎面撞上了巡逻的保安诡异，保安手里拿着电击棍，狞笑着向江哲走来。',
        goal: '保安诡异试图用高压电击棍制服江哲，江哲直接单手握住电击棍，将高压电全部吸入体内。江哲顺手将保安扔进垃圾桶，一路来到重症监护室。里面躺着一个浑身长满肿瘤的怪物。江哲走上前，准备开始他的物理治疗。',
        scene_cards: [{ scene_no: 1, title: '物理治疗', purpose: '进入重症监护室对怪物开始物理治疗' }],
        chapter_blueprint: { opening_hook: '江哲来到重症监护室开始物理治疗' },
      },
      continuity: {
        previous_chapter: {
          chapter_no: 5,
          ending_hook: '江哲走出病房，迎面撞上了巡逻的保安诡异，保安手里拿着电击棍，狞笑着向江哲走来。',
          ending_excerpt: '宵禁时间……巡逻保安手中的电击棍拥有绝对的判定。电击棍上的蓝色电弧骤然暴涨。保安诡异狞笑着，手中的电击棍高高举起，狠狠砸下！而江哲，只是静静地站在原地。',
        },
      },
    })
    expect(enriched.chapter_target.requiredHandoffAnchors).toEqual(expect.arrayContaining(['保安', '电击棍']))
    expect(enriched.chapter_target.requiredHandoffAnchors.length).toBeGreaterThanOrEqual(3)
    expect(enriched.chapter_target.scene_cards[0].transition_from_previous).toMatch(/保安|电击棍/)
    expect(enriched.chapter_target.scene_cards[0].purpose).toContain('开篇先接住')
    expect(enriched.chapter_target.goal).toContain('开篇先接住')
    expect(enriched.chapter_target.opening_obligations.join('；')).toMatch(/未完成动作|不得跳过/)
  })
})


describe('outgoing chapter handoff contract', () => {
  test('resolveOutgoingChapterHandoff prefers real prose tail when ending_hook diverges', () => {
    const outgoing = resolveOutgoingChapterHandoff({
      endingHook: '在江哲的物理威胁下，院长颤抖着签下了“医院改制声明”，整个副本空间开始剧烈颤抖，一道金光从院长体内剥离出来。',
      chapterText: '江哲伸出修长的手指，缓缓朝着那枚散发着浩瀚金光的权柄碎片摸了过去。然而，就在江哲的手指即将触碰到那枚碎片的瞬间，异变突生！那枚原本温顺的金色碎片内，突然毫无征兆地睁开了一只冰冷、死寂、不带任何人类情感的巨大眼睛！那只眼睛死死地盯着江哲，一股不属于这个副本的古老意志，隔着无尽的虚空，轰然降临！',
    })
    expect(outgoing?.hook_tail_divergence).toBe(true)
    expect(outgoing?.source).toBe('chapter_text_tail')
    expect(outgoing?.unresolved_action).toMatch(/眼睛|古老意志|碎片|降临/)
    expect(outgoing?.unresolved_action).not.toContain('医院改制声明')
    expect(outgoing?.anchors.some(item => /碎片|眼睛|意志|江哲|金光/.test(item))).toBe(true)
  })

  test('compactHandoffObligation prefers informative 最后一幕 over stale 章末钩子', () => {
    const compact = compactHandoffObligation('第8章 章末钩子：院长签下医院改制声明，金光剥离；最后一幕：江哲手指将触权柄碎片，碎片内睁开冰冷巨眼，古老意志轰然降临！')
    expect(compact).toMatch(/巨眼|古老意志|碎片/)
    expect(compact).not.toContain('医院改制声明')
  })

  test('result-skip goals are forced handoff-first for ch8->ch9 style aftermath plans', () => {
    const previous = '最后一幕：江哲手指将触权柄碎片，碎片内睁开冰冷巨眼，古老意志轰然降临！'
    const goal = '江哲成功夺取第一枚“世界权柄碎片·秩序”，青山精神病院副本宣告完美通关。大夏国北方笼罩的迷雾瞬间退散，举国狂欢。'
    expect(openingPlanSkipsStrongHandoff(goal, ['权柄碎片', '巨眼', '江哲'], previous)).toBe(true)
    const aligned = alignChapterOpeningToPreviousHandoff({
      previousHandoff: previous,
      anchors: ['权柄碎片', '巨眼', '江哲'],
      target: {
        goal,
        scene_cards: [{ scene_no: 1, title: '目标入场', purpose: goal }],
        chapter_blueprint: { opening_hook: '副本通关后举国狂欢' },
      },
    })
    expect(aligned.goal).toContain('开篇先接住')
    expect(aligned.scene_cards[0].purpose).toContain('开篇先接住')
    expect(aligned.handoff_opening_alignment.result_skip_realigned).toBe(true)
  })

  test('enrichContextWithStrongHandoff consumes previous outgoing_handoff as single source of truth', () => {
    const outgoing = resolveOutgoingChapterHandoff({
      endingHook: '院长签下医院改制声明，金光剥离。',
      chapterText: '江哲手指即将触碰到权柄碎片。金色碎片内突然睁开一只冰冷巨眼，古老意志隔空轰然降临！',
    })
    const enriched = enrichContextWithStrongHandoff({
      chapter_target: {
        goal: '江哲成功夺取第一枚世界权柄碎片，完美通关，迷雾退散，举国狂欢。',
        scene_cards: [{ scene_no: 1, purpose: '通关后举国狂欢' }],
      },
      continuity: {
        previous_chapter: {
          chapter_no: 8,
          ending_hook: '院长签下医院改制声明，金光剥离。',
          outgoing_handoff: outgoing,
        },
      },
    })
    expect(enriched.chapter_target.previous_handoff).toMatch(/巨眼|古老意志|碎片/)
    expect(enriched.chapter_target.goal).toContain('开篇先接住')
    expect(enriched.chapter_target.requiredHandoffAnchors.length).toBeGreaterThan(0)
  })

  test('readChapterOutgoingHandoff falls back to live resolve from chapter_text', () => {
    const outgoing = readChapterOutgoingHandoff({
      ending_hook: '院长签下医院改制声明。',
      chapter_text: '江哲摸向权柄碎片，碎片内睁开巨眼，古老意志降临。',
    })
    expect(outgoing?.hook_tail_divergence).toBe(true)
    expect(outgoing?.unresolved_action).toMatch(/巨眼|古老意志|碎片/)
  })
})


import { describe, expect, test } from 'bun:test'
import { buildDeepDraftFoundationScore } from './deepDraftFoundationScore'
import { createEmptyLaunchpadFields } from './launchpadModel'
import { buildDeepDraftReviewModel } from './deepDraftReviewModel'

describe('buildDeepDraftFoundationScore', () => {
  test('scores a thin deep-draft seed as weak and blocks recommend create', () => {
    const score = buildDeepDraftFoundationScore({
      seed: {
        title: '夜市诡闻',
        genre: '都市异能',
        synopsis: '主角在夜市摆摊时卷入规则怪谈。',
      },
      launchpad: createEmptyLaunchpadFields(),
      review: buildDeepDraftReviewModel({ title: '夜市诡闻', synopsis: '主角在夜市摆摊时卷入规则怪谈。' }),
      lengthTarget: 'long',
    })

    expect(score.overall).toBeLessThan(55)
    expect(score.recommendCreate).toBe(false)
    expect(score.allowCreateWithWarning).toBe(false)
    expect(score.dimensions.length).toBe(7)
    expect(score.nextActions.length).toBeGreaterThan(0)
  })

  test('scores a strong oh-story aligned seed as openable', () => {
    const seed = {
      title: '规则超市：我只卖活路',
      genre: '都市异能',
      logline: '社畜主角带着会计价规则漏洞的超市系统，在怪谈副本里卖出活路并反杀规则主。',
      synopsis: '主角在现实与怪谈世界之间摆摊，用规则漏洞交易求生，同时被更大的规则主盯上。',
      main_conflict: '规则主要用主角的系统重写人间秩序，主角要保住活人交易线并反杀规则主。',
      target_audience: '喜欢规则流、系统流与都市怪谈的男频读者',
      protagonist: { name: '江哲', goal: '通关五大核心诡异区并重塑规则牢笼', identity: '社畜' },
      worldbuilding: {
        world_summary: '现实蓝星与怪谈世界双层结构，失败会反噬现实。',
        power_system: '规则识别与漏洞交易，能力越强代价越大。',
        rules: ['进入副本必须找到通关线', '泄露规则会被反噬'],
      },
      characters: [
        { name: '江哲', role_type: '主角', goal: '通关并保护现实' },
        { name: '老陈', role_type: '同盟', goal: '活着出去' },
        { name: '规则主', role_type: '反派', goal: '吞噬蓝星' },
      ],
      character_pool: {
        protagonist: [{ name: '江哲' }],
        primary_supporting: [{ name: '老陈' }, { name: '沈清' }, { name: '阿宁' }],
        antagonist_primary: [{ name: '规则主' }],
      },
      chapter_outlines: Array.from({ length: 12 }, (_, index) => ({
        chapter_no: index + 1,
        title: `第${index + 1}章`,
        chapter_goal: `推进目标 ${index + 1}`,
      })),
      volume_outlines: [{ title: '第一卷', goal: '建立规则交易线' }],
      foreshadowing_plan: [
        { title: '名牌来源', plant_chapter: 2, payoff_chapter: 18 },
        { title: '第二枚核心', plant_chapter: 8, payoff_chapter: 30 },
      ],
      commercial_positioning: {
        reader_promise: '每章都能看见规则破局与人情代价',
        selling_points: ['规则流', '都市怪谈', '系统有代价'],
      },
      writing_bible: {
        target_reader_contract: { reader_profile: '规则流读者' },
        story_power_contract: { dimensions: ['欲望', '阻碍', '选择', '代价', '变化'] },
        character_design_contract: { tags: ['冷静', '咸鱼', '护短'] },
        longform_structure_contract: { volumes: 3 },
        reader_retention_contract: { opening_hook_rule: '前300字出事' },
        opening_strategy_contract: { hook_type: '事件噱头' },
        core_contract_radar: { must_serve: ['规则破局'] },
        genre_positioning_contract: { genre_tags: ['都市异能'] },
        plot_special_topics_contract: { topics: ['金手指代价'] },
      },
      plot_engine: {
        long_term_conflict: '规则主与主角的秩序争夺',
        growth_engine: '规则识别等级与交易网络',
        mainline_goal: '收集五枚秩序核心并重塑牢笼',
      },
    }

    const launchpad = {
      ...createEmptyLaunchpadFields(),
      reader_promise: '每章都能看见规则破局与人情代价',
      core_selling_point: '用超市系统把怪谈规则做成可交易活路',
      opening_hook: '开局第一笔交易失败就会死人',
      mainline_goal: '收集五枚秩序核心并重塑牢笼',
      long_term_conflict: '规则主与主角的秩序争夺',
      growth_engine: '规则识别等级与交易网络',
      volume_direction: '第一卷立住交易线，第二卷扩地图，第三卷反杀',
      expandable_assets: '规则主、秩序核心、夜市摊位、名牌',
      first30_plan: {
        chapters_1_3: '立钩子、立规则、立代价',
        chapters_4_10: '试读闭环与第一次公开破局',
        chapters_11_30: '抬高赌注并引入更大敌意',
      },
    }

    const score = buildDeepDraftFoundationScore({
      seed,
      launchpad,
      review: buildDeepDraftReviewModel(seed),
      lengthTarget: 'long',
    })

    expect(score.overall).toBeGreaterThanOrEqual(80)
    expect(score.recommendCreate).toBe(true)
    expect(score.grade === 'S' || score.grade === 'A' || score.grade === 'B').toBe(true)
    expect(score.dimensions.every(item => item.score >= 60)).toBe(true)
  })
})

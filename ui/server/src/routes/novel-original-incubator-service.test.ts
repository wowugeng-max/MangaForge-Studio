import { describe, expect, test } from 'bun:test'
import { createNovelOriginalIncubatorService } from './novel-original-incubator-service'

describe('original incubator setting assets', () => {
  test('requires deep incubation to output oh-story creation contracts', () => {
    const service = createNovelOriginalIncubatorService()
    const prompt = service.buildOriginalIncubatorPrompt(
      { title: '超人的规则怪谈世界', length_target: 'epic', genre: '规则怪谈', target_audience: '番茄男频' },
      { idea: '双主角闯规则副本', chapter_count: 30 },
    )

    expect(prompt).toContain('target_reader_contract')
    expect(prompt).toContain('genre_positioning_contract')
    expect(prompt).toContain('core_contract_radar')
    expect(prompt).toContain('reader_retention_contract')
    expect(prompt).toContain('写给谁看')
    expect(prompt).toContain('读者想看什么')
    expect(prompt).toContain('本章给什么')
    expect(prompt).toContain('拉长板而非补短板')
    expect(prompt).toContain('当初吸引读者的卖点还在吗')
    expect(prompt).toContain('前300字')
  })

  test('requires deep incubation to use oh-story genre catalog guidance', () => {
    const service = createNovelOriginalIncubatorService()
    const prompt = service.buildOriginalIncubatorPrompt(
      { title: '超人的规则怪谈世界', length_target: 'epic', genre: '规则怪谈', target_audience: '番茄男频' },
      { idea: '双主角闯规则副本', chapter_count: 30 },
    )

    expect(prompt).toContain('genre_catalog_contract')
    expect(prompt).toContain('oh_story_genre_catalog_v1')
    expect(prompt).toContain('规则怪谈')
    expect(prompt).toContain('玩家被抽入规则副本')
    expect(prompt).toContain('背景故事→规则包装→通关线+dead end')
    expect(prompt).toContain('别人死→主角装/破局→揭露→升华')
    expect(prompt).toContain('智斗和金手指负责包合理外衣')
    expect(prompt).toContain('每2000字至少一个悬念/反转/信息差钩子')
  })

  test('requires deep incubation to use oh-story genre core mechanics', () => {
    const service = createNovelOriginalIncubatorService()
    const prompt = service.buildOriginalIncubatorPrompt(
      { title: '拳证星河', length_target: 'epic', genre: '都市高武', target_audience: '番茄男频' },
      { idea: '底层学生靠碎片化金手指升级打怪挣钱', chapter_count: 30 },
    )

    expect(prompt).toContain('genre_core_mechanics_contract')
    expect(prompt).toContain('oh_story_genre_core_mechanics_v1')
    expect(prompt).toContain('主题(立意)→题材核心(吸引力)→核心情绪(体验链条)')
    expect(prompt).toContain('每章至少有期待点或爽点之一')
    expect(prompt).toContain('微创新不超3个')
    expect(prompt).toContain('纵向+横向+交叉')
    expect(prompt).toContain('金手指类型与世界观压迫特征对应')
    expect(prompt).toContain('常规升级流')
    expect(prompt).toContain('碎片化/解锁型')
  })

  test('requires deep incubation to use oh-story plot special topics', () => {
    const service = createNovelOriginalIncubatorService()
    const prompt = service.buildOriginalIncubatorPrompt(
      { title: '拳证星河', length_target: 'epic', genre: '都市高武', target_audience: '番茄男频' },
      { idea: '底层学生靠抽卡系统升级打怪挣钱，三万字上架高潮打全国联考', chapter_count: 30 },
    )

    expect(prompt).toContain('plot_special_topics_contract')
    expect(prompt).toContain('oh_story_plot_special_topics_v1')
    expect(prompt).toContain('金手指拆分成面板/不倒退/重复提升')
    expect(prompt).toContain('题材边界')
    expect(prompt).toContain('同平台、同题材、同类型')
    expect(prompt).toContain('三万字内无关卡点的装逼打脸一个字不要写')
  })

  test('requires original incubation to choose an oh-story opening hook strategy', () => {
    const service = createNovelOriginalIncubatorService()
    const prompt = service.buildOriginalIncubatorPrompt(
      { title: '超人的规则怪谈世界', length_target: 'epic', genre: '规则怪谈', target_audience: '番茄男频' },
      { idea: '双主角闯规则副本', chapter_count: 30 },
    )

    expect(prompt).toContain('opening_strategy_contract')
    expect(prompt).toContain('hook_type')
    expect(prompt).toContain('事件噱头')
    expect(prompt).toContain('金手指噱头')
    expect(prompt).toContain('人设噱头')
    expect(prompt).toContain('不能混用')
    expect(prompt).toContain('mainline_graft')
    expect(prompt).toContain('threshold_ladder')
    expect(prompt).toContain('first_5_chapter_promise')
  })

  test('requires deep incubation to output structured setting entities', () => {
    const service = createNovelOriginalIncubatorService()
    const prompt = service.buildOriginalIncubatorPrompt(
      { title: '超人的规则怪谈世界', length_target: 'epic', genre: '规则怪谈' },
      { idea: '双主角闯规则副本', chapter_count: 30 },
    )

    expect(prompt).toContain('setting_entities')
    expect(prompt).toContain('ability')
    expect(prompt).toContain('realm')
    expect(prompt).toContain('item')
    expect(prompt).toContain('faction')
    expect(prompt).toContain('boss')
  })

  test('normalizes setting entities from incubator payload', () => {
    const service = createNovelOriginalIncubatorService()
    const payload = service.normalizeIncubatorPayload({
      worldbuilding: { world_summary: '规则污染现实。' },
      setting_entities: [
        { entity_type: 'ability', name: '钢铁之躯', summary: '超人级肉身', constraints_json: { cost: '日光储备' } },
        { entity_type: 'faction', name: '规则崇拜教团', summary: '地下组织' },
      ],
      chapters: [{ chapter_no: 1, title: '双魂降临' }],
    }, 30)

    expect(payload.setting_entities).toHaveLength(2)
    expect(payload.setting_entities[0].entity_type).toBe('ability')
    expect(payload.setting_entities[1].name).toBe('规则崇拜教团')
  })

  test('normalizes opening strategy contract from the selected direction writing bible', () => {
    const service = createNovelOriginalIncubatorService()
    const payload = service.normalizeIncubatorPayload({
      directions: [
        {
          direction_id: 'A',
          score: 91,
          writing_bible: {
            opening_strategy_contract: {
              source: 'oh_story_opening_hook_strategy_v1',
              hook_type: '事件噱头',
              opening_flow: '事件切入5章后嫁接主线。',
              mainline_graft: '第五章把规则副本嫁接到校园主线。',
              threshold_ladder: ['十点门槛', '姓名门槛'],
              first_5_chapter_promise: ['第一章立刻进入规则事件。'],
            },
          },
        },
      ],
    }, 30)

    expect(payload.writing_bible.opening_strategy_contract.hook_type).toBe('事件噱头')
    expect(payload.writing_bible.opening_strategy_contract.mainline_graft).toContain('校园主线')
    expect(payload.writing_bible.opening_strategy_contract.threshold_ladder).toContain('十点门槛')
  })
})

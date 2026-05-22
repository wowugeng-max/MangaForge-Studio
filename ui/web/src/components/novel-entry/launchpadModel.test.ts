import { describe, expect, test } from 'bun:test'
import {
  buildLaunchpadSeedPatch,
  createEmptyLaunchpadFields,
  evaluateLaunchpadReadiness,
  extractLaunchpadFieldsFromSeed,
  summarizeFirst30Plan,
} from './launchpadModel'

describe('launchpadModel', () => {
  test('marks a commercial long-form seed as ready across hook, first30, and longform capacity', () => {
    const seed = {
      logline: '寒门少年以阵法改写宗门秩序',
      commercial_positioning: {
        reader_promise: '看主角从杂役一路反杀宗门秩序',
        selling_points: ['阵法升级', '宗门打脸'],
      },
      protagonist: {
        identity: '外门杂役',
        goal: '夺回被抢走的阵盘',
      },
      plot_engine: {
        long_term_goal: '建立自己的阵道宗门',
        long_term_conflict: '旧宗门与上古阵盟持续围剿',
        growth_engine: '阵盘修复与阵纹解锁',
      },
      volume_outlines: [
        { title: '外门压迫', goal: '让主角进入内门视野' },
        { title: '内门夺位', goal: '夺取阵堂话语权' },
      ],
      chapter_outlines: Array.from({ length: 30 }).map((_, index) => ({
        chapter_no: index + 1,
        title: `第${index + 1}章`,
        chapter_goal: index < 3 ? '开篇压迫与反击' : index < 10 ? '试读爽点闭环' : '付费前蓄势',
      })),
      foreshadowing_plan: [{ name: '残缺阵盘' }, { name: '阵盟密令' }],
    }

    const fields = extractLaunchpadFieldsFromSeed(seed)
    const readiness = evaluateLaunchpadReadiness(fields, seed, 'epic')

    expect(fields.reader_promise).toBe('看主角从杂役一路反杀宗门秩序')
    expect(fields.core_selling_point).toBe('阵法升级 / 宗门打脸')
    expect(fields.protagonist_situation).toBe('外门杂役')
    expect(fields.protagonist_pressure).toBe('夺回被抢走的阵盘')
    expect(fields.mainline_goal).toBe('建立自己的阵道宗门')
    expect(fields.long_term_conflict).toBe('旧宗门与上古阵盟持续围剿')
    expect(fields.growth_engine).toBe('阵盘修复与阵纹解锁')
    expect(fields.volume_direction).toContain('外门压迫')
    expect(fields.expandable_assets).toBe('残缺阵盘 / 阵盟密令')
    expect(readiness.sellable.ready).toBe(true)
    expect(readiness.sellable.key).toBe('sellable')
    expect(readiness.sellable.title).toBe('商业钩子')
    expect(readiness.sellable.score).toBe(3)
    expect(readiness.first30.ready).toBe(true)
    expect(readiness.longform.ready).toBe(true)
    expect(readiness.risks).toEqual([])
    expect(readiness.nextAction).toBe(fields.first_writing_task)
  })

  test('extracts the full launchpad contract from a rich seed', () => {
    const seed = {
      reader_promise: '看废柴阵师逆袭成宗门掌印',
      core_selling_point: '阵法经营',
      protagonist: {
        situation: '被贬去守废弃阵库',
        pressure: '三日内修不好护山阵就逐出宗门',
      },
      plot_engine: {
        long_term_goal: '重建上古阵道',
        long_term_conflict: '阵盟垄断所有阵纹传承',
        growth_engine: '修复阵库解锁失传阵图',
      },
      volume_outlines: [
        { title: '阵库求生', goal: '拿到第一批追随者' },
        { title: '阵堂夺权', goal: '挑战旧阵师体系' },
      ],
      foreshadowing_plan: [{ name: '黑色阵旗' }, { name: '旧盟契' }],
      future100_note: '百章前完成阵堂夺权并引出阵盟追杀',
    }

    const fields = extractLaunchpadFieldsFromSeed(seed)

    expect(fields.protagonist_situation).toBe('被贬去守废弃阵库')
    expect(fields.protagonist_pressure).toBe('三日内修不好护山阵就逐出宗门')
    expect(fields.long_term_conflict).toBe('阵盟垄断所有阵纹传承')
    expect(fields.growth_engine).toBe('修复阵库解锁失传阵图')
    expect(fields.volume_direction).toBe('阵库求生: 拿到第一批追随者\n阵堂夺权: 挑战旧阵师体系')
    expect(fields.expandable_assets).toBe('黑色阵旗 / 旧盟契')
    expect(fields.future100_note).toBe('百章前完成阵堂夺权并引出阵盟追杀')
  })

  test('normalizes object list items into useful selling point text', () => {
    const fields = extractLaunchpadFieldsFromSeed({
      commercial_positioning: {
        selling_points: [{ name: '阵法升级' }, { title: '宗门打脸' }],
      },
    })

    expect(fields.core_selling_point).toBe('阵法升级 / 宗门打脸')
    expect(fields.core_selling_point).not.toContain('[object Object]')
  })

  test('reports missing hook and longform risks for a sparse epic manual project', () => {
    const fields = {
      ...createEmptyLaunchpadFields(),
      reader_promise: '',
      core_selling_point: '',
      opening_hook: '',
      first30_plan: {
        chapters_1_3: '',
        chapters_4_10: '',
        chapters_11_30: '',
      },
    }

    const readiness = evaluateLaunchpadReadiness(fields, null, 'epic')

    expect(readiness.sellable.ready).toBe(false)
    expect(readiness.sellable.key).toBe('sellable')
    expect(readiness.sellable.title).toBe('商业钩子')
    expect(readiness.sellable.score).toBe(0)
    expect(readiness.first30.ready).toBe(false)
    expect(readiness.first30.key).toBe('first30')
    expect(readiness.longform.ready).toBe(false)
    expect(readiness.longform.key).toBe('longform')
    expect(readiness.risks).toContain('缺读者承诺')
    expect(readiness.risks).toContain('缺第一章开篇钩子')
    expect(readiness.risks).toContain('超长篇缺长线冲突引擎')
    expect(readiness.nextAction).toBe(readiness.risks[0])
  })

  test('requires long-term conflict for long targets', () => {
    const fields = {
      ...createEmptyLaunchpadFields(),
      reader_promise: '看小人物长期翻盘',
      core_selling_point: '宗门经营',
      opening_hook: '开局被夺洞府',
      mainline_goal: '建立新宗门',
      growth_engine: '经营升级',
      first30_plan: {
        chapters_1_3: '开局承诺',
        chapters_4_10: '试读闭环',
        chapters_11_30: '付费蓄势',
      },
    }

    const readiness = evaluateLaunchpadReadiness(fields, null, 'long')

    expect(readiness.longform.ready).toBe(false)
    expect(readiness.risks).toContain('缺长线冲突引擎')
  })

  test('uses a stable next action fallback when ready fields have no first writing task', () => {
    const fields = {
      ...createEmptyLaunchpadFields(),
      reader_promise: '看主角长期逆袭',
      core_selling_point: '升级爽点',
      opening_hook: '开局被夺传承',
      mainline_goal: '重建宗门',
      long_term_conflict: '旧宗门持续围剿',
      growth_engine: '功法解锁',
      volume_direction: '外门、内门、宗门大战',
      first_writing_task: '',
      first30_plan: {
        chapters_1_3: '开篇承诺',
        chapters_4_10: '试读闭环',
        chapters_11_30: '付费蓄势',
      },
    }

    const readiness = evaluateLaunchpadReadiness(fields, null, 'long')

    expect(readiness.risks).toEqual([])
    expect(readiness.nextAction).toBe('进入故事规划首页。')
  })

  test('requires volume direction and expandable assets for epic longform readiness', () => {
    const fields = {
      ...createEmptyLaunchpadFields(),
      reader_promise: '看主角打穿万界宗门',
      core_selling_point: '万界升级',
      opening_hook: '开局宗门被灭',
      mainline_goal: '重建万界宗门',
      long_term_conflict: '上界联盟持续追杀',
      growth_engine: '世界碎片解锁',
      first30_plan: {
        chapters_1_3: '开篇承诺',
        chapters_4_10: '试读闭环',
        chapters_11_30: '付费蓄势',
      },
    }

    const readiness = evaluateLaunchpadReadiness(fields, null, 'epic')

    expect(readiness.longform.ready).toBe(false)
    expect(readiness.risks).toContain('缺分卷方向')
    expect(readiness.risks).toContain('超长篇缺可扩展资产池')
  })

  test('summarizes first 30 plan from chapter outlines when seed has enough coverage', () => {
    const seed = {
      chapter_outlines: Array.from({ length: 12 }).map((_, index) => ({
        chapter_no: index + 1,
        title: `第${index + 1}章`,
        chapter_goal: index < 3 ? '开篇压迫' : '试读闭环',
      })),
    }

    const summary = summarizeFirst30Plan(seed)

    expect(summary.outlineCount).toBe(12)
    expect(summary.hasOpening).toBe(true)
    expect(summary.hasTrialRead).toBe(true)
    expect(summary.hasPaidBuildup).toBe(false)
    expect(summary.sample[0]).toContain('第1章')
  })

  test('builds seed patch without losing raw seed fields', () => {
    const seed = { title: '万古长夜', custom: { keep: true } }
    const fields = {
      ...createEmptyLaunchpadFields(),
      reader_promise: '看凡人改写宗门秩序',
      core_selling_point: '阵法升级',
      protagonist_situation: '凡人杂役',
      protagonist_pressure: '阵盘被夺',
      opening_hook: '杂役当众被夺阵盘',
      mainline_goal: '建立阵道宗门',
      long_term_conflict: '旧宗门持续围剿',
      growth_engine: '阵纹解锁',
      volume_direction: '外门到内门',
      expandable_assets: '阵盘 / 密令',
      future100_note: '百章内打穿阵堂',
      first_writing_task: '完善第1章场景卡',
      first30_plan: {
        chapters_1_3: '压迫、金手指、第一次反击',
        chapters_4_10: '完成试读闭环',
        chapters_11_30: '进入付费前大危机',
      },
    }

    const patch = buildLaunchpadSeedPatch(seed, fields, ['缺长线承载'])

    expect(patch.title).toBe('万古长夜')
    expect(patch.custom.keep).toBe(true)
    expect(patch.reader_promise).toBe('看凡人改写宗门秩序')
    expect(patch.protagonist_situation).toBe('凡人杂役')
    expect(patch.protagonist_pressure).toBe('阵盘被夺')
    expect(patch.long_term_conflict).toBe('旧宗门持续围剿')
    expect(patch.growth_engine).toBe('阵纹解锁')
    expect(patch.volume_direction).toBe('外门到内门')
    expect(patch.expandable_assets).toBe('阵盘 / 密令')
    expect(patch.future100_note).toBe('百章内打穿阵堂')
    expect(patch.launchpad_risks).toEqual(['缺长线承载'])
    expect(patch.first30_plan.chapters_11_30).toBe('进入付费前大危机')
  })
})

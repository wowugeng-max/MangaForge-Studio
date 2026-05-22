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
    expect(fields.mainline_goal).toBe('建立自己的阵道宗门')
    expect(readiness.sellable.ready).toBe(true)
    expect(readiness.first30.ready).toBe(true)
    expect(readiness.longform.ready).toBe(true)
    expect(readiness.risks).toEqual([])
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
    expect(readiness.first30.ready).toBe(false)
    expect(readiness.longform.ready).toBe(false)
    expect(readiness.risks).toContain('缺读者承诺')
    expect(readiness.risks).toContain('缺第一章开篇钩子')
    expect(readiness.risks).toContain('超长篇缺长线冲突引擎')
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
      opening_hook: '杂役当众被夺阵盘',
      mainline_goal: '建立阵道宗门',
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
    expect(patch.launchpad_risks).toEqual(['缺长线承载'])
    expect(patch.first30_plan.chapters_11_30).toBe('进入付费前大危机')
  })
})

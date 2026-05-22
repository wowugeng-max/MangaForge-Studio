import { describe, expect, test } from 'bun:test'
import { buildNovelLobbyModel } from './novelLobbyModel'

describe('buildNovelLobbyModel', () => {
  test('returns empty continuation state when there are no projects', () => {
    const model = buildNovelLobbyModel([])

    expect(model.featuredProject).toBeNull()
    expect(model.governanceCards).toEqual([])
    expect(model.projectCards).toEqual([])
  })

  test('prioritizes a seed-rich project as ready to continue planning', () => {
    const projects = [{
      id: 7,
      title: '万古长夜',
      genre: '玄幻',
      length_target: 'epic',
      status: 'draft',
      reference_config: {
        project_seed: {
          reader_promise: '看寒门少年用阵法改写宗门秩序',
          core_selling_point: '阵法升级与宗门经营',
          opening_hook: '开局被夺阵盘后当众反击',
          first30_plan: {
            chapters_1_3: '压迫与第一次反击',
            chapters_4_10: '试读闭环',
            chapters_11_30: '付费前大危机',
          },
          mainline_goal: '建立阵道宗门',
          long_term_conflict: '阵盟围剿',
          growth_engine: '阵盘升级',
          volume_direction: '外门到阵盟',
          expandable_assets: '阵盘 / 密令',
          first_writing_task: '检查第1章场景卡',
        },
      },
    }]

    const model = buildNovelLobbyModel(projects)

    expect(model.featuredProject?.project.id).toBe(7)
    expect(model.featuredProject?.nextAction).toBe('检查第1章场景卡')
    expect(model.projectCards[0].riskTags).toContain('规划可继续')
    expect(model.governanceCards[0].actionLabel).toBe('进入故事规划')
  })

  test('asks sparse draft projects to fill commercial hook first', () => {
    const projects = [{
      id: 8,
      title: '空白新书',
      status: 'draft',
      length_target: 'epic',
      reference_config: { project_seed: {} },
    }]

    const model = buildNovelLobbyModel(projects)

    expect(model.featuredProject?.nextAction).toBe('补商业钩子')
    expect(model.projectCards[0].riskTags).toContain('缺读者承诺')
    expect(model.projectCards[0].riskTags).toContain('缺前30章计划')
    expect(model.projectCards[0].riskTags).toContain('缺长线承载')
  })

  test('requires expandable assets for epic longform planning', () => {
    const projects = [{
      id: 10,
      title: '超长篇缺资产池',
      status: 'draft',
      length_target: 'epic',
      reference_config: {
        project_seed: {
          reader_promise: '看少年从边城打穿诸天宗门',
          core_selling_point: '界石升级与宗门经营',
          opening_hook: '边城宗门被上界使者压迫',
          first30_plan: {
            chapters_1_3: '边城危机',
            chapters_4_10: '试读反杀',
            chapters_11_30: '宗门压迫',
          },
          mainline_goal: '建立诸天宗门',
          long_term_conflict: '上界联盟持续围剿',
          growth_engine: '界石升级',
          volume_direction: '边城到上界',
          first_writing_task: '检查第1章场景卡',
        },
      },
    }]

    const model = buildNovelLobbyModel(projects)

    expect(model.featuredProject?.nextAction).toBe('补长线承载')
    expect(model.projectCards[0].riskTags).toContain('缺长线承载')
  })

  test('uses launchpad extraction for nested commercial and planning seed data', () => {
    const projects = [{
      id: 11,
      title: '嵌套种子项目',
      status: 'draft',
      length_target: 'epic',
      reference_config: {
        project_seed: {
          logline: '边城少年用界石重写诸天宗门秩序',
          commercial_positioning: {
            reader_promise: '看边城少年一路打穿诸天宗门',
            selling_points: ['界石升级', '宗门经营'],
          },
          chapter_outlines: Array.from({ length: 30 }).map((_, index) => ({
            chapter_no: index + 1,
            title: `第${index + 1}章`,
            chapter_goal: index < 3 ? '开篇承诺' : index < 10 ? '试读闭环' : '付费蓄势',
          })),
          plot_engine: {
            long_term_goal: '建立诸天宗门',
            long_term_conflict: '上界联盟持续围剿',
            growth_engine: '界石升级',
          },
          volume_outlines: [
            { title: '边城立足', goal: '拿到第一批追随者' },
            { title: '宗门夺权', goal: '挑战旧宗门体系' },
          ],
          foreshadowing_plan: [{ name: '残缺界石' }, { name: '上界盟契' }],
        },
      },
    }]

    const model = buildNovelLobbyModel(projects)

    expect(model.projectCards[0].riskTags).toContain('规划可继续')
    expect(model.projectCards[0].riskTags).not.toContain('缺读者承诺')
    expect(model.projectCards[0].riskTags).not.toContain('缺前30章计划')
    expect(model.projectCards[0].riskTags).not.toContain('缺长线承载')
  })

  test('ignores non-object project entries', () => {
    const model = buildNovelLobbyModel([
      null,
      'bad',
      42,
      {
        id: 12,
        title: '有效项目',
        status: 'draft',
        reference_config: { project_seed: {} },
      },
    ])

    expect(model.projectCards).toHaveLength(1)
    expect(model.projectCards[0].project.title).toBe('有效项目')
    expect(model.governanceCards).toHaveLength(1)
  })

  test('uses provided chapter counts to recommend continuing the next chapter', () => {
    const projects = [{
      id: 9,
      title: '已开写项目',
      status: 'active',
      length_target: 'long',
      chapter_count: 41,
      written_words: 123456,
      reference_config: {
        project_seed: {
          reader_promise: '持续升级反杀',
          core_selling_point: '血脉升级与家族夺权',
          opening_hook: '开局被逐出家族祠堂',
          first30_plan: { chapters_1_3: '开篇', chapters_4_10: '闭环', chapters_11_30: '蓄势' },
          mainline_goal: '夺回家族',
          long_term_conflict: '王朝压制',
          growth_engine: '血脉升级',
          volume_direction: '家族到王朝',
        },
      },
    }]

    const model = buildNovelLobbyModel(projects)

    expect(model.featuredProject?.chapterCount).toBe(41)
    expect(model.featuredProject?.nextAction).toBe('继续第42章')
    expect(model.featuredProject?.writtenWordsLabel).toBe('12.3万字')
  })

  test('does not treat planned chapter shells as written progress', () => {
    const projects = [{
      id: 13,
      title: '三十章启动台',
      status: 'draft',
      length_target: 'epic',
      chapter_count: 30,
      written_chapter_count: 0,
      written_words: 0,
      next_unwritten_chapter_no: 1,
      reference_config: {
        project_seed: {
          reader_promise: '看寒门少年用阵法改写宗门秩序',
          core_selling_point: '阵法升级与宗门经营',
          opening_hook: '开局被夺阵盘后当众反击',
          first30_plan: { chapters_1_3: '开篇', chapters_4_10: '闭环', chapters_11_30: '蓄势' },
          mainline_goal: '建立阵道宗门',
          long_term_conflict: '阵盟围剿',
          growth_engine: '阵盘升级',
          volume_direction: '外门到阵盟',
          expandable_assets: '阵盘 / 密令',
        },
      },
    }]

    const model = buildNovelLobbyModel(projects)

    expect(model.featuredProject?.chapterCount).toBe(30)
    expect(model.featuredProject?.writtenChapterCount).toBe(0)
    expect(model.featuredProject?.nextAction).toBe('开始第1章正文')
  })
})

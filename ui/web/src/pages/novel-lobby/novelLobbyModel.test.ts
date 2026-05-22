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
})

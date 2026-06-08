import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import { buildLongformCreationDiagnosis } from './novel-commercial-ops-routes'

const project = {
  id: 1,
  title: '万古长夜',
  genre: '玄幻',
  summary: '寒门少年靠阵法改写宗门秩序，持续面对压迫、升级、反转和更高层势力。',
  reference_config: {
    writing_bible: {
      reader_promise: '寒门少年用阵法低成本破局，每卷都以越级反杀、身份跃迁和阵法真相制造追读。',
      core_selling_point: '弱势主角用聪明和阵法规则反压强权。',
      commercial_positioning: '玄幻升级流，强目标、强冲突、强回报。',
    },
    story_state: { last_updated_chapter: 12 },
  },
}

const healthyChapters = Array.from({ length: 30 }).map((_, index) => ({
  id: index + 1,
  project_id: 1,
  chapter_no: index + 1,
  title: `第${index + 1}章 阵纹压境`,
  chapter_goal: '主角解决一个即时压迫，并获得新的阵法线索。',
  chapter_summary: '执事压迫升级，主角用阵法反制，获得资源和新敌人的注意。',
  ending_hook: '门外忽然传来内门长老的声音，真正的试炼提前开始。',
  chapter_text: `压迫袭来，主角没有退。阵纹亮起，他反杀对手，拿到奖励，也发现更大的秘密。下一刻，新的敌人出现，所有人震惊。`.repeat(80),
}))

const healthyOutlines = Array.from({ length: 120 }).map((_, index) => ({
  id: index + 1,
  project_id: 1,
  outline_type: index % 20 === 0 ? 'volume' : 'chapter',
  title: index % 20 === 0 ? `第${Math.floor(index / 20) + 1}卷 宗门压迫` : `第${index + 1}章`,
  summary: '主角在宗门、城市、战场和秘境地图中面对组织、敌人、考核、追杀与阴谋，持续升级、反转、收获奖励。',
  conflict: '组织压迫与资源争夺升级。',
  payoff: '突破、奖励、身份跃迁和打脸反转。',
}))

const healthyCharacters = Array.from({ length: 12 }).map((_, index) => ({
  id: index + 1,
  project_id: 1,
  name: `角色${index + 1}`,
  role: index === 0 ? '主角' : index < 5 ? '竞争者' : '势力角色',
  status: 'active',
  goal: '争夺资源、权力和秘密。',
}))

const healthyWorldbuilding = Array.from({ length: 10 }).map((_, index) => ({
  id: index + 1,
  project_id: 1,
  title: `地图/规则${index + 1}`,
  category: 'world',
  content: '宗门、城市、秘境、战场、境界、资源、禁忌和公共事件可持续扩展。',
}))

const healthySettings = [
  { id: 1, project_id: 1, entity_type: 'mainline', name: '宗门压迫主线', summary: '从杂役到宗门秩序改写。' },
  { id: 2, project_id: 1, entity_type: 'subplot', name: '阵法真相支线', summary: '逐步揭开阵法来源。' },
  { id: 3, project_id: 1, entity_type: 'character_arc', name: '主角成长线', summary: '聪明破局到承担代价。' },
  { id: 4, project_id: 1, entity_type: 'foreshadowing_arc', name: '祖阵伏笔线', summary: '前期埋线后期回收。' },
  { id: 5, project_id: 1, entity_type: 'ability', name: '阵法能力体系', summary: '能力边界与升级路径。' },
  { id: 6, project_id: 1, entity_type: 'item', name: '残缺阵盘', summary: '核心道具。' },
]

const healthyReviews = [
  {
    id: 1,
    project_id: 1,
    review_type: 'first30_retention_diagnosis',
    status: 'ok',
    summary: '前30章留存诊断：86 分',
    payload: JSON.stringify({ report: { score: 86, status: 'ready', positioning: { promise_ready: true }, risks: [] } }),
  },
  {
    id: 2,
    project_id: 1,
    review_type: 'longform_pressure_test',
    status: 'ok',
    summary: '300万字长线压力测试：84 分',
    payload: JSON.stringify({ report: { score: 84, status: 'scalable', weak_points: [] } }),
  },
]

describe('longform creation diagnosis', () => {
  test('builds a Qidian 10k baseline diagnosis across core, story, innovation and reader pull', () => {
    const report = buildLongformCreationDiagnosis(project, healthyChapters, healthyOutlines, healthyCharacters, healthyWorldbuilding, healthySettings, healthyReviews)

    expect(report.quality_bar).toBe('qidian_10k_subscription_baseline')
    expect(report.support_range_words).toEqual({ min: 3000000, max: 10000000 })
    expect(report.dimensions.map((item: any) => item.key)).toEqual(['core', 'story', 'innovation', 'reader_pull'])
    expect(report.dimensions.every((item: any) => item.status === 'ok')).toBe(true)
    expect(report.status).toBe('ready')
    expect(report.next_actions).toContain('可以进入章节任务书与连续生产，但每章仍需经过质检、状态同步和资产回填。')
  })

  test('blocks longform creation when core promise, storyline assets and retention are weak', () => {
    const report = buildLongformCreationDiagnosis(
      { ...project, summary: '', reference_config: { writing_bible: {}, story_state: { last_updated_chapter: 0 } } },
      healthyChapters.slice(0, 3).map(chapter => ({ ...chapter, chapter_text: '', ending_hook: '' })),
      healthyOutlines.slice(0, 4),
      healthyCharacters.slice(0, 2),
      healthyWorldbuilding.slice(0, 1),
      [],
      [],
    )

    expect(report.status).toBe('blocked')
    expect(report.dimensions.find((item: any) => item.key === 'core')?.status).toBe('block')
    expect(report.dimensions.find((item: any) => item.key === 'reader_pull')?.status).toBe('block')
    expect(report.blockers.length).toBeGreaterThan(0)
    expect(report.next_actions[0]).toContain('补齐')
  })

  test('commercial ops route persists longform_creation_diagnosis reviews', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-commercial-ops-routes.ts'), 'utf8')

    expect(source).toContain('/api/novel/projects/:id/longform-creation-diagnosis')
    expect(source).toContain("review_type: 'longform_creation_diagnosis'")
    expect(source).toContain("run_type: 'longform_creation_diagnosis'")
    expect(source).toContain('buildLongformCreationDiagnosis')
  })
})

import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import { buildLongformCreationDiagnosis, buildLongformPressureTest, buildReaderTrialRepairTasks, buildReaderTrialReview } from './novel-commercial-ops-routes'

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
    expect(report.compass.reader_promise).toContain('寒门少年')
    expect(report.compass.core_conflict).toContain('压迫')
    expect(report.compass.innovation_hook).toContain('阵法')
    expect(report.compass.payoff_loop).toContain('越级反杀')
    expect(report.compass.ending_direction).toContain('秩序')
    expect(report.compass.immutable_rules.length).toBeGreaterThanOrEqual(3)
    expect(report.compass.flexible_zones).toContain('地图、副本、支线人物和新资产可以扩展，但必须服务读者承诺与当前卷目标。')
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

  test('builds 30/100/300 chapter stress gates and canon memory audit for long-run pressure', () => {
    const report = buildLongformPressureTest(
      {
        ...project,
        target_words: 10000000,
        reference_config: {
          ...project.reference_config,
          story_state: {
            last_updated_chapter: 30,
            version: 'state-v30',
            global: {
              core_promise: '寒门少年用阵法低成本破局',
              current_volume_goal: '宗门试炼结算',
              open_questions: ['祖阵是谁留下的'],
              payoff_queue: ['内门资格必须兑现'],
            },
            characters: [
              { name: '陆沉', status: '试炼胜者', location: '宗门外门' },
              { name: '执事', status: '被反制', location: '执法堂' },
            ],
          },
        },
      },
      healthyChapters,
      healthyOutlines,
      healthyCharacters,
      healthyWorldbuilding,
      healthyReviews,
    )

    expect(report.target_words).toBe(10000000)
    expect(report.target_words_range).toEqual({ min: 3000000, max: 10000000 })
    expect(report.stress_gates.map((item: any) => item.key)).toEqual([
      'chapter_30',
      'chapter_100',
      'chapter_300',
      'memory_canon',
    ])
    expect(report.stress_gates.find((item: any) => item.key === 'chapter_30')?.detail).toContain('前30章')
    expect(report.stress_gates.find((item: any) => item.key === 'chapter_100')?.detail).toContain('未来100章')
    expect(report.stress_gates.find((item: any) => item.key === 'chapter_300')?.detail).toContain('300章')
    expect(report.memory_canon_audit).toMatchObject({
      status: 'ok',
      latest_state_chapter: 30,
      state_version: 'state-v30',
      character_state_count: 2,
      open_question_count: 1,
      payoff_debt_count: 1,
    })
    expect(report.next_actions).toContain('用30/100/300章压力门复查核心承诺、卷级闭环、扩容引擎和正史记忆。')
  })

  test('builds a reader trial review against Qidian 10k subscription reader pull', () => {
    const report = buildReaderTrialReview(project, healthyChapters, healthyOutlines, [
      ...healthyReviews,
      {
        id: 3,
        project_id: 1,
        review_type: 'reader_expectation_sync',
        status: 'warn',
        summary: '期待欠账 1',
        payload: JSON.stringify({
          reader_expectation_sync: {
            status: 'warn',
            score: 72,
            missed: [{ text: '阵法真相必须有可见推进。' }],
            keep_alive: [{ text: '祖阵到底是谁留下的。' }],
          },
        }),
      },
      {
        id: 4,
        project_id: 1,
        review_type: 'innovation_sync',
        status: 'warn',
        summary: '创新缺口 1',
        payload: JSON.stringify({
          innovation_sync: {
            status: 'warn',
            score: 75,
            missed: [{ text: '阵法机制没有写成可视化反差。' }],
          },
        }),
      },
    ])

    expect(report.quality_bar).toBe('qidian_10k_reader_trial_baseline')
    expect(report.personas.map((item: any) => item.key)).toEqual(['payoff_reader', 'plot_reader', 'setting_reader', 'trial_reader'])
    expect(report.personas.find((item: any) => item.key === 'trial_reader')?.focus).toContain('前三章')
    expect(report.segments.map((item: any) => item.key)).toEqual(['1-3', '1-10', 'recent10'])
    expect(report.drop_points.join('')).toContain('期待欠账')
    expect(report.repair_actions.length).toBeGreaterThan(0)
    expect(report.status).toBe('needs_repair')
  })

  test('commercial ops route persists reader_trial_review reviews', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-commercial-ops-routes.ts'), 'utf8')

    expect(source).toContain('/api/novel/projects/:id/reader-trial-review')
    expect(source).toContain("review_type: 'reader_trial_review'")
    expect(source).toContain("run_type: 'reader_trial_review'")
    expect(source).toContain('buildReaderTrialReview')
  })

  test('turns reader trial drop points into longform repair tasks', () => {
    const report = {
      report_id: 'reader-trial-test',
      score: 68,
      status: 'needs_repair',
      summary: '读者试读存在弃读点。',
      drop_points: ['第7章章末钩子弱，试读用户可能弃读。', '创新缺口：阵法机制没有写成可视化反差。'],
      repair_actions: ['重做第7章章末未解决问题。', '把创新卖点写成动作、机制代价、反差场面或 IP 化画面。'],
      personas: [{ key: 'trial_reader', label: '平台试读用户', verdict: '第七章钩子弱。' }],
      segments: [{ key: '1-10', label: '试读十章', score: 68, verdict: '第4-10章需要补强。' }],
    }

    const tasks = buildReaderTrialRepairTasks(report)

    expect(tasks.length).toBe(2)
    expect(tasks[0].source).toBe('reader_trial_review')
    expect(tasks[0].issue_type).toBe('reader_trial_drop_point')
    expect(tasks[0].chapter_no).toBe(7)
    expect(tasks[0].title).toContain('读者试读弃读点修复')
    expect(tasks[0].action).toContain('章末')
    expect(tasks[0].reader_trial_review.drop_points[0]).toContain('第7章')
  })

  test('commercial ops route persists reader trial repair queue as longform production repair', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-commercial-ops-routes.ts'), 'utf8')

    expect(source).toContain('/api/novel/projects/:id/reader-trial-review/repair-queue')
    expect(source).toContain('buildReaderTrialRepairTasks')
    expect(source).toContain("source: 'reader_trial_review'")
    expect(source).toContain("run_type: 'longform_production_repair'")
  })
})

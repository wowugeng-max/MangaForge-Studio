import { describe, expect, test } from 'bun:test'
import { buildPlanningWorkspaceModel } from './planningWorkspaceModel'

const project = {
  title: '万古长夜',
  target_words: 3000000,
  reference_config: {
    writing_bible: {
      promise: '寒门少年以阵法改写宗门秩序',
      protagonist_drive: '李玄要拿回试炼资格，证明残阵不是废物',
      core_conflict: '底层阵修对抗宗门旧秩序的资源封锁',
      world_hook: '残阵缺口牵出宗门旧案和阵道真相',
      innovation_hook: '用残缺阵法反制完整规则，每次破局都有代价',
      payoff_loop: '压迫升级、残阵反制、公开打脸、旧案线索回收',
      ending_direction: '李玄重写宗门阵道秩序',
      immutable_rules: ['主角不能脱离阵法成长线', '宗门秩序压迫不能突然消失'],
      flexible_zones: ['支线人物可增减，但必须服务阵法秩序主线'],
      longform_milestones: [
        {
          label: '30万字外门翻身',
          target_words: 300000,
          target_chapter: 100,
          theme: '外门压迫线阶段兑现',
          protagonist_state: '李玄从藏拙杂役变成被内门注意的阵修',
          world_expansion: '外门、试炼、执事体系完整展开',
          conflict_escalation: '执事压迫升级为内门派系关注',
          reader_payoff: '第一次公开打脸并拿到内门资格',
        },
        {
          label: '100万字宗门旧案',
          target_words: 1000000,
          target_chapter: 330,
          theme: '宗门旧案进入核心主线',
          protagonist_state: '李玄从被动求生转为主动查案',
          world_expansion: '内门、执法堂、旧案势力展开',
          conflict_escalation: '个人压迫升级为宗门秩序清算',
          reader_payoff: '残阵来历第一次大回收',
        },
        {
          label: '300万字阵道改制',
          target_words: 3000000,
          target_chapter: 1000,
          theme: '重写宗门阵道秩序',
          protagonist_state: '李玄成为能制定新阵道规则的人',
          world_expansion: '宗门之外的阵道世界打开',
          conflict_escalation: '宗门旧秩序背后的上层势力登场',
          reader_payoff: '完成全书第一阶段终局兑现',
        },
      ],
      volumes: [
        {
          title: '宗门试炼',
          goal: '让主角从外门杂役进入内门视野',
          stages: [
            { title: '压迫升级', conflict: '执事逼主角交出阵盘', payoff_model: '升级+打脸' },
          ],
        },
      ],
    },
    story_state: {
      last_updated_chapter: 7,
      foreshadowing_status: [{ name: '残缺阵盘', status: 'pending' }],
      mainline_progress: '外门压迫线推进到试炼前夜',
    },
  },
}

const outlines = [
  { id: 1, title: '第一卷 宗门试炼', outline_level: 'volume', start_chapter: 1, end_chapter: 50 },
  { id: 2, title: '压迫升级', outline_level: 'stage', parent_id: 1, start_chapter: 1, end_chapter: 12 },
  { id: 3, title: '试炼前夜转折', outline_level: 'turning_point', parent_id: 2, start_chapter: 10, end_chapter: 10 },
]

const chapters = Array.from({ length: 12 }).map((_, index) => ({
  id: index + 1,
  chapter_no: index + 1,
  title: `第${index + 1}章`,
  chapter_goal: index < 10 ? `推进外门压迫 ${index + 1}` : '',
  conflict: index < 10 ? '执事压迫' : '',
  ending_hook: index < 10 ? '试炼将至' : '',
  chapter_text: index < 7 ? '正文'.repeat(1200) : '',
  raw_payload: {
    payoff: index % 2 === 0 ? '升级' : '打脸',
    mainline_progress: index < 10 ? '外门压迫线' : '',
  },
}))

const storylineSettings = [
  {
    id: 201,
    entity_type: 'mainline',
    name: '外门压迫主线',
    summary: '主角在外门压迫中建立反击能力。',
    first_chapter_no: 1,
    last_chapter_no: 30,
    constraints_json: {
      advance_rule: '每三章必须推进一次压迫升级或反击回报。',
      forbidden_reveal: '不得提前揭露宗主真正身份。',
    },
    state_json: {
      current_state: '执事已经开始针对主角。',
      last_advanced_chapter: 4,
      next_advance_chapter: 6,
      payoff_status: 'pending',
    },
    payload_json: {
      priority: 'high',
      related_characters: ['李玄', '赵执事'],
      expected_payoff: '试炼前夜完成第一次公开打脸。',
    },
  },
  {
    id: 202,
    entity_type: 'foreshadowing_arc',
    name: '残缺阵盘伏笔',
    summary: '阵盘缺口指向宗门旧案。',
    first_chapter_no: 2,
    last_chapter_no: 18,
    constraints_json: {
      advance_rule: '只给线索，不解释旧案全貌。',
      forbidden_reveal: '第18章前不得说出旧案凶手。',
    },
    state_json: {
      current_state: '只露出阵盘缺口。',
      last_advanced_chapter: 3,
      next_advance_chapter: 9,
      payoff_status: 'debt',
    },
    payload_json: {
      priority: 'medium',
      related_foreshadowing: ['残缺阵盘'],
      expected_payoff: '内门试炼中回收阵盘来历。',
    },
  },
  {
    id: 203,
    entity_type: 'item',
    name: '玄铁阵钉',
    summary: '普通物品设定，不进入剧情线看板。',
  },
]

const characterArcSettings = [
  {
    id: 301,
    entity_type: 'character_arc',
    name: '李玄藏拙到公开争取',
    summary: '李玄从害怕暴露阵盘裂纹，转向主动承认缺陷并争取试炼资格。',
    first_chapter_no: 1,
    last_chapter_no: 30,
    constraints_json: {
      advance_rule: '每个试炼节点都要给李玄一次选择压力。',
      taboo: '不得让主角只靠旁白成长。',
    },
    state_json: {
      current_state: '仍在藏拙，但已经被执事逼到边缘。',
      last_advanced_chapter: 4,
      next_advance_chapter: 6,
      payoff_status: 'building',
    },
    payload_json: {
      priority: 'high',
      related_characters: ['李玄'],
      desire: '保住试炼资格并证明阵图属于自己',
      flaw_pressure: '害怕暴露阵盘裂纹，只想继续藏拙',
      growth_target: '第一次主动承认残阵缺陷，把藏拙改成公开争取',
      voice_anchor: '克制、冷静，但遇到阵法归属寸步不让',
    },
  },
  {
    id: 302,
    entity_type: 'relationship_arc',
    name: '李玄与林青禾互信线',
    summary: '林青禾从旁观者转为愿意替李玄作证。',
    first_chapter_no: 3,
    last_chapter_no: 24,
    constraints_json: {
      advance_rule: '关系推进必须来自共同承担风险，不得靠解释性旁白。',
      forbidden_reveal: '不得提前写成完全信任。',
    },
    state_json: {
      current_state: '林青禾仍在观察李玄。',
      last_advanced_chapter: 3,
      next_advance_chapter: 7,
      payoff_status: 'building',
    },
    payload_json: {
      priority: 'medium',
      related_characters: ['李玄', '林青禾'],
      relationship_shift: '林青禾从旁观转为愿意替他作证',
      expected_payoff: '试炼前夜第一次公开站队',
    },
  },
]

function first30Review(overrides: Record<string, any> = {}) {
  const report = {
    score: 76,
    status: 'needs_repair',
    summary: '前30章有商业化雏形，但关键留存点需要补强。',
    positioning: {
      promise_ready: true,
      reader_promise: '寒门少年靠阵法反压宗门秩序。',
    },
    segments: [
      { key: '1-3', label: '开篇三章', score: 82, coverage: 100, hook_rate: 80, payoff_average: 2.3, chapter_count: 3 },
      { key: '4-10', label: '试读十章', score: 68, coverage: 100, hook_rate: 57, payoff_average: 1.4, chapter_count: 7 },
      { key: '11-30', label: '付费前蓄势', score: 60, coverage: 40, hook_rate: 45, payoff_average: 1.1, chapter_count: 8 },
    ],
    chapter_cards: [
      { chapter_id: 1, chapter_no: 1, title: '第一章', score: 84, word_count: 3200, flags: [] },
      { chapter_id: 7, chapter_no: 7, title: '第七章', score: 61, word_count: 2600, flags: ['章末钩子弱', '爽点/悬念信号少'] },
    ],
    risks: [{ severity: 'high', segment: '4-10', issue: '章末追读钩子覆盖率偏低。', action: '补未解决问题。' }],
    next_actions: ['优先重做第4-10章试读闭环。'],
    ...overrides.report,
  }
  return {
    id: overrides.id || 100,
    review_type: 'first30_retention_diagnosis',
    status: overrides.status || 'warn',
    summary: overrides.summary || `前30章留存诊断：${report.score} 分`,
    created_at: overrides.created_at || '2026-06-03T10:00:00.000Z',
    payload: JSON.stringify({ report }),
    ...overrides.record,
  }
}

function coreDriftReview(overrides: Record<string, any> = {}) {
  const report = {
    status: 'warn',
    score: 66,
    label: '核心偏移 1',
    drift_risks: ['核心冲突未充分落地'],
    ...overrides.report,
  }
  return {
    id: overrides.id || 301,
    review_type: 'chapter_core_drift',
    status: overrides.status || 'warn',
    summary: overrides.summary || report.label,
    created_at: overrides.created_at || '2026-06-04T10:00:00.000Z',
    payload: JSON.stringify({ chapter_id: 7, chapter_no: 7, core_drift: report }),
    ...overrides.record,
  }
}

function readerPayoffReview(overrides: Record<string, any> = {}) {
  const report = {
    status: 'warn',
    score: 62,
    label: '回报欠账 2',
    debt_count: 2,
    missed: [{ text: '阵盘裂纹的回报' }],
    debts: [{ text: '试炼资格伏笔待回收' }],
    ...overrides.report,
  }
  return {
    id: overrides.id || 302,
    review_type: 'reader_payoff_sync',
    status: overrides.status || 'warn',
    summary: overrides.summary || report.label,
    created_at: overrides.created_at || '2026-06-04T10:05:00.000Z',
    payload: JSON.stringify({ chapter_id: 7, chapter_no: 7, reader_payoff_sync: report }),
    ...overrides.record,
  }
}

function storylineSyncReview(overrides: Record<string, any> = {}) {
  const report = {
    status: 'warn',
    planned: [
      { entity_id: 201, name: '外门压迫主线', entity_type: 'mainline', usage_type: 'advance', expected_state_change: { summary: '第7章应让执事压迫升级。' } },
      { entity_id: 202, name: '残缺阵盘伏笔', entity_type: 'foreshadowing_arc', usage_type: 'plant', expected_state_change: { summary: '第7章只露一枚残缺阵纹。' } },
    ],
    actual: [
      { entity_id: 202, name: '残缺阵盘伏笔', entity_type: 'foreshadowing_arc', actual_state_change: { summary: '正文写出阵盘缺口发热，指向宗门旧案。' } },
    ],
    completed: [
      { entity_id: 202, name: '残缺阵盘伏笔', entity_type: 'foreshadowing_arc', actual_state_change: { summary: '正文写出阵盘缺口发热。' } },
    ],
    missed: [
      { entity_id: 201, name: '外门压迫主线', entity_type: 'mainline', usage_type: 'advance', expected_state_change: { summary: '没有写出执事压迫升级。' } },
    ],
    unplanned: [],
    forbidden_touched: [],
    ...overrides.report,
  }
  return {
    id: overrides.id || 303,
    review_type: 'storyline_sync',
    status: overrides.status || 'warn',
    summary: overrides.summary || '剧情线复盘：漏推 1',
    created_at: overrides.created_at || '2026-06-04T10:08:00.000Z',
    payload: JSON.stringify({ chapter_id: 7, chapter_no: 7, storyline_sync: report }),
    ...overrides.record,
  }
}

function characterArcSyncReview(overrides: Record<string, any> = {}) {
  const report = {
    status: 'warn',
    score: 58,
    label: '人物弧光缺口 3',
    missed_count: 3,
    priority_repair: '优先补成长节点',
    character_name: '李玄',
    missed: [
      { key: 'desire', label: '角色欲望', text: '李玄想保住试炼资格并证明阵图属于自己' },
      { key: 'flaw_pressure', label: '缺陷受压', text: '害怕暴露阵盘裂纹，只想继续藏拙' },
      { key: 'growth_beat', label: '成长节点', text: '第一次主动承认残阵缺陷' },
    ],
    ...overrides.report,
  }
  return {
    id: overrides.id || 304,
    review_type: 'character_arc_sync',
    status: overrides.status || 'warn',
    summary: overrides.summary || report.label,
    created_at: overrides.created_at || '2026-06-04T10:10:00.000Z',
    payload: JSON.stringify({ chapter_id: 7, chapter_no: 7, character_arc_sync: report }),
    ...overrides.record,
  }
}

function readerExpectationReview(overrides: Record<string, any> = {}) {
  const report = {
    status: 'warn',
    score: 58,
    label: '期待欠账 2',
    planned_count: 4,
    delivered_count: 2,
    missed_count: 2,
    missed: [
      { text: '李玄必须当场反压赵执事的羞辱。' },
      { text: '章末要留下试炼资格被动手脚的问题。' },
    ],
    keep_alive: [
      { text: '残缺阵盘为何会响应宗门旧案。' },
    ],
    next_actions: ['下一次修订优先补足 missed 中的读者期待。'],
    ...overrides.report,
  }
  return {
    id: overrides.id || 306,
    review_type: 'reader_expectation_sync',
    status: overrides.status || 'warn',
    summary: overrides.summary || report.label,
    created_at: overrides.created_at || '2026-06-04T10:18:00.000Z',
    payload: JSON.stringify({ chapter_id: 7, chapter_no: 7, reader_expectation_sync: report }),
    ...overrides.record,
  }
}

function readerRetentionReview(overrides: Record<string, any> = {}) {
  const report = {
    status: 'warn',
    score: 64,
    label: '追读漏项 1',
    missed_count: 1,
    missed: [
      { label: '章末追读问题', text: '试炼资格被动手脚的问题没有压到章末。' },
    ],
    ...overrides.report,
  }
  return {
    id: overrides.id || 307,
    review_type: 'reader_retention_sync',
    status: overrides.status || 'warn',
    summary: overrides.summary || report.label,
    created_at: overrides.created_at || '2026-06-04T10:20:00.000Z',
    payload: JSON.stringify({ chapter_id: 7, chapter_no: 7, reader_retention_sync: report }),
    ...overrides.record,
  }
}

function innovationReview(overrides: Record<string, any> = {}) {
  const report = {
    status: 'warn',
    score: 57,
    label: '创新缺口 3',
    planned_count: 5,
    delivered_count: 2,
    missed_count: 3,
    planned: [
      { key: 'chapter_angle', label: '创新角度', text: '规则边界反噬' },
      { key: 'execution_point_1', label: '执行点', text: '用饼干碎屑验证门槛清除规则' },
      { key: 'differentiation_guardrail_1', label: '差异护栏', text: '不得写成普通开挂碾压' },
      { key: 'ip_adaptation_hook_1', label: 'IP化场面', text: '玻璃门内外对峙' },
    ],
    missed: [
      { key: 'chapter_angle', label: '创新角度', text: '规则边界反噬' },
      { key: 'differentiation_guardrail_1', label: '差异护栏', text: '不得写成普通开挂碾压' },
      { key: 'ip_adaptation_hook_1', label: 'IP化场面', text: '玻璃门内外对峙' },
    ],
    next_actions: ['把创新角度转成可见选择、机制反差、规则代价或 IP 化场面。'],
    ...overrides.report,
  }
  return {
    id: overrides.id || 308,
    review_type: 'innovation_sync',
    status: overrides.status || 'warn',
    summary: overrides.summary || report.label,
    created_at: overrides.created_at || '2026-06-04T10:22:00.000Z',
    payload: JSON.stringify({ chapter_id: 7, chapter_no: 7, innovation_sync: report }),
    ...overrides.record,
  }
}

function ipSceneIntakeReview(overrides: Record<string, any> = {}) {
  const chapterNo = overrides.chapter_no || overrides.chapterNo || 2
  const candidates = overrides.candidates || [
    {
      title: '玻璃门内外对峙',
      visual_hook: '黑暗贴着玻璃爬动，门槛白线像判定边界。',
      adaptation_value: '适合短剧第一集结尾。',
      spread_point: '救不救门外学生的评论区争议。',
    },
  ]
  return {
    id: overrides.id || 309,
    review_type: 'ip_scene_intake',
    status: overrides.status || 'ok',
    summary: overrides.summary || `沉淀 ${candidates.length} 个 IP 场面候选。`,
    created_at: overrides.created_at || '2026-06-04T10:24:00.000Z',
    payload: JSON.stringify({
      chapter_id: chapterNo,
      chapter_no: chapterNo,
      ip_scene_candidates: candidates,
      ...overrides.payload,
    }),
    ...overrides.record,
  }
}

function readabilityReview(overrides: Record<string, any> = {}) {
  const report = {
    readability_score: 72,
    meme_sense: {
      intensity: '轻度',
      immersion_risks: ['死亡高压场景插入吐槽，削弱恐怖感。'],
    },
    issues: [{ severity: 'medium', description: '连续说明偏密。' }],
    ...overrides.report,
  }
  return {
    id: overrides.id || 304,
    review_type: 'readability_review',
    status: overrides.status || 'warn',
    summary: overrides.summary || '可读性 72，出戏风险 1',
    created_at: overrides.created_at || '2026-06-04T10:12:00.000Z',
    payload: JSON.stringify({ chapter_id: 7, chapter_no: 7, readability_review: report }),
    ...overrides.record,
  }
}

function readerTrialReview(overrides: Record<string, any> = {}) {
  const report = {
    status: 'needs_repair',
    score: 74,
    summary: '试读读者仍会追，但第4-10章存在弃读点。',
    quality_bar: 'qidian_10k_reader_trial_baseline',
    personas: [
      { key: 'payoff_reader', label: '爽点读者', verdict: '阵法反击有爽点，但回报密度不稳。', risk_level: 'medium' },
      { key: 'plot_reader', label: '剧情党', verdict: '主线压力清晰。', risk_level: 'low' },
      { key: 'setting_reader', label: '设定党', verdict: '阵法机制可看，但解释偏少。', risk_level: 'medium' },
      { key: 'trial_reader', label: '平台试读用户', verdict: '前三章能点下一章，第七章钩子弱。', risk_level: 'high' },
    ],
    segments: [
      { key: '1-3', label: '开篇三章', score: 82, verdict: '开篇可读。' },
      { key: '1-10', label: '试读十章', score: 68, verdict: '第4-10章需要补强。' },
      { key: 'recent10', label: '最近十章', score: 73, verdict: '近期节奏略疲劳。' },
    ],
    drop_points: ['第7章章末钩子弱，试读用户可能弃读。'],
    pull_points: ['寒门阵法反压强权的承诺清晰。'],
    repair_actions: ['重做第7章章末未解决问题。'],
    ...overrides.report,
  }
  return {
    id: overrides.id || 309,
    review_type: 'reader_trial_review',
    status: overrides.status || 'warn',
    summary: overrides.summary || `读者试读复盘：${report.score} 分`,
    created_at: overrides.created_at || '2026-06-04T10:24:00.000Z',
    payload: JSON.stringify({ report }),
    ...overrides.record,
  }
}

function assetIntakeReview(overrides: Record<string, any> = {}) {
  const report = {
    discovered_assets: [
      { type: 'character', name: '灰袍监考', summary: '试炼场临时出现的监考者。' },
      { type: 'item', name: '裂纹玉牌', summary: '触发旧案伏笔的道具。' },
    ],
    applied_asset_names: [],
    ...overrides.report,
  }
  return {
    id: overrides.id || 305,
    review_type: 'asset_intake',
    status: overrides.status || 'warn',
    summary: overrides.summary || '发现 2 个新资产待确认。',
    created_at: overrides.created_at || '2026-06-04T10:15:00.000Z',
    payload: JSON.stringify({ chapter_id: 7, chapter_no: 7, asset_intake: report }),
    ...overrides.record,
  }
}

describe('planning workspace model a a', () => {
  test('builds a natural six-stage AI creation pipeline with the next best action', () => {
    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines,
      chapters,
      activeChapter: chapters[6],
      settingEntities: [...storylineSettings, ...characterArcSettings],
      reviews: [first30Review()],
    })

    expect(model.creationPipeline.stages.map(stage => stage.key)).toEqual([
      'book_core',
      'longform_plan',
      'story_assets',
      'chapter_launch',
      'delivery_acceptance',
      'serial_release',
    ])
    expect(model.creationPipeline.stages.map(stage => stage.label)).toEqual([
      '全书核心',
      '长线规划',
      '设定资产',
      '章节开写',
      '交稿验收',
      '连载发布',
    ])
    expect(model.creationPipeline.stages.find(stage => stage.key === 'book_core')?.status).toBe('ok')
    expect(model.creationPipeline.currentStageKey).toBe('longform_plan')
    expect(model.creationPipeline.primaryAction.key).toBe('update_rolling_plan')
    expect(model.creationPipeline.primaryAction.label).toBe('更新滚动规划')
    expect(model.creationPipeline.summary).toContain('长线规划')
    expect(model.creationPipeline.riskCount).toBeGreaterThan(0)
  })

  test('blocks the AI creation pipeline at book core when the longform spine is missing', () => {
    const model = buildPlanningWorkspaceModel({
      selectedProject: {
        ...project,
        reference_config: {
          ...project.reference_config,
          writing_bible: {},
        },
      },
      outlines,
      chapters,
      activeChapter: chapters[6],
    })

    expect(model.creationPipeline.currentStageKey).toBe('book_core')
    expect(model.creationPipeline.primaryAction.key).toBe('open_story_assets')
    expect(model.creationPipeline.stages[0]).toMatchObject({
      key: 'book_core',
      label: '全书核心',
      status: 'block',
      active: true,
    })
  })

  test('derives strategic top status and mainline panel from existing project data', () => {
    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines,
      chapters,
      activeChapter: chapters[6],
      materialScore: { score: 74, can_generate: true },
      commercialReadiness: { score: 81 },
    })

    expect(model.topStatus.projectTitle).toBe('万古长夜')
    expect(model.topStatus.currentChapterLabel).toBe('第7章')
    expect(model.topStatus.targetWords).toBe(3000000)
    expect(model.topStatus.writtenWords).toBeGreaterThan(0)
    expect(model.topStatus.future10Coverage.ready).toBe(false)
    expect(model.topStatus.future10Coverage.required).toBe(10)
    expect(model.topStatus.future10Coverage.missingChapters).toContain(13)
    expect(model.mainline.readerPromise).toBe('寒门少年以阵法改写宗门秩序')
    expect(model.mainline.currentVolumeGoal).toBe('让主角从外门杂役进入内门视野')
    expect(model.mainline.currentStageConflict).toBe('执事逼主角交出阵盘')
    expect(model.first30Retention.status).toBe('missing')
    expect(model.first30Retention.actionKey).toBe('run_first30_retention')
  })

  test('builds a longform spine guard from writing bible and latest creation diagnosis compass', () => {
    const model = buildPlanningWorkspaceModel({
      selectedProject: {
        ...project,
        reference_config: {
          ...project.reference_config,
          writing_bible: {
            ...project.reference_config.writing_bible,
            protagonist_drive: '李玄要证明残阵不是废物，也证明自己不是外门弃子',
            core_conflict: '底层阵修对抗宗门旧秩序的资源封锁',
            world_hook: '阵法缺口会暴露宗门旧案',
            innovation_hook: '每次阵法破局都必须付出可见代价',
            payoff_loop: '压迫升级、阵法反制、公开打脸、旧案线索',
            ending_direction: '李玄重写宗门阵道秩序',
            immutable_rules: ['主角不能脱离阵法成长线', '宗门秩序压迫不能突然消失'],
            flexible_zones: ['支线人物可增减，但必须服务阵法秩序主线'],
          },
        },
      },
      outlines,
      chapters,
      activeChapter: chapters[6],
      settingEntities: storylineSettings,
      reviews: [
        {
          id: 91,
          review_type: 'longform_creation_diagnosis',
          created_at: '2026-06-05T10:00:00.000Z',
          payload: JSON.stringify({
            report: {
              compass: {
                reader_promise: '寒门阵修靠残阵反压宗门秩序',
                protagonist_drive: '夺回试炼资格并查清残阵来历',
                core_conflict: '残阵规则与宗门等级压迫持续碰撞',
                world_hook: '每块残阵都对应一段被掩埋的宗门旧史',
                innovation_hook: '破阵不是开挂，而是用缺陷换机会',
                payoff_loop: '发现缺陷、反用规则、争夺资格、回收旧史',
                ending_direction: '主角建立新的阵道规则',
                immutable_rules: ['残阵缺陷必须持续带来代价', '宗门压迫线不能中途变成普通升级流'],
                flexible_zones: ['副本地点可以换，但必须显影阵道旧史'],
              },
            },
          }),
        },
      ],
    })

    expect(model.longformSpineGuard.status).toBe('ready')
    expect(model.longformSpineGuard.sourceLabel).toBe('来自长篇创作诊断')
    expect(model.longformSpineGuard.readerPromise).toBe('寒门阵修靠残阵反压宗门秩序')
    expect(model.longformSpineGuard.axes.map(item => item.key)).toEqual([
      'reader_promise',
      'protagonist_drive',
      'core_conflict',
      'world_hook',
      'innovation_hook',
      'payoff_loop',
      'ending_direction',
    ])
    expect(model.longformSpineGuard.axes.find(item => item.key === 'innovation_hook')?.value).toContain('用缺陷换机会')
    expect(model.longformSpineGuard.immutableRules).toContain('残阵缺陷必须持续带来代价')
    expect(model.longformSpineGuard.flexibleZones).toContain('副本地点可以换，但必须显影阵道旧史')
    expect(model.longformSpineGuard.actionKey).toBe('longform_creation_diagnosis')
  })

  test('builds a core contract radar from the spine guard and current chapter obligations', () => {
    const active = {
      ...chapters[8],
      chapter_no: 9,
      chapter_goal: '让李玄用残阵反制执事压迫',
      conflict: '赵执事逼迫交出阵盘',
      ending_hook: '内门长老注意到残阵异常',
      raw_payload: {
        mainline_progress: '外门压迫升级，主角开始主动反击',
        payoff: '残阵反制、公开打脸、旧案线索',
        innovation_execution: '用残阵缺口制造反制机会',
      },
    }

    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines,
      chapters: [...chapters.slice(0, 8), active],
      activeChapter: active,
    })

    expect(model.coreContractRadar.status).toBe('ready')
    expect(model.coreContractRadar.primaryAction.key).toBe('enter_chapter_writing')
    expect(model.coreContractRadar.checks.map(item => item.key)).toEqual([
      'reader_promise',
      'protagonist_drive',
      'core_conflict',
      'chapter_service',
      'reader_payoff',
      'innovation_hook',
    ])
    expect(model.coreContractRadar.checks.find(item => item.key === 'chapter_service')?.detail).toContain('让李玄')
    expect(model.coreContractRadar.mustServe).toEqual(expect.arrayContaining([
      expect.stringContaining('寒门少年'),
      expect.stringContaining('底层阵修'),
    ]))
    expect(model.coreContractRadar.noDrift).toEqual(expect.arrayContaining([
      expect.stringContaining('核心卖点不可漂移'),
    ]))
  })

  test('routes the core contract radar to quality revision when recent delivery drift exists', () => {
    const driftReview = {
      review_type: 'chapter_core_drift',
      created_at: '2026-06-09T00:00:00.000Z',
      payload_json: {
        core_drift: {
          status: 'warn',
          score: 58,
          label: '核心偏移 2',
          drift_risks: ['本章没有服务外门压迫主线', '创新机制只在旁白里声明'],
        },
      },
    }

    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines,
      chapters,
      activeChapter: chapters[8],
      reviews: [driftReview],
    })

    expect(model.coreContractRadar.status).toBe('needs_action')
    expect(model.coreContractRadar.primaryAction.key).toBe('open_quality_revision')
    expect(model.coreContractRadar.riskTags).toEqual(expect.arrayContaining(['核心偏移', '读者回报待补']))
    expect(model.coreContractRadar.checks.find(item => item.key === 'chapter_service')?.status).toBe('warn')
  })

  test('marks longform spine guard blocked when core axes are missing', () => {
    const model = buildPlanningWorkspaceModel({
      selectedProject: {
        ...project,
        reference_config: {
          ...project.reference_config,
          writing_bible: {},
        },
      },
      outlines,
      chapters,
      activeChapter: chapters[6],
    })

    expect(model.longformSpineGuard.status).toBe('blocked')
    expect(model.longformSpineGuard.missingAxes).toContain('核心卖点')
    expect(model.longformSpineGuard.missingAxes).toContain('核心矛盾')
    expect(model.longformSpineGuard.actionKey).toBe('open_story_assets')
  })

  test('uses longform spine gaps to block the story core lane before automatic writing', () => {
    const model = buildPlanningWorkspaceModel({
      selectedProject: {
        ...project,
        reference_config: {
          ...project.reference_config,
          writing_bible: {
            promise: '寒门少年以阵法反压宗门秩序',
            protagonist_drive: '争夺试炼资格',
            payoff_loop: '阵法反制与公开打脸',
          },
        },
      },
      outlines,
      chapters,
      activeChapter: chapters[6],
    })

    const coreLane = model.longformBattleDesk.lanes.find(item => item.key === 'story_core')
    expect(model.longformSpineGuard.status).toBe('blocked')
    expect(coreLane?.status).toBe('block')
    expect(coreLane?.detail).toContain('全书主轴缺')
    expect(model.longformBattleDesk.primaryAction.key).toBe('open_story_assets')
  })

  test('builds a million-word milestone map from the writing bible', () => {
    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines,
      chapters,
      activeChapter: chapters[6],
    })

    expect(model.millionWordMilestones.status).toBe('ready')
    expect(model.millionWordMilestones.sourceLabel).toBe('来自写作圣经')
    expect(model.millionWordMilestones.total).toBe(3)
    expect(model.millionWordMilestones.currentMilestone?.label).toBe('30万字外门翻身')
    expect(model.millionWordMilestones.nextMilestone?.targetWords).toBe(300000)
    expect(model.millionWordMilestones.milestones.map(item => item.key)).toEqual([
      'milestone-300000',
      'milestone-1000000',
      'milestone-3000000',
    ])
    expect(model.millionWordMilestones.milestones[0].theme).toContain('外门压迫线')
    expect(model.millionWordMilestones.milestones[0].riskTags).toEqual([])
  })

  test('builds a longform memory capsule from story state for canon recall', () => {
    const model = buildPlanningWorkspaceModel({
      selectedProject: {
        ...project,
        reference_config: {
          ...project.reference_config,
          story_state: {
            ...project.reference_config.story_state,
            character_states: [
              '李玄：仍在藏拙，但已经被执事逼到试炼边缘',
              { name: '林青禾', state: '仍在观察李玄，尚未公开站队', chapter_no: 5 },
            ],
            open_questions: ['残阵缺口为什么会回应旧案禁制'],
            payoff_debts: ['试炼资格被夺后的公开打脸回报'],
            canon_facts: ['残阵缺口不能被普通阵图修复'],
          },
        },
      },
      outlines,
      chapters,
      activeChapter: chapters[6],
    })

    expect(model.longformMemoryCapsule.status).toBe('ready')
    expect(model.longformMemoryCapsule.lastUpdatedChapter).toBe(7)
    expect(model.longformMemoryCapsule.corePromise).toContain('寒门少年')
    expect(model.longformMemoryCapsule.mainlineProgress).toContain('试炼前夜')
    expect(model.longformMemoryCapsule.characterStates.join('｜')).toContain('李玄')
    expect(model.longformMemoryCapsule.characterStates.join('｜')).toContain('林青禾')
    expect(model.longformMemoryCapsule.openQuestions).toContain('残阵缺口为什么会回应旧案禁制')
    expect(model.longformMemoryCapsule.payoffDebts).toContain('试炼资格被夺后的公开打脸回报')
    expect(model.longformMemoryCapsule.canonFacts).toContain('残阵缺口不能被普通阵图修复')
    expect(model.longformMemoryCapsule.redLines).toContain('主角不能脱离阵法成长线')
  })

  test('blocks production fuel when an epic target lacks million-word milestones', () => {
    const model = buildPlanningWorkspaceModel({
      selectedProject: {
        ...project,
        reference_config: {
          ...project.reference_config,
          writing_bible: {
            ...project.reference_config.writing_bible,
            longform_milestones: [],
          },
        },
      },
      outlines,
      chapters,
      activeChapter: chapters[6],
    })

    const fuelLane = model.longformBattleDesk.lanes.find(item => item.key === 'production_fuel')
    expect(model.millionWordMilestones.status).toBe('blocked')
    expect(model.millionWordMilestones.summary).toContain('缺少百万字里程碑')
    expect(fuelLane?.status).toBe('block')
    expect(fuelLane?.detail).toContain('百万字里程碑')
  })

  test('parses latest first30 retention diagnosis review into planning model', () => {
    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines,
      chapters,
      activeChapter: chapters[6],
      reviews: [
        first30Review({ id: 1, created_at: '2026-06-03T09:00:00.000Z', report: { score: 62, status: 'blocked' } }),
        first30Review({ id: 2, created_at: '2026-06-03T10:00:00.000Z' }),
      ],
    })

    expect(model.first30Retention.status).toBe('needs_repair')
    expect(model.first30Retention.score).toBe(76)
    expect(model.first30Retention.summary).toContain('商业化雏形')
    expect(model.first30Retention.promiseReady).toBe(true)
    expect(model.first30Retention.segments.map(item => item.key)).toEqual(['1-3', '4-10', '11-30'])
    expect(model.first30Retention.chapterCards[1].riskLevel).toBe('high')
    expect(model.first30Retention.chapterCards[1].flags).toContain('章末钩子弱')
    expect(model.first30Retention.nextActions).toContain('优先重做第4-10章试读闭环。')
    expect(model.first30Retention.actionKey).toBe('create_first30_repair')
  })

  test('builds storyline board from setting entities and first30 risks', () => {
    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines,
      chapters,
      activeChapter: chapters[6],
      settingEntities: storylineSettings,
      reviews: [first30Review()],
    })

    expect(model.storylineBoard.status).toBe('needs_attention')
    expect(model.storylineBoard.total).toBe(2)
    expect(model.storylineBoard.overdueCount).toBe(1)
    expect(model.storylineBoard.debtCount).toBe(1)
    expect(model.storylineBoard.summary).toContain('1 条逾期')
    expect(model.storylineBoard.groups.map(group => group.key)).toContain('mainline')
    expect(model.storylineBoard.groups.map(group => group.key)).toContain('foreshadowing_arc')

    const mainline = model.storylineBoard.groups.find(group => group.key === 'mainline')?.items[0]
    expect(mainline?.name).toBe('外门压迫主线')
    expect(mainline?.typeLabel).toBe('主线')
    expect(mainline?.riskTags).toContain('逾期未推')
    expect(mainline?.retentionImpacts).toContain('第7章 61分')
    expect(mainline?.actionChapterNo).toBe(6)

    const foreshadowing = model.storylineBoard.groups.find(group => group.key === 'foreshadowing_arc')?.items[0]
    expect(foreshadowing?.riskTags).toContain('回收债务')
    expect(foreshadowing?.forbiddenReveal).toContain('第18章前')
  })

})

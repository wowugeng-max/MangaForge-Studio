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

describe('buildPlanningWorkspaceModel', () => {
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

  test('adds storyline sync evidence to board items for plan versus actual review', () => {
    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines,
      chapters,
      activeChapter: chapters[6],
      settingEntities: storylineSettings,
      reviews: [first30Review(), storylineSyncReview()],
    })

    const mainline = model.storylineBoard.groups.find(group => group.key === 'mainline')?.items[0]
    expect(mainline?.planEvidence[0].summary).toContain('执事压迫升级')
    expect(mainline?.syncRisks).toContain('第7章漏推')
    expect(mainline?.latestSyncChapter).toBe(7)

    const foreshadowing = model.storylineBoard.groups.find(group => group.key === 'foreshadowing_arc')?.items[0]
    expect(foreshadowing?.actualEvidence[0].summary).toContain('阵盘缺口发热')
    expect(foreshadowing?.planEvidence[0].usageType).toBe('plant')
    expect(foreshadowing?.latestSyncChapter).toBe(7)
  })

  test('builds character growth board from character arcs, relationship arcs and arc sync risks', () => {
    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines,
      chapters,
      activeChapter: chapters[6],
      settingEntities: [...storylineSettings, ...characterArcSettings],
      reviews: [characterArcSyncReview()],
    })

    expect(model.characterArcBoard.status).toBe('needs_attention')
    expect(model.characterArcBoard.total).toBe(2)
    expect(model.characterArcBoard.growthGapCount).toBe(3)
    expect(model.characterArcBoard.overdueCount).toBe(1)
    expect(model.characterArcBoard.relationshipRiskCount).toBe(1)
    expect(model.characterArcBoard.summary).toContain('人物弧光缺口 3')
    expect(model.characterArcBoard.actionKey).toBe('open_quality_revision')

    const protagonistArc = model.characterArcBoard.arcs.find(item => item.name === '李玄藏拙到公开争取')
    expect(protagonistArc?.typeLabel).toBe('角色线')
    expect(protagonistArc?.riskTags).toContain('成长断档')
    expect(protagonistArc?.riskTags).toContain('弧光缺口')
    expect(protagonistArc?.desire).toContain('试炼资格')
    expect(protagonistArc?.flawPressure).toContain('藏拙')
    expect(protagonistArc?.growthTarget).toContain('公开争取')
    expect(protagonistArc?.latestEvidence[0]).toContain('成长节点')
    expect(protagonistArc?.actionChapterNo).toBe(6)

    const relationshipArc = model.characterArcBoard.arcs.find(item => item.name === '李玄与林青禾互信线')
    expect(relationshipArc?.typeLabel).toBe('关系线')
    expect(relationshipArc?.riskTags).toContain('关系待推进')
    expect(relationshipArc?.relationshipShift).toContain('替他作证')
    expect(relationshipArc?.forbiddenReveal).toContain('完全信任')
  })

  test('summarizes longform rhythm risks from core drift, payoff debt and storyline debt', () => {
    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines,
      chapters,
      activeChapter: chapters[6],
      settingEntities: storylineSettings,
      reviews: [first30Review(), coreDriftReview(), readerPayoffReview()],
    })

    expect(model.longformRhythm.status).toBe('needs_attention')
    expect(model.longformRhythm.score).toBeLessThan(80)
    expect(model.longformRhythm.currentBandLabel).toContain('10万字')
    expect(model.longformRhythm.signals.map(item => item.key)).toEqual(['core', 'volume', 'payoff', 'fatigue'])
    expect(model.longformRhythm.signals.find(item => item.key === 'core')?.detail).toContain('核心偏移')
    expect(model.longformRhythm.signals.find(item => item.key === 'payoff')?.detail).toContain('回报欠账 2')
    expect(model.longformRhythm.signals.find(item => item.key === 'fatigue')?.detail).toContain('剧情线债务')
    expect(model.longformRhythm.nextActions).toContain('先处理核心偏移、回报欠账和剧情线债务，再连续生成下一批章节。')
  })

  test('builds a longform battle desk for daily serial decisions', () => {
    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines,
      chapters,
      activeChapter: chapters[6],
      settingEntities: storylineSettings,
      reviews: [first30Review(), coreDriftReview(), readerPayoffReview(), storylineSyncReview(), innovationReview()],
    })

    expect(model.longformBattleDesk.status).toBe('needs_action')
    expect(model.longformBattleDesk.label).toContain('长篇作战')
    expect(model.longformBattleDesk.primaryAction.key).toBe('open_quality_revision')
    expect(model.longformBattleDesk.primaryAction.label).toBe('进入质检修订')
    expect(model.longformBattleDesk.lanes.map(item => item.key)).toEqual([
      'story_core',
      'reader_pull',
      'storyline',
      'volume_beat',
      'innovation_ip',
      'production_fuel',
    ])
    expect(model.longformBattleDesk.lanes.find(item => item.key === 'story_core')?.detail).toContain('核心偏移')
    expect(model.longformBattleDesk.lanes.find(item => item.key === 'reader_pull')?.detail).toContain('前30章')
    expect(model.longformBattleDesk.lanes.find(item => item.key === 'storyline')?.detail).toContain('漏推')
    expect(model.longformBattleDesk.lanes.find(item => item.key === 'innovation_ip')?.detail).toContain('创新缺口')
    expect(model.longformBattleDesk.riskChips).toEqual(expect.arrayContaining(['核心偏移', '前30章留存', '剧情线漏推', '创新缺口']))
  })

  test('builds a reader trust ledger from expectation, payoff and retention reviews', () => {
    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines,
      chapters,
      activeChapter: chapters[6],
      reviews: [readerExpectationReview(), readerPayoffReview(), readerRetentionReview()],
    })

    expect(model.readerTrustLedger.status).toBe('needs_attention')
    expect(model.readerTrustLedger.score).toBe(58)
    expect(model.readerTrustLedger.summary).toContain('期待欠账 2')
    expect(model.readerTrustLedger.expectationDebtCount).toBe(2)
    expect(model.readerTrustLedger.payoffDebtCount).toBe(2)
    expect(model.readerTrustLedger.retentionMissedCount).toBe(1)
    expect(model.readerTrustLedger.keepAliveCount).toBe(1)
    expect(model.readerTrustLedger.actionKey).toBe('open_quality_revision')
    expect(model.readerTrustLedger.signals.map(item => item.key)).toEqual(['expectation', 'payoff', 'retention', 'keep_alive'])
    expect(model.readerTrustLedger.signals.find(item => item.key === 'keep_alive')?.detail).toContain('残缺阵盘')
  })

  test('builds an innovation radar from latest innovation sync review', () => {
    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines,
      chapters,
      activeChapter: chapters[6],
      reviews: [innovationReview()],
    })

    expect(model.innovationRadar.status).toBe('needs_attention')
    expect(model.innovationRadar.score).toBe(57)
    expect(model.innovationRadar.summary).toContain('创新缺口 3')
    expect(model.innovationRadar.missedCount).toBe(3)
    expect(model.innovationRadar.actionKey).toBe('open_quality_revision')
    expect(model.innovationRadar.signals.map(item => item.key)).toEqual(['chapter_angle', 'execution', 'differentiation', 'ip_adaptation'])
    expect(model.innovationRadar.signals.find(item => item.key === 'chapter_angle')?.detail).toContain('规则边界反噬')
    expect(model.innovationRadar.signals.find(item => item.key === 'ip_adaptation')?.detail).toContain('玻璃门')
  })

  test('builds a reader trial room from latest reader trial review', () => {
    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines,
      chapters,
      activeChapter: chapters[6],
      reviews: [readerTrialReview()],
    })

    expect(model.readerTrialRoom.status).toBe('needs_repair')
    expect(model.readerTrialRoom.score).toBe(74)
    expect(model.readerTrialRoom.summary).toContain('试读读者')
    expect(model.readerTrialRoom.qualityBar).toBe('起点1万均订试读基准')
    expect(model.readerTrialRoom.actionKey).toBe('create_reader_trial_repair')
    expect(model.readerTrialRoom.personas.map(item => item.key)).toEqual(['payoff_reader', 'plot_reader', 'setting_reader', 'trial_reader'])
    expect(model.readerTrialRoom.dropPoints[0]).toContain('第7章')
    expect(model.readerTrialRoom.repairActions[0]).toContain('章末')
    expect(model.governanceHub.checkpoints.map(item => item.key)).toContain('reader_trial')
  })

  test('builds a serial governance hub from delivery, storyline, retention, readability and asset risks', () => {
    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines,
      chapters,
      activeChapter: chapters[6],
      settingEntities: storylineSettings,
      reviews: [
        first30Review(),
        coreDriftReview(),
        readerPayoffReview(),
        storylineSyncReview(),
        readabilityReview(),
        assetIntakeReview(),
      ],
    })

    expect(model.governanceHub.status).toBe('needs_action')
    expect(model.governanceHub.primaryAction.key).toBe('create_delivery_risk_repair')
    expect(model.governanceHub.primaryAction.label).toBe('生成风险修复任务')
    expect(model.governanceHub.summary).toContain('交稿风险')
    expect(model.governanceHub.checkpoints.map(item => item.key)).toEqual([
      'delivery_risk',
      'first30_retention',
      'reader_trial',
      'storyline',
      'asset_intake',
      'longform_material',
    ])
    expect(model.governanceHub.checkpoints.find(item => item.key === 'delivery_risk')?.count).toBeGreaterThanOrEqual(4)
    expect(model.governanceHub.checkpoints.find(item => item.key === 'asset_intake')?.detail).toContain('2 个新资产')
  })

  test('builds a serial release desk from daily update target and publishable backlog', () => {
    const serialProject = {
      ...project,
      reference_config: {
        ...project.reference_config,
        serialization_policy: {
          daily_chapters: 2,
          min_buffer_days: 7,
          last_published_chapter: 4,
        },
      },
    }
    const releaseChapters = Array.from({ length: 28 }).map((_, index) => {
      const chapterNo = index + 1
      return {
        id: chapterNo,
        chapter_no: chapterNo,
        title: `第${chapterNo}章`,
        chapter_goal: `推进连载节奏 ${chapterNo}`,
        conflict: chapterNo % 2 === 0 ? '外门压迫升级' : '阵法反制',
        ending_hook: `第${chapterNo}章末钩子`,
        chapter_text: chapterNo <= 18 ? '正文'.repeat(1500) : '',
        raw_payload: {
          mainline_progress: '外门压迫线',
          payoff: chapterNo % 2 === 0 ? '打脸回报' : '阵法升级',
        },
      }
    })

    const model = buildPlanningWorkspaceModel({
      selectedProject: serialProject,
      outlines,
      chapters: releaseChapters,
      activeChapter: releaseChapters[17],
    })

    expect(model.serialReleaseDesk.status).toBe('ready')
    expect(model.serialReleaseDesk.dailyTargetChapters).toBe(2)
    expect(model.serialReleaseDesk.minBufferDays).toBe(7)
    expect(model.serialReleaseDesk.publishableChapters).toBe(14)
    expect(model.serialReleaseDesk.bufferDays).toBe(7)
    expect(model.serialReleaseDesk.primaryAction.key).toBe('enter_chapter_writing')
    expect(model.serialReleaseDesk.pipeline.map(item => item.key)).toEqual(['published', 'publishable', 'needs_revision', 'drafting', 'planned'])
    expect(model.serialReleaseDesk.releaseWindow[0]).toMatchObject({ chapterNo: 5, status: 'publishable' })
  })

  test('blocks serial release desk when the next release window has delivery risks', () => {
    const riskyChapters = Array.from({ length: 14 }).map((_, index) => {
      const chapterNo = index + 1
      return {
        id: chapterNo,
        chapter_no: chapterNo,
        title: `第${chapterNo}章`,
        chapter_goal: `推进连载节奏 ${chapterNo}`,
        conflict: '外门压迫',
        ending_hook: `第${chapterNo}章末钩子`,
        chapter_text: chapterNo <= 10 ? '正文'.repeat(1400) : '',
        raw_payload: {
          mainline_progress: '外门压迫线',
          payoff: '打脸回报',
        },
      }
    })
    const riskyProject = {
      ...project,
      reference_config: {
        ...project.reference_config,
        serialization_policy: {
          daily_chapters: 2,
          min_buffer_days: 7,
          last_published_chapter: 6,
        },
      },
    }

    const model = buildPlanningWorkspaceModel({
      selectedProject: riskyProject,
      outlines,
      chapters: riskyChapters,
      activeChapter: riskyChapters[9],
      reviews: [
        coreDriftReview({
          record: {
            payload: JSON.stringify({
              chapter_id: 7,
              chapter_no: 7,
              core_drift: { status: 'warn', score: 61, label: '核心偏移 1', drift_risks: ['本章没有服务外门压迫主线'] },
            }),
          },
        }),
        readerRetentionReview({
          record: {
            payload: JSON.stringify({
              chapter_id: 8,
              chapter_no: 8,
              reader_retention_sync: { status: 'warn', score: 63, label: '追读漏项 1', missed_count: 1, missed: [{ text: '章末钩子弱' }] },
            }),
          },
        }),
      ],
    })

    expect(model.serialReleaseDesk.status).toBe('blocked')
    expect(model.serialReleaseDesk.riskChapters.map(item => item.chapterNo)).toEqual([7, 8])
    expect(model.serialReleaseDesk.primaryAction.key).toBe('open_quality_revision')
    expect(model.serialReleaseDesk.releaseWindow.slice(0, 2).map(item => item.status)).toEqual(['needs_revision', 'needs_revision'])
    expect(model.serialReleaseDesk.summary).toContain('发布窗口')
  })

  test('asks for more drafting when serial release buffer is below the configured minimum', () => {
    const thinChapters = Array.from({ length: 14 }).map((_, index) => {
      const chapterNo = index + 1
      return {
        id: chapterNo,
        chapter_no: chapterNo,
        title: `第${chapterNo}章`,
        chapter_goal: `推进连载节奏 ${chapterNo}`,
        conflict: '外门压迫',
        ending_hook: `第${chapterNo}章末钩子`,
        chapter_text: chapterNo <= 9 ? '正文'.repeat(1300) : '',
        raw_payload: {
          mainline_progress: '外门压迫线',
          payoff: '阵法升级',
        },
      }
    })
    const thinProject = {
      ...project,
      reference_config: {
        ...project.reference_config,
        serialization_policy: {
          daily_chapters: 2,
          min_buffer_days: 7,
          last_published_chapter: 6,
        },
      },
    }

    const model = buildPlanningWorkspaceModel({
      selectedProject: thinProject,
      outlines,
      chapters: thinChapters,
      activeChapter: thinChapters[8],
    })

    expect(model.serialReleaseDesk.status).toBe('needs_buffer')
    expect(model.serialReleaseDesk.publishableChapters).toBe(3)
    expect(model.serialReleaseDesk.bufferDays).toBe(1)
    expect(model.serialReleaseDesk.primaryAction.key).toBe('enter_chapter_writing')
    expect(model.serialReleaseDesk.nextActions[0]).toContain('补存稿')
  })

  test('routes serial governance to task center when delivery repair tasks already exist', () => {
    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines,
      chapters,
      activeChapter: chapters[6],
      settingEntities: storylineSettings,
      reviews: [
        first30Review(),
        coreDriftReview(),
        storylineSyncReview(),
        readabilityReview(),
      ],
      productionTasks: {
        tasks: [
          {
            id: 901,
            run_type: 'longform_production_repair',
            status: 'success',
            payload: {
              source: 'review_annotation_risk',
              tasks: [
                { source: 'review_annotation_risk', task_status: 'pending', title: '补核心偏移' },
                { source: 'review_annotation_risk', task_status: 'needs_review', title: '复查剧情线修复' },
                { source: 'review_annotation_risk', task_status: 'resolved', title: '已解决风险' },
              ],
            },
          },
        ],
      },
    })

    expect(model.governanceHub.primaryAction.key).toBe('open_task_center')
    expect(model.governanceHub.primaryAction.label).toBe('打开任务中心')
    expect(model.governanceHub.primaryAction.reason).toContain('2 个交稿风险修复任务')
    expect(model.governanceHub.checkpoints.find(item => item.key === 'delivery_risk')?.detail).toContain('已有 2 个')
  })

  test('routes serial governance to task center while production tasks are active', () => {
    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines,
      chapters,
      activeChapter: chapters[6],
      settingEntities: storylineSettings,
      reviews: [first30Review()],
      productionTasks: {
        active: [
          {
            id: 700,
            run_type: 'generate_prose',
            type_label: '正文生成',
            step_name: 'chapter-8',
            status: 'running',
          },
        ],
        summary: {
          active: 1,
          running: 1,
          paused: 0,
          needs_approval: 0,
        },
      },
    })

    expect(model.governanceHub.primaryAction.key).toBe('open_task_center')
    expect(model.governanceHub.primaryAction.label).toBe('打开任务中心')
    expect(model.governanceHub.primaryAction.reason).toContain('1 个后台任务')
    expect(model.governanceHub.summary).toContain('后台任务')
  })

  test('builds current volume climax and payoff budget from outlines and chapter plans', () => {
    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines,
      chapters,
      activeChapter: chapters[6],
    })

    expect(model.volumeBeatBudget.currentVolumeTitle).toBe('第一卷 宗门试炼')
    expect(model.volumeBeatBudget.status).toBe('needs_attention')
    expect(model.volumeBeatBudget.totalChapters).toBe(50)
    expect(model.volumeBeatBudget.climaxTarget).toBe(4)
    expect(model.volumeBeatBudget.climaxCount).toBe(1)
    expect(model.volumeBeatBudget.payoffCount).toBeGreaterThanOrEqual(10)
    expect(model.volumeBeatBudget.beats.map(item => item.label)).toContain('试炼前夜转折')
    expect(model.volumeBeatBudget.nextActions).toContain('补齐当前卷的小高潮、中高潮和卷末爆点，再进入批量连写。')
  })

  test('builds a volume segment acceptance gate from delivery, payoff and innovation evidence', () => {
    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines,
      chapters,
      activeChapter: chapters[6],
      reviews: [
        readerExpectationReview(),
        readerPayoffReview(),
        readerRetentionReview(),
        innovationReview(),
        coreDriftReview(),
        storylineSyncReview(),
      ],
    })

    expect(model.volumeSegmentGate.status).toBe('needs_attention')
    expect(model.volumeSegmentGate.currentSegmentLabel).toBe('第1-50章')
    expect(model.volumeSegmentGate.actionKey).toBe('complete_volume_plan')
    expect(model.volumeSegmentGate.score).toBeLessThan(80)
    expect(model.volumeSegmentGate.signals.map(signal => signal.key)).toEqual([
      'volume_goal',
      'climax_payoff',
      'reader_trust',
      'innovation_ip',
      'risk_closure',
    ])
    expect(model.volumeSegmentGate.signals.find(signal => signal.key === 'climax_payoff')?.status).toBe('warn')
    expect(model.volumeSegmentGate.signals.find(signal => signal.key === 'reader_trust')?.detail).toContain('期待欠账')
    expect(model.volumeSegmentGate.signals.find(signal => signal.key === 'innovation_ip')?.detail).toContain('玻璃门')
    expect(model.volumeSegmentGate.nextActions).toContain('先补齐当前卷爆点、爽点回报和 IP 化场面，再扩大连续生产。')
  })

  test('builds a recent 10 chapter fatigue radar from repeated conflicts, payoffs and hooks', () => {
    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines,
      chapters,
      activeChapter: chapters[6],
      reviews: [innovationReview()],
    })

    expect(model.recentFatigueRadar.status).toBe('needs_attention')
    expect(model.recentFatigueRadar.chapterRangeLabel).toBe('第1-10章')
    expect(model.recentFatigueRadar.score).toBeLessThan(80)
    expect(model.recentFatigueRadar.actionKey).toBe('update_rolling_plan')
    expect(model.recentFatigueRadar.signals.map(signal => signal.key)).toEqual([
      'conflict_variety',
      'payoff_variety',
      'hook_variety',
      'scene_freshness',
    ])
    expect(model.recentFatigueRadar.signals.find(signal => signal.key === 'conflict_variety')?.detail).toContain('执事压迫')
    expect(model.recentFatigueRadar.signals.find(signal => signal.key === 'hook_variety')?.detail).toContain('试炼将至')
    expect(model.recentFatigueRadar.signals.find(signal => signal.key === 'scene_freshness')?.status).toBe('warn')
    expect(model.recentFatigueRadar.nextActions).toContain('下一批章节要更换压迫来源、回报形态、章末问题或可视化场面，避免十章连续同质化。')
  })

  test('warns when recent chapters have an IP scene intake gap', () => {
    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines,
      chapters,
      activeChapter: chapters[6],
      reviews: [ipSceneIntakeReview({ chapterNo: 2 })],
    })

    const sceneSignal = model.recentFatigueRadar.signals.find(signal => signal.key === 'scene_freshness')
    expect(sceneSignal?.status).toBe('warn')
    expect(sceneSignal?.count).toBe(9)
    expect(sceneSignal?.detail).toContain('IP场面覆盖 1/10')
    expect(sceneSignal?.detail).toContain('玻璃门内外对峙')
    expect(sceneSignal?.actionKey).toBe('update_rolling_plan')
  })

  test('builds a story pressure ladder from future chapter conflicts and stakes', () => {
    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines,
      chapters,
      activeChapter: chapters[6],
    })

    expect(model.storyPressureLadder.status).toBe('needs_attention')
    expect(model.storyPressureLadder.chapterRangeLabel).toBe('第7-12章')
    expect(model.storyPressureLadder.actionKey).toBe('update_rolling_plan')
    expect(model.storyPressureLadder.signals.map(signal => signal.key)).toEqual([
      'pressure_source',
      'conflict_escalation',
      'stakes_growth',
      'reversal_pressure',
    ])
    expect(model.storyPressureLadder.signals.find(signal => signal.key === 'pressure_source')?.detail).toContain('执事压迫')
    expect(model.storyPressureLadder.signals.find(signal => signal.key === 'stakes_growth')?.status).toBe('warn')
    expect(model.storyPressureLadder.pressureSources[0].label).toContain('执事压迫')
    expect(model.storyPressureLadder.nextActions).toContain('下一批章节要明确压力源、升级赌注和反转逼迫，保证故事持续往前拱。')
  })

  test('builds a story unit workshop from the next serial event package', () => {
    const plannedChapters = chapters.map(chapter => {
      if (chapter.chapter_no < 7 || chapter.chapter_no > 12) return chapter
      return {
        ...chapter,
        chapter_goal: `推进试炼前夜事件包 ${chapter.chapter_no}`,
        conflict: chapter.chapter_no <= 9 ? '执事压迫升级' : '试炼场公开反转',
        ending_hook: chapter.chapter_no === 12 ? '内门长老亲自点名' : '试炼倒计时逼近',
        raw_payload: {
          ...chapter.raw_payload,
          pressure_source: chapter.chapter_no <= 9 ? '执事设局' : '试炼规则反噬',
          reader_payoff: chapter.chapter_no === 10 ? '公开打脸执事' : chapter.raw_payload.payoff,
          mainline_progress: chapter.chapter_no === 12 ? '主角进入内门视野' : '试炼前夜压迫升级',
          foreshadowing_task: chapter.chapter_no === 9 ? '阵盘第二道裂纹埋线' : '',
          storyline_task: chapter.chapter_no === 11 ? '外门压迫主线阶段兑现' : '',
          unit_role: chapter.chapter_no === 7 ? '入口钩子' : chapter.chapter_no === 10 ? '小高潮回报' : chapter.chapter_no === 12 ? '出单元钩子' : '',
        },
      }
    })

    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines,
      chapters: plannedChapters,
      activeChapter: plannedChapters[6],
    })

    expect(model.storyUnitWorkshop.status).toBe('ready')
    expect(model.storyUnitWorkshop.currentUnit.chapterRangeLabel).toBe('第7-12章')
    expect(model.storyUnitWorkshop.currentUnit.title).toContain('试炼前夜')
    expect(model.storyUnitWorkshop.currentUnit.signals.map(signal => signal.key)).toEqual([
      'entry_hook',
      'pressure_escalation',
      'mini_climax_payoff',
      'setup_and_storyline',
      'exit_hook',
    ])
    expect(model.storyUnitWorkshop.currentUnit.signals.find(signal => signal.key === 'mini_climax_payoff')?.status).toBe('ok')
    expect(model.storyUnitWorkshop.currentUnit.signals.find(signal => signal.key === 'setup_and_storyline')?.detail).toContain('阵盘第二道裂纹')
    expect(model.storyUnitWorkshop.units[0]?.chapters.map(chapter => chapter.chapterNo)).toEqual([7, 8, 9, 10, 11, 12])
    expect(model.storyUnitWorkshop.nextActions).toContain('当前剧情单元入口、压力升级、小高潮、伏笔/剧情线和出单元钩子完整，可以按单元推进。')
  })

  test('marks first30 retention report stale when early chapters changed later', () => {
    const changedChapters = chapters.map(chapter => chapter.chapter_no === 7
      ? { ...chapter, updated_at: '2026-06-03T11:00:00.000Z' }
      : { ...chapter, updated_at: '2026-06-03T09:30:00.000Z' })

    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines,
      chapters: changedChapters,
      activeChapter: changedChapters[6],
      reviews: [first30Review({ created_at: '2026-06-03T10:00:00.000Z' })],
    })

    expect(model.first30Retention.status).toBe('stale')
    expect(model.first30Retention.stale).toBe(true)
    expect(model.first30Retention.actionKey).toBe('run_first30_retention')
    expect(model.first30Retention.summary).toContain('需重新诊断')
  })

  test('asks to rerun first30 retention diagnosis after repair tasks finish', () => {
    const unchangedChapters = chapters.map(chapter => ({ ...chapter, updated_at: '2026-06-03T09:30:00.000Z' }))

    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines,
      chapters: unchangedChapters,
      activeChapter: unchangedChapters[6],
      reviews: [first30Review({ created_at: '2026-06-03T10:00:00.000Z' })],
      productionTasks: {
        recent: [
          {
            id: 701,
            run_type: 'first30_retention_repair',
            status: 'success',
            created_at: '2026-06-03T10:30:00.000Z',
            updated_at: '2026-06-03T10:45:00.000Z',
          },
        ],
      },
    })

    expect(model.first30Retention.status).toBe('stale')
    expect(model.first30Retention.stale).toBe(true)
    expect(model.first30Retention.actionKey).toBe('run_first30_retention')
    expect(model.first30Retention.summary).toContain('留存修复任务已完成')
    expect(model.first30Retention.nextActions[0]).toContain('重新运行前30章诊断')
  })

  test('builds a future 10-chapter route from the active chapter position', () => {
    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines,
      chapters,
      activeChapter: chapters[6],
    })

    expect(model.futureRoute).toHaveLength(6)
    expect(model.futureRoute[0]).toMatchObject({
      chapterNo: 7,
      title: '第7章',
      chapterTask: '推进外门压迫 7',
      endingHook: '试炼将至',
    })
    expect(model.futureRoute[3].riskTags).toContain('缺章节任务')
  })

  test('reports planning health issues with direct action keys', () => {
    const sparseProject = {
      title: '空白项目',
      reference_config: {
        writing_bible: { promise: '' },
        story_state: { last_updated_chapter: 1 },
      },
    }

    const model = buildPlanningWorkspaceModel({
      selectedProject: sparseProject,
      outlines: [],
      chapters: [{ id: 1, chapter_no: 1, title: '第一章', chapter_text: '正文' }],
      activeChapter: { id: 1, chapter_no: 1, title: '第一章', chapter_text: '正文' },
    })

    expect(model.healthIssues.map(issue => issue.key)).toContain('missing_volume_goal')
    expect(model.healthIssues.map(issue => issue.actionKey)).toContain('complete_volume_plan')
    expect(model.healthIssues.find(issue => issue.key === 'missing_reader_promise')?.actionKey).toBe('open_story_assets')
    expect(model.healthIssues.find(issue => issue.key === 'future10_incomplete')?.actionKey).toBe('update_rolling_plan')
    expect(model.topStatus.longformHealth.status).toBe('needs_planning')
  })

  test('reports incomplete future coverage when fewer than 10 future chapter numbers exist', () => {
    const partialChapters = Array.from({ length: 4 }).map((_, index) => ({
      id: index + 1,
      chapter_no: index + 1,
      title: `第${index + 1}章`,
      chapter_goal: `推进主线 ${index + 1}`,
      conflict: '外门压迫',
      ending_hook: '危机递进',
      raw_payload: { mainline_progress: '外门压迫线' },
    }))

    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines,
      chapters: partialChapters,
      activeChapter: partialChapters[0],
    })

    expect(model.topStatus.future10Coverage.ready).toBe(false)
    expect(model.topStatus.future10Coverage.required).toBe(10)
    expect(model.topStatus.future10Coverage.planned).toBe(4)
    expect(model.topStatus.future10Coverage.missingChapters).toEqual([5, 6, 7, 8, 9, 10])
    expect(model.healthIssues.map(issue => issue.key)).toContain('future10_incomplete')
  })

  test('checks story state freshness against latest written chapter instead of active future chapter', () => {
    const writtenAndPlannedChapters = Array.from({ length: 12 }).map((_, index) => ({
      id: index + 1,
      chapter_no: index + 1,
      title: `第${index + 1}章`,
      chapter_goal: `推进主线 ${index + 1}`,
      conflict: '外门压迫',
      ending_hook: '危机递进',
      chapter_text: index < 3 ? '正文'.repeat(100) : index === 3 ? '【占位正文】' : '',
      raw_payload: { mainline_progress: '外门压迫线' },
    }))
    const currentStoryProject = {
      ...project,
      reference_config: {
        ...project.reference_config,
        story_state: { ...project.reference_config.story_state, last_updated_chapter: 3 },
      },
    }

    const model = buildPlanningWorkspaceModel({
      selectedProject: currentStoryProject,
      outlines,
      chapters: writtenAndPlannedChapters,
      activeChapter: writtenAndPlannedChapters[9],
    })

    expect(model.healthIssues.map(issue => issue.key)).not.toContain('story_state_stale')
  })

  test('does not mark a chapter as serving the volume from story state alone', () => {
    const unplannedChapter = {
      id: 20,
      chapter_no: 20,
      title: '第20章',
      chapter_text: '',
      raw_payload: {},
    }

    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines,
      chapters: [unplannedChapter],
      activeChapter: unplannedChapter,
    })

    expect(model.mainline.currentChapterServesVolume).toBe(false)
  })

  test('uses production outline_type records to locate current volume and stage', () => {
    const productionOutlines = [
      { id: 11, title: '第二卷 内门风暴', outline_type: 'volume', summary: '主角卷入内门派系斗争', start_chapter: 51, end_chapter: 100 },
      { id: 12, title: '内门夺位', outline_type: 'arc', parent_id: 11, summary: '执法堂与丹堂冲突升级', start_chapter: 61, end_chapter: 70 },
      { id: 13, title: '执法堂反噬', outline_type: 'turning_point', parent_id: 12, start_chapter: 66, end_chapter: 66 },
    ]
    const chapter = {
      id: 66,
      chapter_no: 66,
      title: '第66章',
      chapter_goal: '让主角夺回审判主动权',
      conflict: '执法堂逼供',
      ending_hook: '长老亲临',
      raw_payload: { mainline_progress: '内门夺位线' },
    }

    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines: productionOutlines,
      chapters: [chapter],
      activeChapter: chapter,
    })

    expect(model.topStatus.currentVolume).toBe('第二卷 内门风暴')
    expect(model.topStatus.currentStage).toBe('内门夺位')
    expect(model.mainline.currentVolumeGoal).toBe('主角卷入内门派系斗争')
    expect(model.mainline.currentStageConflict).toBe('执法堂逼供')
    expect(model.mainline.nextTurn).toBe('执法堂反噬')
  })

  test('counts applied future 100 skeleton chapter outlines as planned coverage', () => {
    const skeletonOutlines = Array.from({ length: 100 }).map((_, index) => {
      const chapterNo = index + 20
      return {
        id: 1000 + chapterNo,
        outline_type: 'chapter',
        title: `第${chapterNo}章 骨架`,
        summary: `推进长线骨架 ${chapterNo}`,
        conflict_points: ['强敌压迫'],
        hook: '新危机出现',
        raw_payload: {
          source: 'future_100_skeleton',
          chapter_no: chapterNo,
          future100: {
            chapter_no: chapterNo,
            title: `骨架 ${chapterNo}`,
            chapter_goal: `推进长线骨架 ${chapterNo}`,
            conflict: '强敌压迫',
            ending_hook: '新危机出现',
            mainline_progress: '宗门暗线',
          },
        },
      }
    })
    const active = {
      id: 20,
      chapter_no: 20,
      title: '第20章',
      chapter_goal: '进入新卷',
      conflict: '旧敌追击',
      ending_hook: '宗门传令',
      raw_payload: { mainline_progress: '宗门暗线' },
    }

    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines: skeletonOutlines,
      chapters: [active],
      activeChapter: active,
    })

    expect(model.topStatus.future100Coverage.ready).toBe(true)
    expect(model.topStatus.future100Coverage.planned).toBe(100)
    expect(model.topStatus.future100Coverage.missingChapters).toEqual([])
  })

  test('counts applied rolling plan chapter outlines as future 10 planning coverage', () => {
    const rollingOutlines = Array.from({ length: 10 }).map((_, index) => {
      const chapterNo = index + 30
      return {
        id: 2000 + chapterNo,
        outline_type: 'chapter',
        title: `第${chapterNo}章 滚动规划`,
        summary: `更换压迫来源 ${chapterNo}`,
        conflict_points: ['新势力登场'],
        hook: '新的追读问题出现',
        raw_payload: {
          source: 'rolling_plan',
          chapter_no: chapterNo,
          rollingPlan: {
            chapter_no: chapterNo,
            title: `滚动规划 ${chapterNo}`,
            chapter_goal: `更换压迫来源 ${chapterNo}`,
            conflict: '新势力登场',
            ending_hook: '新的追读问题出现',
            mainline_progress: '滚动推进宗门暗线',
          },
        },
      }
    })
    const active = {
      id: 30,
      chapter_no: 30,
      title: '第30章',
      chapter_text: '',
      raw_payload: {},
    }

    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines: rollingOutlines,
      chapters: [active],
      activeChapter: active,
    })

    expect(model.topStatus.future10Coverage.ready).toBe(true)
    expect(model.topStatus.future10Coverage.planned).toBe(10)
    expect(model.topStatus.future10Coverage.missingChapters).toEqual([])
    expect(model.futureRoute[0].chapterTask).toBe('更换压迫来源 30')
    expect(model.futureRoute[0].conflict).toBe('新势力登场')
    expect(model.futureRoute[0].endingHook).toBe('新的追读问题出现')
  })
})

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

describe('planning workspace model b b', () => {
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

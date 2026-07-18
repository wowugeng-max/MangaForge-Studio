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

describe('planning workspace model a b', () => {
  test('adds storyline sync evidence to board items for plan versus actual review', () => {
    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines,
      chapters,
      activeChapter: chapters[6],
      settingEntities: storylineSettings,
      reviews: [first30Review(), storylineSyncReview({
        report: {
          unplanned: [
            { entity_id: 202, name: '残缺阵盘伏笔', entity_type: 'foreshadowing_arc', usage_type: 'advance', actual_state_change: { summary: '正文提前让阵盘指向宗门旧案。' } },
          ],
          forbidden_touched: [
            { entity_id: 202, name: '残缺阵盘伏笔', entity_type: 'foreshadowing_arc', usage_type: 'reveal', actual_state_change: { summary: '疑似提前揭开旧案真相。' } },
          ],
        },
      })],
    })

    const mainline = model.storylineBoard.groups.find(group => group.key === 'mainline')?.items[0]
    expect(mainline?.planEvidence[0].summary).toContain('执事压迫升级')
    expect(mainline?.syncRisks).toContain('第7章漏推')
    expect(mainline?.latestSyncChapter).toBe(7)
    expect(mainline?.diffEvidence.map(item => item.riskType)).toContain('missed')
    expect(mainline?.diffEvidence.find(item => item.riskType === 'missed')?.recommendedActionLabel).toBe('回修正文')
    expect(mainline?.diffEvidence.find(item => item.riskType === 'missed')?.recommendedDecision).toBe('revise_prose')
    expect(mainline?.diffEvidence.find(item => item.riskType === 'missed')?.decisionKey).toContain('storyline_diff:7:201:missed')

    const foreshadowing = model.storylineBoard.groups.find(group => group.key === 'foreshadowing_arc')?.items[0]
    expect(foreshadowing?.actualEvidence[0].summary).toContain('阵盘缺口发热')
    expect(foreshadowing?.planEvidence[0].usageType).toBe('plant')
    expect(foreshadowing?.latestSyncChapter).toBe(7)
    expect(foreshadowing?.diffEvidence.map(item => item.riskType)).toEqual(expect.arrayContaining(['unplanned', 'forbidden_touched']))
    expect(foreshadowing?.diffEvidence.find(item => item.riskType === 'unplanned')?.recommendedActionLabel).toBe('接受为新计划')
    expect(foreshadowing?.diffEvidence.find(item => item.riskType === 'unplanned')?.recommendedDecision).toBe('accept_as_plan')
    expect(foreshadowing?.diffEvidence.find(item => item.riskType === 'unplanned')?.entityName).toBe('残缺阵盘伏笔')
    expect(foreshadowing?.diffEvidence.find(item => item.riskType === 'forbidden_touched')?.recommendedActionLabel).toBe('标记误判')
    expect(foreshadowing?.diffEvidence.find(item => item.riskType === 'forbidden_touched')?.recommendedDecision).toBe('false_positive')
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

  test('longform rhythm and battle desk keep unresolved chapter drift when another chapter is healthy', () => {
    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines,
      chapters,
      activeChapter: chapters[6],
      settingEntities: storylineSettings,
      reviews: [
        first30Review({
          status: 'ok',
          report: {
            status: 'ready',
            score: 86,
            summary: '前30章留存达标。',
            segments: [],
            chapter_cards: [],
            risks: [],
            next_actions: [],
          },
        }),
        coreDriftReview({
          id: 3051,
          created_at: '2026-06-04T11:00:00.000Z',
          record: {
            payload: JSON.stringify({
              chapter_id: 5,
              chapter_no: 5,
              core_drift: {
                status: 'warn',
                score: 64,
                label: '核心偏移 1',
                drift_risks: ['第5章临时支线压过阵法秩序主线'],
              },
            }),
          },
        }),
        coreDriftReview({
          id: 3052,
          status: 'ok',
          created_at: '2026-06-04T11:20:00.000Z',
          record: {
            payload: JSON.stringify({
              chapter_id: 6,
              chapter_no: 6,
              core_drift: {
                status: 'ok',
                score: 90,
                label: '核心稳定',
                drift_risks: [],
                risks: [],
              },
            }),
          },
        }),
      ],
    })

    const coreSignal = model.longformRhythm.signals.find(item => item.key === 'core')
    const coreLane = model.longformBattleDesk.lanes.find(item => item.key === 'story_core')

    expect(coreSignal?.status).toBe('warn')
    expect(coreSignal?.detail).toContain('核心偏移')
    expect(coreLane?.status).toBe('warn')
    expect(coreLane?.detail).toContain('核心偏移')
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

  test('routes governance hub to delivery repair for attraction and benchmark risks', () => {
    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines,
      chapters,
      activeChapter: chapters[6],
      reviews: [
        first30Review({
          status: 'ok',
          report: {
            status: 'ready',
            score: 86,
            summary: '前30章留存达标。',
            segments: [],
            chapter_cards: [],
            risks: [],
            next_actions: [],
          },
        }),
        {
          id: 9101,
          chapter_id: 7,
          review_type: 'chapter_attraction_review',
          created_at: '2026-06-04T11:00:00.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            chapter_attraction_review: {
              status: 'warn',
              score: 62,
              weak_count: 2,
              weak_dimensions: [
                { label: '开篇钩子', status: 'warn', issue: '第一屏没有现场危险' },
                { label: '章末翻页', status: 'warn', issue: '结尾没有下一章必须看的问题' },
              ],
            },
          }),
        },
        {
          id: 9102,
          chapter_id: 7,
          review_type: 'chapter_benchmark_sync',
          created_at: '2026-06-04T11:01:00.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            chapter_benchmark_sync: {
              status: 'warn',
              score: 58,
              missed_count: 2,
              missed: [
                { label: '爽点兑现', text: '主角反制没有形成可见回报' },
                { label: '场景节拍', text: '中段目标、阻碍、转折不清' },
              ],
            },
          }),
        },
      ],
    })

    const deliveryCheckpoint = model.governanceHub.checkpoints.find(item => item.key === 'delivery_risk')

    expect(model.governanceHub.primaryAction.key).toBe('create_delivery_risk_repair')
    expect(deliveryCheckpoint?.status).toBe('warn')
    expect(deliveryCheckpoint?.count).toBeGreaterThanOrEqual(4)
    expect(deliveryCheckpoint?.detail).toContain('吸引力')
    expect(deliveryCheckpoint?.detail).toContain('标杆章')
  })

  test('governance hub keeps unresolved chapter risks when a later chapter review is healthy', () => {
    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines,
      chapters,
      activeChapter: chapters[6],
      reviews: [
        first30Review({
          status: 'ok',
          report: {
            status: 'ready',
            score: 86,
            summary: '前30章留存达标。',
            segments: [],
            chapter_cards: [],
            risks: [],
            next_actions: [],
          },
        }),
        {
          id: 9121,
          chapter_id: 5,
          review_type: 'chapter_attraction_review',
          created_at: '2026-06-04T11:00:00.000Z',
          payload: JSON.stringify({
            chapter_id: 5,
            chapter_no: 5,
            chapter_attraction_review: {
              status: 'warn',
              score: 61,
              weak_count: 2,
              weak_dimensions: [
                { label: '开篇钩子', status: 'warn', issue: '开篇没有即时问题' },
                { label: '章末翻页', status: 'warn', issue: '结尾缺少下一章驱动力' },
              ],
            },
          }),
        },
        {
          id: 9122,
          chapter_id: 6,
          review_type: 'chapter_attraction_review',
          created_at: '2026-06-04T11:20:00.000Z',
          payload: JSON.stringify({
            chapter_id: 6,
            chapter_no: 6,
            chapter_attraction_review: {
              status: 'ok',
              score: 88,
              weak_count: 0,
              weak_dimensions: [],
              summary: '第6章吸引力达标。',
            },
          }),
        },
      ],
    })

    const deliveryCheckpoint = model.governanceHub.checkpoints.find(item => item.key === 'delivery_risk')

    expect(model.governanceHub.primaryAction.key).toBe('create_delivery_risk_repair')
    expect(deliveryCheckpoint?.status).toBe('warn')
    expect(deliveryCheckpoint?.count).toBeGreaterThanOrEqual(2)
    expect(deliveryCheckpoint?.detail).toContain('吸引力')
  })

})

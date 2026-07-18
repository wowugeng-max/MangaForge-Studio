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

describe('planning workspace model b a', () => {
  test('governance hub treats style copy risk as delivery risk even when style beats are present', () => {
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
          id: 9131,
          chapter_id: 7,
          review_type: 'style_sample_sync',
          created_at: '2026-06-04T11:00:00.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            style_sample_sync: {
              status: 'warn',
              score: 72,
              missed_count: 0,
              missed: [],
              copy_risk_count: 1,
              copied_phrases: ['天塌下来有高个子顶着'],
            },
          }),
        },
      ],
    })

    const deliveryCheckpoint = model.governanceHub.checkpoints.find(item => item.key === 'delivery_risk')

    expect(model.governanceHub.primaryAction.key).toBe('create_delivery_risk_repair')
    expect(deliveryCheckpoint?.status).toBe('warn')
    expect(deliveryCheckpoint?.count).toBeGreaterThanOrEqual(1)
    expect(deliveryCheckpoint?.detail).toContain('风格')
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

  test('blocks serial release desk when attraction or benchmark reviews warn before publishing', () => {
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
        {
          id: 9001,
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
          id: 9002,
          chapter_id: 8,
          review_type: 'chapter_benchmark_sync',
          created_at: '2026-06-04T11:01:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
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

    expect(model.serialReleaseDesk.status).toBe('blocked')
    expect(model.serialReleaseDesk.riskChapters.map(item => item.chapterNo)).toEqual([7, 8])
    expect(model.serialReleaseDesk.releaseWindow.slice(0, 2).map(item => item.status)).toEqual(['needs_revision', 'needs_revision'])
    expect(model.serialReleaseDesk.riskChapters[0].riskTags).toContain('吸引力风险')
    expect(model.serialReleaseDesk.riskChapters[1].riskTags).toContain('标杆章风险')
  })

  test('serial release desk uses the latest chapter review so fixed risks do not block publishing', () => {
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
          min_buffer_days: 2,
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
        {
          id: 9201,
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
          id: 9202,
          chapter_id: 7,
          review_type: 'chapter_attraction_review',
          created_at: '2026-06-04T11:10:00.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            chapter_attraction_review: {
              status: 'ok',
              score: 86,
              weak_count: 0,
              weak_dimensions: [],
              summary: '开篇钩子、场景推进和章末翻页已修复。',
            },
          }),
        },
      ],
    })

    expect(model.serialReleaseDesk.releaseWindow[0]).toMatchObject({ chapterNo: 7, status: 'publishable' })
    expect(model.serialReleaseDesk.riskChapters.map(item => item.chapterNo)).not.toContain(7)
    expect(model.serialReleaseDesk.riskChapters.flatMap(item => item.riskTags)).not.toContain('吸引力风险')
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

})

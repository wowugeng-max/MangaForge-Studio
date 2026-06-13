import { describe, expect, test } from 'bun:test'
import {
  buildWritingCockpitModel,
  resolveEditorRevisionChapterId,
  selectTargetChapterForWriting,
} from './writingCockpitModel'

const project = {
  title: '大益武夫',
  reference_config: {
    writing_bible: {
      promise: '看失势皇子以武道和权谋守住镜州',
      volumes: [
        {
          title: '第一卷 镜州风雷',
          goal: '让谢怀安在镜州立住武夫根基并摸清王府人心',
        },
      ],
    },
    story_state: {
      last_updated_chapter: 1,
      mainline_progress: '谢怀安断臂归来，王府旧部观望',
    },
  },
}

const outlines = [
  {
    id: 1,
    title: '第一卷 镜州风雷',
    outline_level: 'volume',
    summary: '失势皇子回到镜州，在边军、王府和朝堂暗线之间重建威望。',
    raw_payload: {
      start_chapter: 1,
      end_chapter: 60,
    },
  },
]

const chapters = [
  {
    id: 101,
    chapter_no: 1,
    title: '断臂归来',
    chapter_goal: '让谢怀安带伤回府，逼出王府众人的第一轮站队',
    conflict: '旧部想迎，新贵想压，太妃只肯给半分体面',
    ending_hook: '城外烽烟未熄，王府内钟声先乱',
    chapter_text: '谢怀安在雨里踏入王府，断臂处的布带仍渗着血。'.repeat(40),
    raw_payload: {
      must_advance: ['王府旧部认出谢怀安的军中信物'],
      forbidden_repeats: ['不要重复解释镜州地理'],
    },
  },
  {
    id: 102,
    chapter_no: 2,
    title: '警钟入城',
    chapter_goal: '用一口警钟把边军危机压到王府筵席上',
    conflict: '谢怀安要借钟声验人心，王府管事试图把警讯压成误传',
    ending_hook: '警钟第三响后，城门守将递来带血腰牌',
    chapter_text: '',
    raw_payload: {
      must_advance: ['迟正确认王府人心'],
      forbidden_repeats: ['不要重复解释穿越设定'],
    },
  },
]

const contextPackage = {
  chapter_target: {
    chapter_goal: '用警钟把边军危机压到王府筵席上',
    previous_handoff: '王府内钟声先乱',
    core_conflict: '谢怀安要借钟声验人心，王府管事试图把警讯压成误传',
    emotional_movement: '从压抑回府转为当众夺回主动权',
    payoff: '读者看到失势皇子第一次反压王府新贵',
    ending_hook: '城门守将递来带血腰牌',
    forbidden_repeats: ['不要重复解释穿越设定'],
  },
  preflight: {
    ready: true,
    blockers: [],
  },
}

const sceneCardChapter = {
  ...chapters[1],
  scene_list: [
    {
      scene_no: 'not-a-number',
      title: '警钟入席',
      purpose: '把边军警讯压到王府筵席上',
      conflict: '管事试图把警讯压成误传',
      turn: '谢怀安当众点出腰牌血迹',
      ending_hook: '第三声钟响后，守将闯入',
    },
  ],
}

const acceptedProject = {
  ...project,
  reference_config: {
    ...project.reference_config,
    story_state: {
      ...project.reference_config.story_state,
      last_updated_chapter: 1,
    },
  },
}

function proseQualityReview(overrides: Record<string, any> = {}) {
  const defaultPayload = {
    chapter_id: 101,
    self_check: {
      final_text: chapters[0].chapter_text,
      review: {
        score: 82,
        passed: true,
        status: 'pass',
        issues: [],
        must_fix: [],
        optional_improvements: [],
        revision_directives: [],
        needs_revision: false,
      },
    },
  }
  const payloadOverride = overrides.payload || {}
  const selfCheckOverride = payloadOverride.self_check
  const payload = {
    ...defaultPayload,
    ...payloadOverride,
    self_check: selfCheckOverride === undefined
      ? defaultPayload.self_check
      : {
          final_text: defaultPayload.self_check.final_text,
          ...selfCheckOverride,
        },
  }

  return {
    id: overrides.id || 201,
    review_type: 'prose_quality',
    status: overrides.status || 'ok',
    summary: overrides.summary || '质量通过，节奏和钩子可交稿。',
    created_at: overrides.created_at || '2026-05-24T00:00:00.000Z',
    payload: JSON.stringify(payload),
    ...overrides.record,
  }
}

function editorReportReview(overrides: Record<string, any> = {}) {
  const payload = {
    chapter_id: 101,
    report: {
      overall_score: 68,
      summary: '章末钩子不足，需要强化收束压力。',
      must_fix: ['章末钩子不足'],
      optional_improvements: ['压缩解释'],
      one_click_revision_prompt: '强化章末钩子',
    },
    ...overrides.payload,
  }

  return {
    id: overrides.id || 301,
    review_type: 'editor_report',
    status: overrides.status || 'ready',
    summary: overrides.summary || '编辑报告指出章末钩子不足。',
    created_at: overrides.created_at || '2026-05-24T00:10:00.000Z',
    payload: JSON.stringify(payload),
    ...overrides.record,
  }
}

function editorRevisionReview(overrides: Record<string, any> = {}) {
  const payload = {
    chapter_id: 101,
    source_review_id: 301,
    revision_summary: '强化章末钩子，并压缩解释段落。',
    applied_patches: [{ start: 10, end: 20, replacement: '新的章末压力段落' }],
    ...overrides.payload,
  }

  return {
    id: overrides.id || 401,
    review_type: 'editor_revision',
    status: overrides.status || 'applied',
    summary: overrides.summary || '已应用章末钩子修订。',
    created_at: overrides.created_at || '2026-05-24T00:20:00.000Z',
    payload: JSON.stringify(payload),
    ...overrides.record,
  }
}

function storylineSyncReview(overrides: Record<string, any> = {}) {
  const payload = {
    chapter_id: 101,
    chapter_no: 1,
    storyline_sync: {
      status: 'warn',
      planned: [{ name: '夺回镜州主线' }, { name: '旧臣背刺伏笔线' }],
      actual: [{ name: '夺回镜州主线' }, { name: '额外教团渗透线' }],
      completed: [{ name: '夺回镜州主线' }],
      missed: [{ name: '旧臣背刺伏笔线' }],
      unplanned: [{ name: '额外教团渗透线' }],
      forbidden_touched: [{ name: '幕后主使真名' }],
    },
    ...overrides.payload,
  }

  return {
    id: overrides.id || 401,
    review_type: 'storyline_sync',
    status: overrides.status || 'warn',
    summary: overrides.summary || '剧情线同步存在 3 项风险。',
    created_at: overrides.created_at || '2026-05-24T00:20:00.000Z',
    payload: JSON.stringify(payload),
    ...overrides.record,
  }
}

function storyUnitSyncReview(overrides: Record<string, any> = {}) {
  const payload = {
    chapter_id: 101,
    chapter_no: 1,
    story_unit_sync: {
      status: 'warn',
      label: '单元漏写 1 · 单元抢跑 2 · 禁抢跑 1',
      score: 58,
      missed_count: 1,
      rushed_count: 2,
      forbidden_count: 1,
      missed: [{ key: 'entry_hook', label: '入口钩子', text: '第7章以试炼倒计时开场。' }],
      rushed_ahead: [
        { key: 'mini_climax_payoff', label: '后段小高潮', text: '第10章公开打脸执事。' },
        { key: 'exit_hook', label: '出单元钩子', text: '第12章内门长老亲自点名。' },
      ],
      forbidden_touched: [{ key: 'forbidden_advance_1', label: '禁抢跑', text: '不得提前解决内门招揽条件' }],
    },
    ...overrides.payload,
  }

  return {
    id: overrides.id || 402,
    review_type: 'story_unit_sync',
    status: overrides.status || 'warn',
    summary: overrides.summary || '剧情单元同步存在 4 项风险。',
    created_at: overrides.created_at || '2026-05-24T00:21:00.000Z',
    payload: JSON.stringify(payload),
    ...overrides.record,
  }
}

function assetIntakeReview(overrides: Record<string, any> = {}) {
  const payload = {
    chapter_id: 101,
    chapter_no: 1,
    discovered_assets: [
      { entity_type: 'character', name: '周远', summary: '新来的宿舍管理员' },
      { entity_type: 'item', name: '黑色钥匙', summary: '能打开禁闭室' },
    ],
    applied_asset_names: [],
    ...overrides.payload,
  }

  return {
    id: overrides.id || 501,
    review_type: 'asset_intake',
    status: overrides.status || 'pending',
    summary: overrides.summary || '发现 2 个新资产待确认。',
    created_at: overrides.created_at || '2026-05-24T00:30:00.000Z',
    payload: JSON.stringify(payload),
    ...overrides.record,
  }
}

function ipSceneIntakeReview(overrides: Record<string, any> = {}) {
  const payload = {
    chapter_id: 101,
    chapter_no: 1,
    ip_scene_candidates: [
      {
        title: '玻璃门内外对峙',
        visual_hook: '黑暗贴着玻璃爬动，门槛白线像判定边界。',
        adaptation_value: '适合短剧第一集结尾。',
      },
      {
        title: '宿舍大厅十点熄灯',
        visual_hook: '路灯同时熄灭，校园被黑布盖住。',
        adaptation_value: '适合漫剧跨页。',
      },
    ],
    ...overrides.payload,
  }

  return {
    id: overrides.id || 551,
    review_type: 'ip_scene_intake',
    status: overrides.status || 'ok',
    summary: overrides.summary || '沉淀 2 个 IP 场面候选。',
    created_at: overrides.created_at || '2026-05-24T00:35:00.000Z',
    payload: JSON.stringify(payload),
    ...overrides.record,
  }
}

function readabilityReview(overrides: Record<string, any> = {}) {
  const payload = {
    chapter_id: 101,
    chapter_no: 1,
    readability_review: {
      readability_score: 82,
      meme_sense: {
        intensity: '轻度',
        used_functions: ['主角吐槽', '社畜共鸣'],
        immersion_risks: [{ severity: 'low', description: '高压死亡前后避免插科打诨' }],
      },
      issues: [],
    },
    ...overrides.payload,
  }

  return {
    id: overrides.id || 601,
    review_type: 'readability_review',
    status: overrides.status || 'ok',
    summary: overrides.summary || '可读性 82，网感轻度，出戏风险 1。',
    created_at: overrides.created_at || '2026-05-24T00:40:00.000Z',
    payload: JSON.stringify(payload),
    ...overrides.record,
  }
}

function chapterAttractionReview(overrides: Record<string, any> = {}) {
  const payload = {
    chapter_id: 101,
    chapter_no: 1,
    chapter_attraction_review: {
      status: 'warn',
      score: 62,
      label: '吸引力缺口 3',
      weak_count: 3,
      priority_repair: '优先修章末翻页',
      dimensions: [
        { key: 'opening_hook', label: '开篇钩子', status: 'ok', score: 82 },
        { key: 'payoff_density', label: '爽点密度', status: 'warn', score: 58, issue: '爽点没有写成可见反制结果' },
        { key: 'page_turn', label: '章末翻页', status: 'warn', score: 42, issue: '结尾没有留下下一章必须看的问题' },
      ],
    },
    ...overrides.payload,
  }

  return {
    id: overrides.id || 651,
    review_type: 'chapter_attraction_review',
    status: overrides.status || 'warn',
    summary: overrides.summary || '章节吸引力 62，吸引力缺口 3。',
    created_at: overrides.created_at || '2026-05-24T00:45:00.000Z',
    payload: JSON.stringify(payload),
    ...overrides.record,
  }
}

function storyDriveSyncReview(overrides: Record<string, any> = {}) {
  const payload = {
    chapter_id: 101,
    chapter_no: 1,
    story_drive_sync: {
      status: 'warn',
      score: 60,
      label: '故事力缺口 3',
      missed_count: 3,
      priority_repair: '优先补主角选择',
      missed: [
        { key: 'protagonist_choice', label: '主角选择', text: '主角当众选择用残阵反证阵图归属' },
        { key: 'choice_cost', label: '选择代价', text: '暴露阵盘裂纹，招来内门势力注意' },
        { key: 'state_change', label: '状态变化', text: '主角从被动挨压转为主动入局' },
      ],
    },
    ...overrides.payload,
  }

  return {
    id: overrides.id || 665,
    review_type: 'story_drive_sync',
    status: overrides.status || 'warn',
    summary: overrides.summary || '故事驱动力 60，故事力缺口 3。',
    created_at: overrides.created_at || '2026-05-24T00:46:00.000Z',
    payload: JSON.stringify(payload),
    ...overrides.record,
  }
}

function characterArcSyncReview(overrides: Record<string, any> = {}) {
  const payload = {
    chapter_id: 101,
    chapter_no: 1,
    character_arc_sync: {
      status: 'warn',
      score: 58,
      label: '人物弧光缺口 3',
      missed_count: 3,
      priority_repair: '优先补成长节点',
      missed: [
        { key: 'desire', label: '角色欲望', text: '沈砚想保住试炼资格并证明阵图属于自己' },
        { key: 'flaw_pressure', label: '缺陷受压', text: '害怕暴露阵盘裂纹，只想继续藏拙' },
        { key: 'growth_beat', label: '成长节点', text: '第一次主动承认残阵缺陷' },
      ],
    },
    ...overrides.payload,
  }

  return {
    id: overrides.id || 675,
    review_type: 'character_arc_sync',
    status: overrides.status || 'warn',
    summary: overrides.summary || '人物弧光 58，人物弧光缺口 3。',
    created_at: overrides.created_at || '2026-05-24T00:47:00.000Z',
    payload: JSON.stringify(payload),
    ...overrides.record,
  }
}

function coreDriftReview(overrides: Record<string, any> = {}) {
  const payload = {
    chapter_id: 101,
    chapter_no: 1,
    core_drift: {
      status: 'warn',
      score: 73,
      drift_risks: ['核心冲突未充分落地', '章末钩子偏离任务书'],
      checks: [
        { key: 'reader_promise', status: 'ok', score: 88 },
        { key: 'core_conflict', status: 'warn', score: 58 },
        { key: 'ending_hook', status: 'warn', score: 60 },
      ],
    },
    ...overrides.payload,
  }

  return {
    id: overrides.id || 701,
    review_type: 'chapter_core_drift',
    status: overrides.status || 'warn',
    summary: overrides.summary || '核心守恒 73，偏移风险 2。',
    created_at: overrides.created_at || '2026-05-24T00:50:00.000Z',
    payload: JSON.stringify(payload),
    ...overrides.record,
  }
}

function readerPayoffSyncReview(overrides: Record<string, any> = {}) {
  const payload = {
    chapter_id: 101,
    chapter_no: 1,
    reader_payoff_sync: {
      status: 'warn',
      score: 64,
      label: '回报欠账 2',
      debt_count: 2,
      planned: [{ text: '主角夺回主动权' }, { text: '带血腰牌真相' }],
      delivered: [{ text: '主角夺回主动权' }],
      missed: [{ text: '带血腰牌真相' }, { text: '腰牌背后的边军危机' }],
      debts: [{ text: '旧臣背刺伏笔待回收' }],
    },
    ...overrides.payload,
  }

  return {
    id: overrides.id || 801,
    review_type: 'reader_payoff_sync',
    status: overrides.status || 'warn',
    summary: overrides.summary || '读者回报欠账 2 项。',
    created_at: overrides.created_at || '2026-05-24T01:00:00.000Z',
    payload: JSON.stringify(payload),
    ...overrides.record,
  }
}

function readerRetentionSyncReview(overrides: Record<string, any> = {}) {
  const payload = {
    chapter_id: 101,
    chapter_no: 1,
    reader_retention_sync: {
      status: 'warn',
      score: 68,
      label: '漏追读 2',
      missed_count: 2,
      planned: [{ key: 'opening_hook', text: '开篇门外敲门' }, { key: 'ending_question', text: '纸条是谁塞进来的' }],
      delivered: [],
      missed: [{ key: 'opening_hook', text: '开篇门外敲门' }, { key: 'ending_question', text: '纸条是谁塞进来的' }],
    },
    ...overrides.payload,
  }

  return {
    id: overrides.id || 901,
    review_type: 'reader_retention_sync',
    status: overrides.status || 'warn',
    summary: overrides.summary || '追读雷达漏兑现 2 项。',
    created_at: overrides.created_at || '2026-05-24T01:10:00.000Z',
    payload: JSON.stringify(payload),
    ...overrides.record,
  }
}

function chapterBenchmarkSyncReview(overrides: Record<string, any> = {}) {
  const payload = {
    chapter_id: 101,
    chapter_no: 1,
    chapter_benchmark_sync: {
      status: 'warn',
      score: 67,
      label: '基准缺口 2',
      missed_count: 2,
      planned: [
        { key: 'opening_hook', label: '开篇钩子', text: '开篇 300 字内出现死亡规则' },
        { key: 'ending_hook_pattern', label: '章末追读', text: '章末出现必须翻页的问题' },
      ],
      delivered: [],
      missed: [
        { key: 'opening_hook', label: '开篇钩子', text: '开篇 300 字内出现死亡规则' },
        { key: 'ending_hook_pattern', label: '章末追读', text: '章末出现必须翻页的问题' },
      ],
    },
    ...overrides.payload,
  }

  return {
    id: overrides.id || 925,
    review_type: 'chapter_benchmark_sync',
    status: overrides.status || 'warn',
    summary: overrides.summary || '质量基准样例缺口 2 项。',
    created_at: overrides.created_at || '2026-05-24T01:12:00.000Z',
    payload: JSON.stringify(payload),
    ...overrides.record,
  }
}

function styleSampleSyncReview(overrides: Record<string, any> = {}) {
  const payload = {
    chapter_id: 101,
    chapter_no: 1,
    style_sample_sync: {
      status: 'warn',
      score: 61,
      label: '风格缺口 2',
      missed_count: 2,
      copy_risk_count: 1,
      missed: [
        { key: 'narrative_rhythm', label: '叙述节奏', text: '先压迫，再拆规则，再小反打' },
        { key: 'dialogue_ratio', label: '对白比例', text: '35%-45%' },
      ],
      copied_phrases: ['这破学校连晚自习都外包给影子了'],
    },
    ...overrides.payload,
  }

  return {
    id: overrides.id || 927,
    review_type: 'style_sample_sync',
    status: overrides.status || 'warn',
    summary: overrides.summary || '风格样章执行 61，风格缺口 2，照搬风险 1。',
    created_at: overrides.created_at || '2026-05-24T01:13:00.000Z',
    payload: JSON.stringify(payload),
    ...overrides.record,
  }
}

function readerExpectationSyncReview(overrides: Record<string, any> = {}) {
  const payload = {
    chapter_id: 101,
    chapter_no: 1,
    reader_expectation_sync: {
      status: 'warn',
      score: 70,
      label: '期待欠账 1',
      missed_count: 1,
      planned_count: 3,
      delivered_count: 2,
      planned: [
        { key: 'opening_hook', text: '开篇门外敲门' },
        { key: 'payoff_promise', text: '主角夺回主动权' },
        { key: 'ending_hook', text: '纸条是谁塞进来的' },
      ],
      delivered: [{ key: 'opening_hook', text: '开篇门外敲门' }, { key: 'payoff_promise', text: '主角夺回主动权' }],
      missed: [{ key: 'ending_hook', text: '纸条是谁塞进来的' }],
      keep_alive: [{ key: 'open_question_1', text: '幕后敲门者是谁' }],
    },
    ...overrides.payload,
  }

  return {
    id: overrides.id || 951,
    review_type: 'reader_expectation_sync',
    status: overrides.status || 'warn',
    summary: overrides.summary || '读者期待欠账 1 项。',
    created_at: overrides.created_at || '2026-05-24T01:15:00.000Z',
    payload: JSON.stringify(payload),
    ...overrides.record,
  }
}

function runwaySyncReview(overrides: Record<string, any> = {}) {
  const payload = {
    chapter_id: 101,
    chapter_no: 1,
    runway_sync: {
      status: 'warn',
      score: 64,
      label: '航线风险 2',
      risk_count: 2,
      four_question_missed: [{ key: 'page_turn', label: '读者为什么翻页', text: '门外学生说出李超的死因' }],
      reader_fuel_missed: [{ text: '规则反制爽点' }],
      redline_touched: [],
    },
    ...overrides.payload,
  }

  return {
    id: overrides.id || 981,
    review_type: 'runway_sync',
    status: overrides.status || 'warn',
    summary: overrides.summary || '百万字航线风险 2 项。',
    created_at: overrides.created_at || '2026-05-24T01:18:00.000Z',
    payload: JSON.stringify(payload),
    ...overrides.record,
  }
}

function innovationSyncReview(overrides: Record<string, any> = {}) {
  const payload = {
    chapter_id: 101,
    chapter_no: 1,
    innovation_sync: {
      status: 'warn',
      score: 58,
      label: '创新缺口 2',
      missed_count: 2,
      planned: [
        { key: 'chapter_angle', label: '创新角度', text: '规则边界反噬' },
        { key: 'ip_adaptation_hooks', label: 'IP化场面', text: '玻璃门内外对峙' },
      ],
      delivered: [],
      missed: [
        { key: 'chapter_angle', label: '创新角度', text: '规则边界反噬' },
        { key: 'ip_adaptation_hooks', label: 'IP化场面', text: '玻璃门内外对峙' },
      ],
    },
    ...overrides.payload,
  }

  return {
    id: overrides.id || 951,
    review_type: 'innovation_sync',
    status: overrides.status || 'warn',
    summary: overrides.summary || '创新执行缺口 2 项。',
    created_at: overrides.created_at || '2026-05-24T01:15:00.000Z',
    payload: JSON.stringify(payload),
    ...overrides.record,
  }
}

function signatureSceneSyncReview(overrides: Record<string, any> = {}) {
  const payload = {
    chapter_id: 101,
    chapter_no: 1,
    signature_scene_sync: {
      status: 'warn',
      score: 50,
      label: '强场面漏写 2',
      missed_count: 2,
      planned: [
        { key: 'signature_scene', label: '标志性场面', text: '玻璃门内外黑影贴着判定边界移动' },
        { key: 'reader_payoff', label: '读者回报', text: '超人蛮力被规则反噬后由张智反杀诱饵' },
      ],
      delivered: [],
      missed: [
        { key: 'signature_scene', label: '标志性场面', text: '玻璃门内外黑影贴着判定边界移动' },
        { key: 'reader_payoff', label: '读者回报', text: '超人蛮力被规则反噬后由张智反杀诱饵' },
      ],
    },
    ...overrides.payload,
  }

  return {
    id: overrides.id || 955,
    review_type: 'signature_scene_sync',
    status: overrides.status || 'warn',
    summary: overrides.summary || '强场面补位漏兑现 2 项。',
    created_at: overrides.created_at || '2026-05-24T01:16:00.000Z',
    payload: JSON.stringify(payload),
    ...overrides.record,
  }
}

function volumeBeatSyncReview(overrides: Record<string, any> = {}) {
  const payload = {
    chapter_id: 101,
    chapter_no: 1,
    volume_beat_sync: {
      status: 'warn',
      score: 52,
      label: '爆点漏兑现 2',
      missed_count: 2,
      planned: [
        { key: 'current_chapter_role', label: '本章爆点职责', text: '完成卷中高潮：王府钟声反转' },
        { key: 'turning_point_1', label: '转折点', text: '带血腰牌证明边军危机是真的' },
      ],
      delivered: [],
      missed: [
        { key: 'current_chapter_role', label: '本章爆点职责', text: '完成卷中高潮：王府钟声反转' },
        { key: 'turning_point_1', label: '转折点', text: '带血腰牌证明边军危机是真的' },
      ],
    },
    ...overrides.payload,
  }

  return {
    id: overrides.id || 981,
    review_type: 'volume_beat_sync',
    status: overrides.status || 'warn',
    summary: overrides.summary || '卷级爆点漏兑现 2 项。',
    created_at: overrides.created_at || '2026-05-24T01:18:00.000Z',
    payload: JSON.stringify(payload),
    ...overrides.record,
  }
}

function first30RetentionReview(overrides: Record<string, any> = {}) {
  const report = {
    score: 76,
    status: 'needs_repair',
    summary: '前30章有商业化雏形，但关键留存点需要补强。',
    chapter_cards: [
      { chapter_id: 101, chapter_no: 1, title: '断臂归来', score: 61, flags: ['章末钩子弱'] },
    ],
    ...overrides.report,
  }
  return {
    id: overrides.id || 1001,
    review_type: 'first30_retention_diagnosis',
    status: overrides.status || 'warn',
    summary: overrides.summary || '前30章留存诊断：76 分',
    created_at: overrides.created_at || '2026-05-24T00:05:00.000Z',
    payload: JSON.stringify({ report }),
    ...overrides.record,
  }
}

function deliveryRiskConvergenceReview(overrides: Record<string, any> = {}) {
  const payload = {
    chapter_id: 101,
    chapter_no: 1,
    delivery_risk_convergence: {
      status: 'improved',
      label: '风险收敛 3',
      resolved_count: 3,
      residual_count: 2,
      next_actions: ['继续处理残留风险：补追读：漏追读 1；补回报：回报欠账 1'],
    },
    ...overrides.payload,
  }

  return {
    id: overrides.id || 701,
    review_type: 'delivery_risk_convergence',
    status: overrides.status || 'ok',
    summary: overrides.summary || '风险收敛 3，仍有 2 项残留。',
    created_at: overrides.created_at || '2026-05-24T00:50:00.000Z',
    payload: JSON.stringify(payload),
    ...overrides.record,
  }
}

function governanceRecheckSyncReview(overrides: Record<string, any> = {}) {
  const payload = {
    chapter_id: 101,
    chapter_no: 1,
    governance_recheck_sync: {
      status: 'warn',
      label: '恢复依据缺口 2',
      missed_count: 2,
      failed_evidence: ['第42章对白交锋已补回样章节奏'],
      watch_items: ['下一章继续观察样章策略命中率'],
      summary: '单章交稿未继承治理复查记忆。',
    },
    ...overrides.payload,
  }

  return {
    id: overrides.id || 991,
    review_type: 'governance_recheck_sync',
    status: overrides.status || 'warn',
    summary: overrides.summary || '治理复查记忆漏承接 2 项。',
    created_at: overrides.created_at || '2026-05-24T01:19:00.000Z',
    payload: JSON.stringify(payload),
    ...overrides.record,
  }
}

describe('buildWritingCockpitModel', () => {
  test('ready project data chooses the first planned unwritten chapter as daily target', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      materialScore: { score: 82, can_generate: true },
      activeRuns: [],
    })

    expect(model.nextChapter?.chapterNo).toBe(2)
    expect(model.nextChapter?.goal).toBe('用一口警钟把边军危机压到王府筵席上')
    expect(model.nextChapter?.previousEnding).toBe('城外烽烟未熄，王府内钟声先乱')
    expect(model.nextChapter?.whyItMatters).toContain('让谢怀安在镜州立住武夫根基并摸清王府人心')
    expect(model.previousChapter?.chapterNo).toBe(1)
    expect(model.primaryActionKey).toBe('write_draft')
    expect(model.topStatus.primaryActionKey).toBe('write_draft')
    expect(model.recommendedRole).toBe('draft_writer')
    expect(model.modelTeam.recommendedRole).toBe('draft_writer')
    expect(model.blockers).toEqual([])
    expect(model.readiness.blockers).toEqual([])
    expect(model.nextChapter?.mustAdvance).toContain('迟正确认王府人心')
    expect(model.nextChapter?.forbiddenRepeats).toContain('不要重复解释穿越设定')
  })

  test('missing writing bible blocks draft generation', () => {
    const model = buildWritingCockpitModel({
      selectedProject: { title: '大益武夫', reference_config: { story_state: { last_updated_chapter: 1 } } },
      outlines,
      chapters,
      materialScore: { score: 82, can_generate: true },
      runs: [],
    })

    expect(model.readiness.blockers.map(check => check.key)).toContain('writing_bible_missing')
    expect(model.primaryActionKey).toBe('open_writing_bible')
    expect(model.topStatus.primaryActionKey).toBe('open_writing_bible')
    expect(model.recommendedRole).toBe('chief_editor')
    expect(model.modelTeam.recommendedRole).toBe('chief_editor')
  })

  test('material score not ready blocks generation', () => {
    const model = buildWritingCockpitModel({
      selectedProject: project,
      outlines,
      chapters,
      commercialReadiness: { score: 52, can_generate: false },
      runs: [],
    })

    expect(model.readiness.blockers.map(check => check.key)).toContain('materials_not_ready')
    expect(model.primaryActionKey).toBe('repair_materials')
    expect(model.topStatus.primaryActionKey).toBe('repair_materials')
    expect(model.recommendedRole).toBe('episode_planner')
    expect(model.modelTeam.recommendedRole).toBe('episode_planner')
  })

  test('an active chapter that already has prose selects revision', () => {
    const model = buildWritingCockpitModel({
      selectedProject: project,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      runs: [],
    })

    expect(model.nextChapter?.chapterNo).toBe(1)
    expect(model.draftPipeline.state).toBe('draft_generated')
    expect(model.recommendedRole).toBe('revision_editor')
    expect(model.modelTeam.recommendedRole).toBe('revision_editor')
    expect(model.chapterAcceptanceDesk.visible).toBe(true)
    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_quality_check')
    expect(model.primaryActionKey).toBe('refresh_current_quality')
    expect(model.topStatus.primaryActionKey).toBe('refresh_current_quality')
  })

  test('ready delivered chapter exposes a handoff into the next chapter', () => {
    const model = buildWritingCockpitModel({
      selectedProject: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        readerExpectationSyncReview(),
        storylineSyncReview({
          payload: {
            storyline_sync: {
              status: 'ok',
              completed: [{ name: '夺回镜州主线' }],
              missed: [],
              unplanned: [],
              forbidden_touched: [],
            },
          },
        }),
      ],
    })

    expect(model.chapterHandoffDesk.visible).toBe(true)
    expect(model.chapterHandoffDesk.status).toBe('ready')
    expect(model.chapterHandoffDesk.label).toBe('可接下一章')
    expect(model.chapterHandoffDesk.fromChapterNo).toBe(1)
    expect(model.chapterHandoffDesk.toChapterNo).toBe(2)
    expect(model.chapterHandoffDesk.previousEnding).toBe('城外烽烟未熄，王府内钟声先乱')
    expect(model.chapterHandoffDesk.expectationCarryOver).toContain('纸条是谁塞进来的')
    expect(model.chapterHandoffDesk.nextOpeningObligations).toContain('幕后敲门者是谁')
    expect(model.chapterHandoffDesk.storyStateSynced).toBe(true)
    expect(model.chapterHandoffDesk.actionKey).toBe('accept_chapter_and_continue')
    expect(model.chapterHandoffDesk.actionLabel).toBe('进入下一章开写')
  })

  test('chapter handoff carries unresolved delivery risks into the next chapter warning', () => {
    const model = buildWritingCockpitModel({
      selectedProject: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        chapterAttractionReview(),
        innovationSyncReview(),
      ],
    })

    expect(model.chapterHandoffDesk.visible).toBe(true)
    expect(model.chapterHandoffDesk.status).toBe('ready')
    expect(model.chapterHandoffDesk.deliveryRiskCarryOver?.label).toBe('待修复 5')
    expect(model.chapterHandoffDesk.deliveryRiskCarryOver?.priorityLabel).toBe('优先修章末翻页')
    expect(model.chapterHandoffDesk.deliveryRiskCarryOver?.items).toContain('修吸引力：吸引力缺口 3')
    expect(model.chapterHandoffDesk.deliveryRiskCarryOver?.items).toContain('补创新：创新缺口 2')
  })

  test('handoff asks to finish delivery before moving to the next chapter', () => {
    const model = buildWritingCockpitModel({
      selectedProject: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [],
    })

    expect(model.chapterHandoffDesk.visible).toBe(true)
    expect(model.chapterHandoffDesk.status).toBe('needs_delivery')
    expect(model.chapterHandoffDesk.label).toBe('先完成交稿')
    expect(model.chapterHandoffDesk.fromChapterNo).toBe(1)
    expect(model.chapterHandoffDesk.toChapterNo).toBe(2)
    expect(model.chapterHandoffDesk.previousEnding).toBe('城外烽烟未熄，王府内钟声先乱')
    expect(model.chapterHandoffDesk.expectationCarryOver).toEqual([])
    expect(model.chapterHandoffDesk.actionKey).toBe('refresh_current_quality')
    expect(model.chapterHandoffDesk.actionLabel).toBe('先完成交稿')
  })

  test('no chapter starts with planning', () => {
    const model = buildWritingCockpitModel({
      selectedProject: project,
      outlines,
      chapters: [],
      materialScore: { score: 82, can_generate: true },
      runs: [],
    })

    expect(model.nextChapter).toBeNull()
    expect(model.primaryActionKey).toBe('open_outline_panel')
    expect(model.topStatus.primaryActionKey).toBe('open_outline_panel')
    expect(model.readiness.blockers.map(check => check.key)).toContain('chapter_missing')
  })

  test('sparse chapter with valid chapter outline hydrates plan fields and allows draft writing', () => {
    const sparseChapter = {
      id: 103,
      chapter_no: 3,
      title: '夜审旧账',
      chapter_text: '',
    }
    const chapterOutlines = [
      ...outlines,
      {
        id: 3,
        title: '第3章 夜审旧账',
        outline_type: 'chapter',
        raw_payload: {
          future100: {
            chapter_no: 3,
            chapter_goal: '逼王府账房交出军饷流向',
            conflict: '账房以太妃手令拖延，谢怀安以军法逼供',
            ending_hook: '账册夹层露出京城密印',
          },
        },
      },
    ]

    const model = buildWritingCockpitModel({
      project,
      outlines: chapterOutlines,
      chapters: [chapters[0], sparseChapter],
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.nextChapter?.chapterNo).toBe(3)
    expect(model.nextChapter?.goal).toBe('逼王府账房交出军饷流向')
    expect(model.nextChapter?.conflict).toBe('账房以太妃手令拖延，谢怀安以军法逼供')
    expect(model.nextChapter?.endingHook).toBe('账册夹层露出京城密印')
    expect(model.readiness.blockers).toEqual([])
    expect(model.primaryActionKey).toBe('write_draft')
    expect(model.recommendedRole).toBe('draft_writer')
  })

  test('writing queue shows rolling-plan chapter placeholders from the current target onward', () => {
    const rollingChapters = [
      ...chapters,
      {
        id: 103,
        chapter_no: 3,
        title: '夜审旧账',
        chapter_text: '',
        raw_payload: {
          source: 'rolling_plan',
          rollingPlan: {
            chapter_no: 3,
            chapter_goal: '逼王府账房交出军饷流向',
            conflict: '账房以太妃手令拖延，谢怀安以军法逼供',
            ending_hook: '账册夹层露出京城密印',
          },
        },
      },
      {
        id: 104,
        chapter_no: 4,
        title: '空钟回响',
        chapter_text: '',
        raw_payload: {
          source: 'rolling_plan',
          rollingPlan: {
            chapter_no: 4,
            chapter_goal: '让警钟余波扩散到边军',
          },
        },
      },
      {
        id: 105,
        chapter_no: 5,
        title: '暗门听雨',
        chapter_text: '',
        raw_payload: {
          source: 'rolling_plan',
          rollingPlan: {
            chapter_no: 5,
            ending_hook: '雨声里传来第二口钟',
          },
        },
      },
    ]

    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: rollingChapters,
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.writingQueue.items.map(item => item.chapterNo)).toEqual([2, 3, 4, 5])
    expect(model.writingQueue.readyCount).toBe(2)
    expect(model.writingQueue.blockedCount).toBe(2)
    expect(model.writingQueue.items[1]).toMatchObject({
      chapterNo: 3,
      title: '夜审旧账',
      sourceLabel: '滚动规划',
      status: 'ready_to_draft',
      statusLabel: '可开写',
      actionLabel: '开写',
      actionHint: '进入本章任务书、场景卡和正文生成。',
      goal: '逼王府账房交出军饷流向',
      endingHook: '账册夹层露出京城密印',
    })
    expect(model.writingQueue.items[2]).toMatchObject({
      id: 104,
      chapterNo: 4,
      status: 'needs_plan',
      statusLabel: '缺计划',
      actionLabel: '补计划',
      actionHint: '先补核心冲突、章末钩子。',
      sourceLabel: '滚动规划',
      missingPlanFields: ['conflict', 'ending_hook'],
      missingPlanLabels: ['核心冲突', '章末钩子'],
      repairIntent: {
        source: 'writing_queue_plan_repair',
        chapter_id: 104,
        chapter_no: 4,
        missing_fields: ['conflict', 'ending_hook'],
        missing_labels: ['核心冲突', '章末钩子'],
      },
    })
    expect(model.writingQueue.planRepair).toMatchObject({
      visible: true,
      label: '补齐队列计划',
      chapterCount: 2,
      missingCount: 4,
      chapterNos: [4, 5],
      intent: {
        source: 'writing_queue_batch_plan_repair',
        chapter_nos: [4, 5],
      },
    })
    expect(model.writingQueue.items[0]).toMatchObject({
      status: 'ready_to_draft',
      actionLabel: '开写',
    })
  })

  test('sparse chapter with invalid chapter outline blocks scene planning', () => {
    const sparseChapter = {
      id: 104,
      chapter_no: 4,
      title: '空钟回响',
      chapter_text: '',
    }
    const invalidOutlines = [
      ...outlines,
      {
        id: 4,
        title: '第4章 空钟回响',
        outline_level: 'chapter',
        raw_payload: {
          skeleton: {
            chapter_no: 4,
            chapter_goal: '让警钟余波扩散到边军',
          },
        },
      },
    ]

    const model = buildWritingCockpitModel({
      project,
      outlines: invalidOutlines,
      chapters: [chapters[0], sparseChapter],
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.nextChapter?.chapterNo).toBe(4)
    expect(model.readiness.blockers.map(check => check.key)).toContain('chapter_outline_missing')
    expect(model.primaryActionKey).toBe('build_scene_plan')
    expect(model.recommendedRole).toBe('episode_planner')
  })

  test('stale story state recommends canon update when draft blockers are clear', () => {
    const staleProject = {
      ...project,
      reference_config: {
        ...project.reference_config,
        story_state: {
          ...project.reference_config.story_state,
          last_updated_chapter: 0,
        },
      },
    }

    const model = buildWritingCockpitModel({
      project: staleProject,
      outlines,
      chapters,
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.nextChapter?.chapterNo).toBe(2)
    expect(model.readiness.blockers).toEqual([])
    expect(model.readiness.warnings.map(check => check.key)).toContain('story_state_stale')
    expect(model.primaryActionKey).toBe('update_canon')
    expect(model.topStatus.primaryActionKey).toBe('update_canon')
    expect(model.recommendedRole).toBe('continuity_auditor')
    expect(model.modelTeam.recommendedRole).toBe('continuity_auditor')
  })

  test('stale story state on active prose chapter still requires quality check first', () => {
    const staleProject = {
      ...project,
      reference_config: {
        ...project.reference_config,
        story_state: {
          ...project.reference_config.story_state,
          last_updated_chapter: 0,
        },
      },
    }

    const model = buildWritingCockpitModel({
      project: staleProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.nextChapter?.chapterNo).toBe(1)
    expect(model.draftPipeline.state).toBe('draft_generated')
    expect(model.readiness.blockers).toEqual([])
    expect(model.readiness.warnings.map(check => check.key)).toContain('story_state_stale')
    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_quality_check')
    expect(model.primaryActionKey).toBe('refresh_current_quality')
    expect(model.recommendedRole).toBe('revision_editor')
  })

  test('sparse chapter with outline_id matching a valid manual outline hydrates plan fields', () => {
    const sparseChapter = {
      id: 105,
      outline_id: 805,
      chapter_no: 5,
      title: '密印归案',
      chapter_text: '',
    }
    const manualOutlines = [
      ...outlines,
      {
        id: 805,
        title: '密印归案',
        outline_level: 'chapter',
        summary: '让谢怀安把账册密印和军饷案扣回王府主线',
        conflict_points: ['太妃近侍试图销毁账册夹层'],
        hook: '密印背面出现京中旧臣的私记',
      },
    ]

    const model = buildWritingCockpitModel({
      project,
      outlines: manualOutlines,
      chapters: [chapters[0], sparseChapter],
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.nextChapter?.chapterNo).toBe(5)
    expect(model.nextChapter?.goal).toBe('让谢怀安把账册密印和军饷案扣回王府主线')
    expect(model.nextChapter?.conflict).toBe('太妃近侍试图销毁账册夹层')
    expect(model.nextChapter?.endingHook).toBe('密印背面出现京中旧臣的私记')
    expect(model.readiness.blockers).toEqual([])
    expect(model.primaryActionKey).toBe('write_draft')
  })

  test('sparse chapter with manual outline title chapter number hydrates plan fields', () => {
    const sparseChapter = {
      id: 106,
      chapter_no: 6,
      title: '霜夜点将',
      chapter_text: '',
    }
    const manualOutlines = [
      ...outlines,
      {
        id: 806,
        title: '第6章 霜夜点将',
        outline_type: 'chapter',
        summary: '让谢怀安在霜夜点出第一批可信边军',
        conflict_points: ['老校尉怀疑谢怀安断臂后已无统军之力'],
        hook: '点将名册最后一页被人提前撕走',
      },
    ]

    const model = buildWritingCockpitModel({
      project,
      outlines: manualOutlines,
      chapters: [chapters[0], sparseChapter],
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.nextChapter?.chapterNo).toBe(6)
    expect(model.nextChapter?.goal).toBe('让谢怀安在霜夜点出第一批可信边军')
    expect(model.nextChapter?.conflict).toBe('老校尉怀疑谢怀安断臂后已无统军之力')
    expect(model.nextChapter?.endingHook).toBe('点将名册最后一页被人提前撕走')
    expect(model.readiness.blockers).toEqual([])
    expect(model.primaryActionKey).toBe('write_draft')
  })

  test('planning desk shows empty state without an active chapter', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [],
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.readiness).toBe('blocked')
    expect(model.chapterPlanningDesk.statusLabel).toBe('缺目标章节')
    expect(model.chapterPlanningDesk.shouldAutoExpandPlanner).toBe(true)
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('open_outline_panel')
  })

  test('planning desk requires context package before scene planning', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[1],
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.readiness).toBe('needs_context')
    expect(model.chapterPlanningDesk.contextPackageStatus).toBe('missing')
    expect(model.chapterPlanningDesk.shouldAutoExpandPlanner).toBe(true)
    expect(model.chapterPlanningDesk.reasons).toContain('本章还没有加载上下文包。')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('refresh_context_package')
  })

  test('planning desk treats failed context preflight as insufficient context', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[1],
      contextPackage: {
        ...contextPackage,
        preflight: {
          ready: false,
          blockers: ['缺少章节目标'],
        },
      },
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.readiness).toBe('needs_context')
    expect(model.chapterPlanningDesk.contextPackageStatus).toBe('insufficient')
    expect(model.chapterPlanningDesk.reasons).toContain('上下文包预检未通过：缺少章节目标')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('open_generation_diagnostics')
  })

  test('planning desk asks for scene cards when context is ready but scene plan is missing', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[1],
      contextPackage,
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.readiness).toBe('needs_scene_plan')
    expect(model.chapterPlanningDesk.contextPackageStatus).toBe('ready')
    expect(model.chapterPlanningDesk.scenePlanStatus).toBe('missing')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('build_scene_plan')
  })

  test('planning desk reads backend-style context target aliases', () => {
    const backendContextPackage = {
      chapter_target: {
        goal: '把警钟危机转成谢怀安的第一次主动试探',
        conflict: '王府管事要压警讯，谢怀安要逼众人表态',
        ending_hook: '带血腰牌递到谢怀安掌心',
        core_contract_radar: {
          summary: '本章必须服务失势皇子夺回镜州主动权。',
          must_serve: ['失势皇子以武道和权谋守住镜州', '边军危机压入王府权斗'],
          no_drift: ['不能把主线写成纯宅斗'],
          repair_focus: ['补足谢怀安主动选择和代价'],
        },
        reader_drop_risk_brief: {
          status: 'needs_repair',
          drop_points: ['第2章中段解释王府派系过密，试读用户可能弃读。'],
          opening_guardrail: '开篇 300 字先接住警钟压席。',
          middle_guardrail: '中段用当众验腰牌推进，不堆派系解释。',
          ending_guardrail: '章末留下带血腰牌背后的旧臣身份问题。',
        },
        story_pressure_brief: {
          status: 'needs_attention',
          pressure_sources: ['王府管事压席', '边军警钟逼近'],
          conflict_escalation_guardrail: '中段必须让压席变成公开站队。',
          stakes_growth_guardrail: '赌注要落到谢怀安是否失去王府号令权。',
          reversal_pressure_guardrail: '章末用带血腰牌反转局势。',
          required_actions: ['把压力源、赌注升级和反转逼迫写成可见行动。'],
        },
        story_drive_brief: {
          protagonist_choice: '谢怀安当众选择撕开王府管事的遮掩。',
          choice_cost: '暴露自己仍能调动旧部，招来王府内线反扑。',
          state_change: '谢怀安从被动受宴转为公开夺回审判主动权。',
          obstacle: '王府管事压下警讯并逼众人表态。',
          causal_next_step: '带血腰牌把旧臣身份问题推到下一章。',
        },
        serial_rhythm_brief: {
          status: 'ready',
          opening_hook_deadline: '前 300 字必须接住警钟压席。',
          payoff_interval: '每 800-1200 字至少给一次信息增量或局势反转。',
          middle_guardrail: '中段不能堆王府派系解释，要用验腰牌逼站队。',
          ending_hook_guardrail: '最后一幕压到带血腰牌背后的旧臣身份。',
          scene_payoff_budget: [
            {
              scene_no: 1,
              title: '警钟压席',
              word_budget: '900 字',
              required_payoff: '众人第一次看见谢怀安还能控场。',
              turn: '太妃沉默等于放任管事试探。',
            },
          ],
          anti_drag_rules: ['连续两段必须出现行动、信息或关系变化。'],
        },
        page_turn_hook_brief: {
          hook_type: '身份反转',
          core_question: '带血腰牌背后的旧臣到底站哪边。',
          visible_trigger: '守将把带血腰牌递到谢怀安掌心。',
          withheld_answer: '旧臣身份和真实站队不能在本章解释完。',
          next_chapter_pull: '下一章逼谢怀安审问守将并判断旧臣是否可信。',
          final_image: '谢怀安掌心压着带血腰牌，钟声在府门外停住。',
          forbidden_resolution: ['不得在本章解释完整答案。'],
        },
        volume_climax_brief: {
          status: 'needs_attention',
          current_volume_title: '第一卷 镜州风雷',
          chapter_range: '第1-60章',
          current_chapter_role: '完成卷中小高潮：谢怀安第一次公开夺回王府审判主动权。',
          volume_goal: '让谢怀安在镜州立住武夫根基并摸清王府人心。',
          climax_promise: '用带血腰牌和公开站队给读者阶段性回报。',
          required_beats: ['王府管事当众失势', '旧部第一次表态'],
          forbidden_payoff: ['不得提前解决京城幕后黑手', '不得提前消费卷末军权爆点'],
          nearby_beats: [
            { chapter_no: 2, type: '小高潮', label: '王府审判夺权', detail: '谢怀安用警钟和腰牌逼王府站队。' },
          ],
        },
      },
      preflight: { ready: true, blockers: [] },
    }

    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], sceneCardChapter],
      activeChapter: sceneCardChapter,
      contextPackage: backendContextPackage,
      diagnostics: { preflight: { ready: true, blockers: [] }, material_score: { score: 88, can_generate: true } },
      materialScore: { score: 88, can_generate: true },
    })

    expect(model.chapterPlanningDesk.contextPackageStatus).toBe('ready')
    expect(model.chapterPlanningDesk.episodePlan.chapterObjective).toBe('把警钟危机转成谢怀安的第一次主动试探')
    expect(model.chapterPlanningDesk.episodePlan.coreConflict).toBe('王府管事要压警讯，谢怀安要逼众人表态')
    expect(model.chapterPlanningDesk.episodePlan.coreContract.summary).toContain('夺回镜州主动权')
    expect(model.chapterPlanningDesk.episodePlan.coreContract.mustServe).toContain('失势皇子以武道和权谋守住镜州')
    expect(model.chapterPlanningDesk.episodePlan.coreContract.noDrift).toContain('不能把主线写成纯宅斗')
    expect(model.chapterPlanningDesk.episodePlan.coreContract.repairFocus).toContain('补足谢怀安主动选择和代价')
    expect(model.chapterPlanningDesk.episodePlan.readerDropRisk.dropPoints[0]).toContain('试读用户可能弃读')
    expect(model.chapterPlanningDesk.episodePlan.readerDropRisk.openingGuardrail).toContain('开篇 300 字')
    expect(model.chapterPlanningDesk.episodePlan.readerDropRisk.middleGuardrail).toContain('不堆派系解释')
    expect(model.chapterPlanningDesk.episodePlan.readerDropRisk.endingGuardrail).toContain('旧臣身份问题')
    expect(model.chapterPlanningDesk.episodePlan.storyPressure.pressureSources).toContain('王府管事压席')
    expect(model.chapterPlanningDesk.episodePlan.storyPressure.conflictEscalationGuardrail).toContain('公开站队')
    expect(model.chapterPlanningDesk.episodePlan.storyPressure.stakesGrowthGuardrail).toContain('王府号令权')
    expect(model.chapterPlanningDesk.episodePlan.storyPressure.reversalPressureGuardrail).toContain('带血腰牌')
    expect(model.chapterPlanningDesk.episodePlan.storyDrive.protagonistChoice).toContain('当众选择')
    expect(model.chapterPlanningDesk.episodePlan.storyDrive.choiceCost).toContain('旧部')
    expect(model.chapterPlanningDesk.episodePlan.storyDrive.stateChange).toContain('主动权')
    expect(model.chapterPlanningDesk.episodePlan.storyDrive.causalNextStep).toContain('旧臣身份')
    expect(model.chapterPlanningDesk.episodePlan.serialRhythm.openingHookDeadline).toContain('前 300 字')
    expect(model.chapterPlanningDesk.episodePlan.serialRhythm.payoffInterval).toContain('800-1200')
    expect(model.chapterPlanningDesk.episodePlan.serialRhythm.middleGuardrail).toContain('验腰牌')
    expect(model.chapterPlanningDesk.episodePlan.serialRhythm.endingHookGuardrail).toContain('旧臣身份')
    expect(model.chapterPlanningDesk.episodePlan.serialRhythm.scenePayoffBudget[0].requiredPayoff).toContain('控场')
    expect(model.chapterPlanningDesk.episodePlan.serialRhythm.antiDragRules[0]).toContain('连续两段')
    expect(model.chapterPlanningDesk.episodePlan.pageTurnHook.coreQuestion).toContain('旧臣')
    expect(model.chapterPlanningDesk.episodePlan.pageTurnHook.visibleTrigger).toContain('带血腰牌')
    expect(model.chapterPlanningDesk.episodePlan.pageTurnHook.nextChapterPull).toContain('审问守将')
    expect(model.chapterPlanningDesk.episodePlan.pageTurnHook.forbiddenResolution[0]).toContain('不得在本章解释')
    expect(model.chapterPlanningDesk.episodePlan.volumeClimax.currentChapterRole).toContain('公开夺回')
    expect(model.chapterPlanningDesk.episodePlan.volumeClimax.volumeGoal).toContain('镜州')
    expect(model.chapterPlanningDesk.episodePlan.volumeClimax.climaxPromise).toContain('阶段性回报')
    expect(model.chapterPlanningDesk.episodePlan.volumeClimax.forbiddenPayoff[0]).toContain('京城幕后黑手')
    expect(model.chapterPlanningDesk.episodePlan.volumeClimax.nearbyBeats[0].label).toContain('王府审判夺权')
  })

  test('planning desk turns delivery risk carry-over into next chapter writing actions', () => {
    const backendContextPackage = {
      chapter_target: {
        goal: '把上一章缺失的吸引力和创新补进规则边界试探',
        conflict: '李超想硬闯，张智要用规则反制黑影',
        ending_hook: '门外校服男生说出李超车祸前最后一句话',
        delivery_risk_carry_over: {
          label: '待修复 5',
          priority_label: '优先修章末翻页',
          items: ['修吸引力：吸引力缺口 3', '补创新：创新缺口 2'],
          required_actions: ['前 300 字先兑现门外黑影压迫', '中段用规则边界反制黑影', '章末必须留下身份反转问题'],
        },
      },
      preflight: { ready: true, blockers: [] },
    }

    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], sceneCardChapter],
      activeChapter: sceneCardChapter,
      contextPackage: backendContextPackage,
      diagnostics: { preflight: { ready: true, blockers: [] }, material_score: { score: 88, can_generate: true } },
      materialScore: { score: 88, can_generate: true },
    })

    expect(model.chapterPlanningDesk.episodePlan.deliveryRiskCarryOver.label).toBe('待修复 5')
    expect(model.chapterPlanningDesk.episodePlan.deliveryRiskCarryOver.priorityLabel).toBe('优先修章末翻页')
    expect(model.chapterPlanningDesk.episodePlan.deliveryRiskCarryOver.items).toContain('修吸引力：吸引力缺口 3')
    expect(model.chapterPlanningDesk.episodePlan.deliveryRiskCarryOver.items).toContain('补创新：创新缺口 2')
    expect(model.chapterPlanningDesk.episodePlan.deliveryRiskCarryOver.requiredActions).toContain('前 300 字先兑现门外黑影压迫')
    expect(model.chapterPlanningDesk.episodePlan.deliveryRiskCarryOver.openingActions).toContain('前 300 字先兑现门外黑影压迫')
    expect(model.chapterPlanningDesk.episodePlan.deliveryRiskCarryOver.middleActions).toContain('中段用规则边界反制黑影')
    expect(model.chapterPlanningDesk.episodePlan.deliveryRiskCarryOver.endingActions).toContain('章末必须留下身份反转问题')
  })

  test('planning desk uses backend summary as context objective fallback', () => {
    const backendContextPackage = {
      chapter_target: {
        summary: '用警钟余波逼王府众人重新站队',
        conflict: '王府管事要压警讯，谢怀安要逼众人表态',
        ending_hook: '带血腰牌递到谢怀安掌心',
      },
      preflight: { ready: true, blockers: [] },
    }

    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], sceneCardChapter],
      activeChapter: sceneCardChapter,
      contextPackage: backendContextPackage,
      diagnostics: { preflight: { ready: true, blockers: [] }, material_score: { score: 88, can_generate: true } },
      materialScore: { score: 88, can_generate: true },
    })

    expect(model.chapterPlanningDesk.contextPackageStatus).toBe('ready')
    expect(model.chapterPlanningDesk.episodePlan.chapterObjective).toBe('用警钟余波逼王府众人重新站队')
  })

  test('planning desk does not treat empty scene cards as ready', () => {
    const emptySceneCardChapter = {
      ...chapters[1],
      scene_list: [{}],
    }

    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], emptySceneCardChapter],
      activeChapter: emptySceneCardChapter,
      contextPackage,
      diagnostics: { preflight: { ready: true, blockers: [] }, material_score: { score: 88, can_generate: true } },
      materialScore: { score: 88, can_generate: true },
    })

    expect(model.chapterPlanningDesk.scenePlanStatus).toBe('missing')
    expect(model.chapterPlanningDesk.sceneCards).toEqual([])
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('build_scene_plan')
  })

  test('planning desk blocks drafting when diagnostics report blockers', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], sceneCardChapter],
      activeChapter: sceneCardChapter,
      contextPackage,
      diagnostics: {
        preflight: {
          ready: false,
          blockers: ['缺少上一章承接'],
        },
        material_score: { score: 88, can_generate: true },
      },
      materialScore: { score: 88, can_generate: true },
    })

    expect(model.chapterPlanningDesk.readiness).toBe('blocked')
    expect(model.chapterPlanningDesk.reasons).toContain('生成诊断阻塞：缺少上一章承接')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('open_generation_diagnostics')
    expect(model.chapterPlanningDesk.shouldAutoExpandPlanner).toBe(true)
  })

  test('planning desk is ready when context and scene cards are usable', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], sceneCardChapter],
      activeChapter: sceneCardChapter,
      contextPackage,
      diagnostics: {
        preflight: { ready: true, blockers: [] },
        material_score: { score: 88, can_generate: true },
      },
      materialScore: { score: 88, can_generate: true },
    })

    expect(model.chapterPlanningDesk.readiness).toBe('ready')
    expect(model.chapterPlanningDesk.statusLabel).toBe('本章可写')
    expect(model.chapterPlanningDesk.shouldAutoExpandPlanner).toBe(false)
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('confirm_plan_and_write_draft')
    expect(model.chapterPlanningDesk.episodePlan.chapterObjective).toBe('用警钟把边军危机压到王府筵席上')
    expect(model.chapterPlanningDesk.sceneCards).toHaveLength(1)
    expect(model.chapterPlanningDesk.sceneCards[0].sceneNo).toBe(1)
    expect(model.chapterPlanningDesk.sceneCards[0].endingHook).toBe('第三声钟响后，守将闯入')
  })

  test('planning desk routes ready prose chapter to review instead of draft generation', () => {
    const proseSceneChapter = {
      ...sceneCardChapter,
      chapter_text: '谢怀安听完第三声警钟，抬手让满堂噤声。'.repeat(30),
    }

    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [proseSceneChapter],
      activeChapter: proseSceneChapter,
      contextPackage,
      diagnostics: {
        preflight: { ready: true, blockers: [] },
        material_score: { score: 88, can_generate: true },
      },
      materialScore: { score: 88, can_generate: true },
    })

    expect(model.chapterPlanningDesk.readiness).toBe('ready')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('review_draft')
  })

  test('acceptance desk stays hidden for a chapter without prose', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[1],
      materialScore: { score: 82, can_generate: true },
      reviews: [],
    })

    expect(model.chapterAcceptanceDesk.visible).toBe(false)
    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('hidden')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('refresh_context_package')
  })

  test('prose chapter without a quality review needs quality check', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [],
    })

    expect(model.chapterAcceptanceDesk.visible).toBe(true)
    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_quality_check')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('refresh_current_quality')
    expect(model.primaryActionKey).toBe('refresh_current_quality')
    expect(model.topStatus.primaryActionKey).toBe('refresh_current_quality')
  })

  test('malformed quality self-check cannot make synced prose ready to accept', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          payload: {
            self_check: {
              error: '模型自检失败',
              revised: false,
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_quality_check')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('refresh_current_quality')
    expect(model.primaryActionKey).toBe('refresh_current_quality')
    expect(model.topStatus.primaryActionKey).toBe('refresh_current_quality')
  })

  test('quality self-check with only empty issue arrays still needs quality check', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          payload: {
            self_check: {
              final_text: chapters[0].chapter_text,
              review: {
                issues: [],
                must_fix: [],
                optional_improvements: [],
                revision_directives: [],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_quality_check')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('refresh_current_quality')
    expect(model.primaryActionKey).toBe('refresh_current_quality')
    expect(model.topStatus.primaryActionKey).toBe('refresh_current_quality')
  })

  test('passing quality score without current prose freshness marker still needs quality check', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          payload: {
            self_check: {
              final_text: undefined,
              review: {
                score: 82,
                passed: true,
                status: 'pass',
                issues: [],
                must_fix: [],
                optional_improvements: [],
                revision_directives: [],
                needs_revision: false,
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_quality_check')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('refresh_current_quality')
    expect(model.primaryActionKey).toBe('refresh_current_quality')
    expect(model.topStatus.primaryActionKey).toBe('refresh_current_quality')
  })

  test('quality review with invalid payload is ignored even when top-level chapter id matches', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        {
          id: 202,
          review_type: 'prose_quality',
          status: 'ok',
          summary: 'This review should be ignored because payload is invalid JSON.',
          created_at: '2026-05-24T00:00:00.000Z',
          payload: '{invalid-json',
          chapter_id: 101,
        },
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_quality_check')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('refresh_current_quality')
    expect(model.primaryActionKey).toBe('refresh_current_quality')
  })

  test('low quality score requires an editor report before delivery', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          payload: {
            self_check: {
              review: {
                score: 72,
                passed: false,
                status: 'fail',
                issues: [{ severity: 'medium', message: '中段拖沓' }],
                must_fix: [],
                optional_improvements: ['压缩中段解释'],
                revision_directives: ['压缩中段解释'],
                needs_revision: true,
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_revision')
    expect(model.chapterAcceptanceDesk.qualityScore).toBe(72)
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('create_editor_report')
  })

  test('readability review is summarized without blocking chapter acceptance', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        readabilityReview(),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.readabilityReview?.score).toBe(82)
    expect(model.chapterAcceptanceDesk.readabilityReview?.scoreLabel).toBe('可读性 82')
    expect(model.chapterAcceptanceDesk.readabilityReview?.memeLabel).toBe('网感轻度')
    expect(model.chapterAcceptanceDesk.readabilityReview?.riskLabel).toBe('出戏风险 1')
  })

  test('chapter attraction review is summarized as a repairable reader pull risk', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        chapterAttractionReview(),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.chapterAttraction?.score).toBe(62)
    expect(model.chapterAcceptanceDesk.chapterAttraction?.scoreLabel).toBe('吸引力 62')
    expect(model.chapterAcceptanceDesk.chapterAttraction?.label).toBe('吸引力缺口 3')
    expect(model.chapterAcceptanceDesk.chapterAttraction?.priorityLabel).toBe('优先修章末翻页')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('修吸引力：吸引力缺口 3')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先修章末翻页')
  })

  test('story drive sync is summarized as a protagonist choice and consequence risk', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        storyDriveSyncReview(),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.storyDriveSync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.storyDriveSync?.scoreLabel).toBe('故事力 60')
    expect(model.chapterAcceptanceDesk.storyDriveSync?.label).toBe('故事力缺口 3')
    expect(model.chapterAcceptanceDesk.storyDriveSync?.missedCount).toBe(3)
    expect(model.chapterAcceptanceDesk.storyDriveSync?.priorityLabel).toBe('优先补主角选择')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补故事力：故事力缺口 3')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补主角选择')
  })

  test('character arc sync is summarized as a growth and relationship risk', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        characterArcSyncReview(),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.characterArcSync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.characterArcSync?.scoreLabel).toBe('人物弧光 58')
    expect(model.chapterAcceptanceDesk.characterArcSync?.label).toBe('人物弧光缺口 3')
    expect(model.chapterAcceptanceDesk.characterArcSync?.missedCount).toBe(3)
    expect(model.chapterAcceptanceDesk.characterArcSync?.priorityLabel).toBe('优先补成长节点')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补人物弧光：人物弧光缺口 3')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补成长节点')
  })

  test('weak opening hook score is summarized as an opening pull repair risk', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        readabilityReview({
          payload: {
            readability_review: {
              readability_score: 84,
              opening_hook_score: 52,
              scene_readability_score: 82,
              meme_sense: { intensity: '轻度', immersion_risks: [] },
              issues: [],
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.readabilityReview?.openingHookScore).toBe(52)
    expect(model.chapterAcceptanceDesk.readabilityReview?.openingHookLabel).toBe('开篇吸引力 52')
    expect(model.chapterAcceptanceDesk.readabilityReview?.riskLabel).toBe('开篇吸引力弱 52')
    expect(model.chapterAcceptanceDesk.readabilityReview?.riskCount).toBe(1)
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('修开篇吸引力：开篇吸引力弱 52')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先修开篇')
  })

  test('weak ending hook score is summarized as a page-turn repair risk', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        readabilityReview({
          payload: {
            readability_review: {
              readability_score: 83,
              opening_hook_score: 82,
              ending_hook_score: 55,
              scene_readability_score: 80,
              meme_sense: { intensity: '轻度', immersion_risks: [] },
              issues: [],
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.readabilityReview?.endingHookScore).toBe(55)
    expect(model.chapterAcceptanceDesk.readabilityReview?.endingHookLabel).toBe('章末翻页 55')
    expect(model.chapterAcceptanceDesk.readabilityReview?.riskLabel).toBe('章末翻页弱 55')
    expect(model.chapterAcceptanceDesk.readabilityReview?.riskCount).toBe(1)
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('修章末翻页：章末翻页弱 55')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先修章末')
  })

  test('weak scene readability score is summarized as a scene progression repair risk', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        readabilityReview({
          payload: {
            readability_review: {
              readability_score: 82,
              opening_hook_score: 82,
              ending_hook_score: 82,
              scene_readability_score: 58,
              payoff_density_score: 80,
              meme_sense: { intensity: '轻度', immersion_risks: [] },
              issues: [],
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.readabilityReview?.sceneReadabilityScore).toBe(58)
    expect(model.chapterAcceptanceDesk.readabilityReview?.sceneReadabilityLabel).toBe('场景推进 58')
    expect(model.chapterAcceptanceDesk.readabilityReview?.riskLabel).toBe('场景推进弱 58')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('修场景推进：场景推进弱 58')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先修场景')
  })

  test('weak payoff density score is summarized as a payoff density repair risk', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        readabilityReview({
          payload: {
            readability_review: {
              readability_score: 82,
              opening_hook_score: 82,
              ending_hook_score: 82,
              scene_readability_score: 82,
              payoff_density_score: 56,
              meme_sense: { intensity: '轻度', immersion_risks: [] },
              issues: [],
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.readabilityReview?.payoffDensityScore).toBe(56)
    expect(model.chapterAcceptanceDesk.readabilityReview?.payoffDensityLabel).toBe('爽点密度 56')
    expect(model.chapterAcceptanceDesk.readabilityReview?.riskLabel).toBe('爽点密度弱 56')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补爽点密度：爽点密度弱 56')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补爽点')
  })

  test('reader retention sync is summarized without blocking chapter acceptance', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        readerRetentionSyncReview(),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.readerRetentionSync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.readerRetentionSync?.label).toBe('漏追读 2')
    expect(model.chapterAcceptanceDesk.readerRetentionSync?.scoreLabel).toBe('追读兑现 68')
    expect(model.chapterAcceptanceDesk.readerRetentionSync?.missedCount).toBe(2)
  })

  test('reader expectation sync is summarized and prioritized as a soft repair risk', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        readerExpectationSyncReview(),
        readerRetentionSyncReview(),
        readerPayoffSyncReview(),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.readerExpectationSync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.readerExpectationSync?.label).toBe('期待欠账 1')
    expect(model.chapterAcceptanceDesk.readerExpectationSync?.scoreLabel).toBe('期待兑现 70')
    expect(model.chapterAcceptanceDesk.readerExpectationSync?.missedCount).toBe(1)
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补期待：期待欠账 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).not.toContain('补追读：漏追读 2')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).not.toContain('补回报：回报欠账 2')
  })

  test('missed previous chapter handoff is summarized as an opening repair risk', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        readerExpectationSyncReview({
          payload: {
            reader_expectation_sync: {
              status: 'warn',
              score: 62,
              label: '期待欠账 1',
              missed_count: 1,
              planned: [{ key: 'opening_handoff', label: '上一章承接', text: '王府内钟声先乱' }],
              delivered: [],
              missed: [
                {
                  key: 'opening_handoff',
                  label: '上一章承接',
                  text: '上一章最后一幕：王府内钟声先乱',
                  match_scope: 'opening',
                },
              ],
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.readerExpectationSync?.label).toBe('开篇承接漏写 1')
    expect(model.chapterAcceptanceDesk.readerExpectationSync?.missedCount).toBe(1)
    expect(model.chapterAcceptanceDesk.readerExpectationSync?.openingHandoffMissedCount).toBe(1)
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('修开篇承接：开篇承接漏写 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先修开篇')
  })

  test('chapter benchmark sync is summarized and prioritized as a soft repair risk', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        chapterBenchmarkSyncReview(),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.chapterBenchmarkSync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.chapterBenchmarkSync?.label).toBe('基准缺口 2')
    expect(model.chapterAcceptanceDesk.chapterBenchmarkSync?.scoreLabel).toBe('质量基准 67')
    expect(model.chapterAcceptanceDesk.chapterBenchmarkSync?.missedCount).toBe(2)
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补基准：基准缺口 2')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('accept_chapter_and_continue')
  })

  test('style sample sync is summarized and prioritized as a soft repair risk', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        styleSampleSyncReview(),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.styleSampleSync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.styleSampleSync?.label).toBe('风格缺口 2')
    expect(model.chapterAcceptanceDesk.styleSampleSync?.scoreLabel).toBe('风格 61')
    expect(model.chapterAcceptanceDesk.styleSampleSync?.missedCount).toBe(2)
    expect(model.chapterAcceptanceDesk.styleSampleSync?.copyRiskCount).toBe(1)
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('校风格：风格缺口 2')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先校风格')
  })

  test('front30 prose changed after retention diagnosis asks for retention recheck without blocking acceptance', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters: [
        {
          ...chapters[0],
          updated_at: '2026-05-24T00:40:00.000Z',
        },
      ],
      activeChapterId: 101,
      materialScore: { score: 82, can_generate: true },
      activeRuns: [],
      contextPackages: { 101: contextPackage },
      reviews: [
        first30RetentionReview({ created_at: '2026-05-24T00:05:00.000Z' }),
        proseQualityReview({ created_at: '2026-05-24T00:20:00.000Z' }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.first30RetentionRecheck?.label).toBe('留存需复诊')
    expect(model.chapterAcceptanceDesk.first30RetentionRecheck?.reason).toContain('前30章诊断后更新')
  })

  test('delivery risk queue aggregates soft risks without blocking chapter acceptance', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        readerRetentionSyncReview(),
        readerPayoffSyncReview(),
        coreDriftReview(),
        readabilityReview(),
        innovationSyncReview(),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.label).toBe('待修复 9')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补核心')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('守核心：核心偏移 2')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补追读：漏追读 2')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补创新：创新缺口 2')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('accept_chapter_and_continue')
  })

  test('governance recheck memory misses are summarized as single-chapter recovery evidence risks', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        governanceRecheckSyncReview(),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.governanceRecheckSync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.governanceRecheckSync?.label).toBe('恢复依据缺口 2')
    expect(model.chapterAcceptanceDesk.governanceRecheckSync?.missedCount).toBe(2)
    expect(model.chapterAcceptanceDesk.governanceRecheckSync?.failedEvidence).toContain('第42章对白交锋已补回样章节奏')
    expect(model.chapterAcceptanceDesk.governanceRecheckSync?.watchItems).toContain('下一章继续观察样章策略命中率')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('验恢复依据：恢复依据缺口 2')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先验恢复依据')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('accept_chapter_and_continue')
  })

  test('innovation sync is summarized without blocking chapter acceptance', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        innovationSyncReview(),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.innovationSync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.innovationSync?.label).toBe('创新缺口 2')
    expect(model.chapterAcceptanceDesk.innovationSync?.scoreLabel).toBe('创新兑现 58')
    expect(model.chapterAcceptanceDesk.innovationSync?.missedCount).toBe(2)
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('accept_chapter_and_continue')
  })

  test('signature scene sync is summarized and prioritized as a soft repair risk', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        signatureSceneSyncReview(),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.signatureSceneSync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.signatureSceneSync?.label).toBe('强场面漏写 2')
    expect(model.chapterAcceptanceDesk.signatureSceneSync?.scoreLabel).toBe('强场面兑现 50')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补强场面：强场面漏写 2')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补强场面')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('accept_chapter_and_continue')
  })

  test('volume beat sync is summarized without blocking chapter acceptance', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        volumeBeatSyncReview(),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.volumeBeatSync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.volumeBeatSync?.label).toBe('爆点漏兑现 2')
    expect(model.chapterAcceptanceDesk.volumeBeatSync?.scoreLabel).toBe('爆点兑现 52')
    expect(model.chapterAcceptanceDesk.volumeBeatSync?.missedCount).toBe(2)
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补爆点：爆点漏兑现 2')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('accept_chapter_and_continue')
  })

  test('delivery risk convergence is summarized without blocking chapter acceptance', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        deliveryRiskConvergenceReview(),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.deliveryRiskConvergence?.status).toBe('improved')
    expect(model.chapterAcceptanceDesk.deliveryRiskConvergence?.label).toBe('风险收敛 3')
    expect(model.chapterAcceptanceDesk.deliveryRiskConvergence?.residualCount).toBe(2)
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('accept_chapter_and_continue')
  })

  test('zero quality score requires revision instead of being treated as missing', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          payload: {
            self_check: {
              review: {
                score: 0,
                status: 'fail',
                issues: [],
                must_fix: [],
                optional_improvements: [],
                revision_directives: [],
                needs_revision: false,
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_revision')
    expect(model.chapterAcceptanceDesk.qualityScore).toBe(0)
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('create_editor_report')
  })

  test('must-fix quality issues require revision', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          payload: {
            self_check: {
              review: {
                score: 84,
                passed: false,
                status: 'warn',
                issues: [{ severity: 'high', message: '主角决策动机断裂' }],
                must_fix: ['主角决策动机断裂'],
                optional_improvements: [],
                revision_directives: ['补足主角决策动机'],
                needs_revision: true,
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_revision')
    expect(model.chapterAcceptanceDesk.mustFix).toContain('主角决策动机断裂')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('create_editor_report')
  })

  test('latest editor report with must-fix issues recommends applying revision', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          payload: {
            self_check: {
              review: {
                score: 72,
                passed: false,
                status: 'fail',
                issues: [],
                must_fix: ['章末钩子不足'],
                optional_improvements: [],
                revision_directives: ['强化章末钩子'],
                needs_revision: true,
              },
            },
          },
        }),
        editorReportReview({ id: 301 }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_revision')
    expect(model.chapterAcceptanceDesk.latestEditorReportId).toBe(301)
    expect(model.chapterAcceptanceDesk.latestEditorReportSummary).toContain('章末钩子')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('apply_editor_revision')
  })

  test('revision after latest quality review requires a fresh recheck', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({ created_at: '2026-05-24T00:00:00.000Z' }),
        editorReportReview({ created_at: '2026-05-24T00:10:00.000Z' }),
        editorRevisionReview({ created_at: '2026-05-24T00:20:00.000Z' }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_recheck')
    expect(model.chapterAcceptanceDesk.latestRevisionSummary).toContain('强化章末钩子')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('refresh_current_quality')
  })

  test('revision later in review order requires recheck when timestamps are invalid', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({ record: { created_at: 'not-a-date', updated_at: null } }),
        editorRevisionReview({ record: { created_at: null, updated_at: 'invalid-date' } }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_recheck')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('refresh_current_quality')
  })

  test('stale editor report fixes do not block acceptance after revision and passing recheck', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          id: 201,
          created_at: '2026-05-24T00:00:00.000Z',
          payload: {
            self_check: {
              review: {
                score: 72,
                passed: false,
                status: 'fail',
                issues: [],
                must_fix: ['章末钩子不足'],
                optional_improvements: [],
                revision_directives: ['强化章末钩子'],
                needs_revision: true,
              },
            },
          },
        }),
        editorReportReview({ id: 301, created_at: '2026-05-24T00:10:00.000Z' }),
        editorRevisionReview({ id: 401, created_at: '2026-05-24T00:20:00.000Z' }),
        proseQualityReview({
          id: 202,
          created_at: '2026-05-24T00:30:00.000Z',
          payload: {
            self_check: {
              review: {
                score: 84,
                passed: true,
                status: 'pass',
                issues: [],
                must_fix: [],
                optional_improvements: [],
                revision_directives: [],
                needs_revision: false,
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.mustFix).toEqual([])
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('accept_chapter_and_continue')
  })

  test('passing quality with stale story state needs state sync', () => {
    const staleProject = {
      ...project,
      reference_config: {
        ...project.reference_config,
        story_state: {
          ...project.reference_config.story_state,
          last_updated_chapter: 0,
        },
      },
    }

    const model = buildWritingCockpitModel({
      project: staleProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [proseQualityReview()],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_state_sync')
    expect(model.chapterAcceptanceDesk.storyStateSynced).toBe(false)
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('sync_story_state')
    expect(model.primaryActionKey).toBe('sync_story_state')
  })

  test('passing quality with synchronized story state is ready to accept', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [proseQualityReview()],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.storyStateSynced).toBe(true)
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('accept_chapter_and_continue')
    expect(model.primaryActionKey).toBe('accept_chapter_and_continue')
  })

  test('shows storyline sync warning without blocking ready acceptance', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [proseQualityReview(), storylineSyncReview()],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('accept_chapter_and_continue')
    expect(model.chapterAcceptanceDesk.storylineSync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.storylineSync?.label).toBe('漏推 1 · 额外推进 1 · 禁揭风险 1')
  })

  test('shows story unit sync warning without blocking ready acceptance', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [proseQualityReview(), storyUnitSyncReview()],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('accept_chapter_and_continue')
    expect(model.chapterAcceptanceDesk.storyUnitSync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.storyUnitSync?.label).toBe('单元漏写 1 · 单元抢跑 2 · 禁抢跑 1')
    expect(model.chapterAcceptanceDesk.storyUnitSync?.riskCount).toBe(4)
  })

  test('shows discovered asset intake without blocking ready acceptance', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [proseQualityReview(), assetIntakeReview()],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('accept_chapter_and_continue')
    expect(model.chapterAcceptanceDesk.assetIntake?.status).toBe('pending')
    expect(model.chapterAcceptanceDesk.assetIntake?.label).toBe('新资产 2 待确认')
  })

  test('shows IP scene intake without blocking ready acceptance', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [proseQualityReview(), ipSceneIntakeReview()],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('accept_chapter_and_continue')
    expect(model.chapterAcceptanceDesk.ipSceneIntake?.status).toBe('ready')
    expect(model.chapterAcceptanceDesk.ipSceneIntake?.label).toBe('IP场面 2')
    expect(model.chapterAcceptanceDesk.ipSceneIntake?.candidateCount).toBe(2)
    expect(model.chapterAcceptanceDesk.ipSceneIntake?.candidates[0].title).toBe('玻璃门内外对峙')
    expect(model.chapterAcceptanceDesk.ipSceneIntake?.candidates[0].visualHook).toContain('判定边界')
    expect(model.chapterAcceptanceDesk.ipSceneIntake?.candidates[0].adaptationValue).toContain('短剧')
  })

  test('shows core drift warning without blocking ready acceptance', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [proseQualityReview(), coreDriftReview()],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('accept_chapter_and_continue')
    expect(model.chapterAcceptanceDesk.coreDrift?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.coreDrift?.label).toBe('核心偏移 2')
    expect(model.chapterAcceptanceDesk.coreDrift?.scoreLabel).toBe('核心守恒 73')
  })

  test('shows million word runway warning without blocking ready acceptance', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [proseQualityReview(), runwaySyncReview()],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('accept_chapter_and_continue')
    expect(model.chapterAcceptanceDesk.runwaySync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.runwaySync?.label).toBe('航线风险 2')
    expect(model.chapterAcceptanceDesk.runwaySync?.scoreLabel).toBe('航线兑现 64')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items.join('｜')).toContain('补航线')
  })

  test('shows reader payoff debt without blocking ready acceptance', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [proseQualityReview(), readerPayoffSyncReview()],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('accept_chapter_and_continue')
    expect(model.chapterAcceptanceDesk.readerPayoffSync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.readerPayoffSync?.label).toBe('回报欠账 2')
    expect(model.chapterAcceptanceDesk.readerPayoffSync?.scoreLabel).toBe('回报兑现 64')
  })

  test('omits storyline sync summary when no storyline review exists', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [proseQualityReview()],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.storylineSync).toBeNull()
    expect(model.chapterAcceptanceDesk.assetIntake).toBeNull()
    expect(model.chapterAcceptanceDesk.coreDrift).toBeNull()
    expect(model.chapterAcceptanceDesk.readerPayoffSync).toBeNull()
  })

  test('passing quality for old prose needs current quality check after text changes', () => {
    const oldText = chapters[0].chapter_text
    const editedChapter = {
      ...chapters[0],
      chapter_text: `${oldText} 新增一段验收前自动保存的正文。`,
    }

    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters: [editedChapter, chapters[1]],
      activeChapter: editedChapter,
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          payload: {
            self_check: {
              final_text: oldText,
              review: {
                score: 82,
                passed: true,
                status: 'pass',
                issues: [],
                must_fix: [],
                optional_improvements: [],
                revision_directives: [],
                needs_revision: false,
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_quality_check')
    expect(model.chapterAcceptanceDesk.latestQualityReviewId).toBeNull()
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('refresh_current_quality')
    expect(model.primaryActionKey).toBe('refresh_current_quality')
    expect(model.topStatus.primaryActionKey).toBe('refresh_current_quality')
  })

  test('passing quality with mismatched chapter updated time needs current quality check', () => {
    const updatedChapter = {
      ...chapters[0],
      updated_at: '2026-05-24T01:00:00.000Z',
    }

    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters: [updatedChapter, chapters[1]],
      activeChapter: updatedChapter,
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          payload: {
            chapter_updated_at: '2026-05-24T00:00:00.000Z',
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_quality_check')
    expect(model.chapterAcceptanceDesk.latestQualityReviewId).toBeNull()
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('refresh_current_quality')
    expect(model.primaryActionKey).toBe('refresh_current_quality')
  })

  test('accepted prose chapter does not route back to draft generation', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      contextPackage,
      diagnostics: {
        preflight: { ready: true, blockers: [] },
        material_score: { score: 88, can_generate: true },
      },
      materialScore: { score: 88, can_generate: true },
      reviews: [proseQualityReview()],
    })

    expect(model.nextChapter?.chapterNo).toBe(1)
    expect(model.draftPipeline.state).toBe('draft_generated')
    expect(model.chapterAcceptanceDesk.visible).toBe(true)
    expect(model.primaryActionKey).not.toBe('write_draft')
    expect(model.topStatus.primaryActionKey).toBe('accept_chapter_and_continue')
  })
})

describe('writing cockpit target chapter actions', () => {
  test('selects the target chapter before running a target action when active differs', async () => {
    const selected: number[] = []

    const ready = await selectTargetChapterForWriting({
      targetChapterId: 102,
      activeChapterId: 101,
      selectChapterForWriting: async (chapterId) => {
        selected.push(chapterId)
        return true
      },
    })

    expect(ready).toBe(true)
    expect(selected).toEqual([102])
  })

  test('does not select again when the target chapter is already active', async () => {
    const selected: number[] = []

    const ready = await selectTargetChapterForWriting({
      targetChapterId: 102,
      activeChapterId: '102',
      selectChapterForWriting: async (chapterId) => {
        selected.push(chapterId)
        return true
      },
    })

    expect(ready).toBe(true)
    expect(selected).toEqual([])
  })

  test('blocks the target action when target chapter selection fails', async () => {
    const ready = await selectTargetChapterForWriting({
      targetChapterId: 102,
      activeChapterId: 101,
      selectChapterForWriting: async () => false,
    })

    expect(ready).toBe(false)
  })

  test('resolves editor revision chapter from payload, report, target, then active chapter', () => {
    expect(resolveEditorRevisionChapterId({
      payload: JSON.stringify({ chapter_id: 201 }),
      chapter_id: 202,
    }, 203, 204)).toBe(201)

    expect(resolveEditorRevisionChapterId({
      payload: {},
      chapter_id: 202,
    }, 203, 204)).toBe(202)

    expect(resolveEditorRevisionChapterId({ payload: {} }, 203, 204)).toBe(204)
    expect(resolveEditorRevisionChapterId({ payload: {} }, 203)).toBe(203)
  })
})

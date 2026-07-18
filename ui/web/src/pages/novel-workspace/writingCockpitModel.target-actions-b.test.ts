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

function qualityAuditSyncReview(overrides: Record<string, any> = {}) {
  const payload = {
    chapter_id: 101,
    chapter_no: 1,
    quality_audit_sync: {
      status: 'warn',
      label: '质量诊断缺口 2',
      summary: '正文有 2 项质量诊断缺口，需要下一章承接修复。',
      missed_count: 2,
      missed: [
        { label: '章节推进', text: '删掉这章不影响理解，第二份证据没有改变局势。' },
        { label: '信息负载', text: '一章新增 4 个概念，信息没有跟冲突走。' },
      ],
      next_actions: ['下一章必须证明本章不可删除，并把新概念压到 3 个以内。'],
    },
    ...overrides.payload,
  }

  return {
    id: overrides.id || 405,
    review_type: 'quality_audit_sync',
    status: overrides.status || 'warn',
    summary: overrides.summary || '质量诊断承接存在 2 项风险。',
    created_at: overrides.created_at || '2026-05-24T00:24:00.000Z',
    payload: JSON.stringify(payload),
    ...overrides.record,
  }
}

function qualityAuditRepairReceiptSyncReview(overrides: Record<string, any> = {}) {
  const payload = {
    chapter_id: 101,
    chapter_no: 1,
    quality_audit_repair_receipt_sync: {
      status: 'warn',
      label: '质量诊断修复回执缺口 1',
      summary: '质量诊断修复执行后，仍有 1 项缺口没有形成回执证据。',
      missed_count: 1,
      receipt_count: 2,
      missed: [
        { label: '目的词详略分配', text: 'original_evidence 有问题，但 changed_evidence 为空。' },
      ],
      next_actions: ['重新修订并逐条输出 quality_audit_repair_receipts.changed_evidence。'],
    },
    ...overrides.payload,
  }

  return {
    id: overrides.id || 406,
    review_type: 'quality_audit_repair_receipt_sync',
    status: overrides.status || 'warn',
    summary: overrides.summary || '质量诊断修复回执存在 1 项风险。',
    created_at: overrides.created_at || '2026-05-24T00:25:00.000Z',
    payload: JSON.stringify(payload),
    ...overrides.record,
  }
}

function chapterHandoffSyncReview(overrides: Record<string, any> = {}) {
  const payload = {
    chapter_id: 101,
    chapter_no: 1,
    chapter_handoff_sync: {
      status: 'warn',
      label: '章首承接缺口 2',
      summary: '正文有 2 项章首承接缺口。',
      missed_count: 2,
      missed: [
        { label: '开篇义务', text: '开篇没有接住敲门、湿漉漉学生和不能开门的警告。' },
        { label: '逾期待办', text: '玻璃门水痕没有优先推进。' },
      ],
      next_actions: ['下一章必须补章首承接：开篇先回到玻璃门水痕，再推进名单线索。'],
    },
    ...overrides.payload,
  }

  return {
    id: overrides.id || 409,
    review_type: 'chapter_handoff_sync',
    status: overrides.status || 'warn',
    summary: overrides.summary || '章首承接存在 2 项风险。',
    created_at: overrides.created_at || '2026-05-24T00:28:00.000Z',
    payload: JSON.stringify(payload),
    ...overrides.record,
  }
}

function chapterHandoffDeltaSyncReview(overrides: Record<string, any> = {}) {
  const payload = {
    chapter_id: 101,
    chapter_no: 1,
    chapter_handoff_delta_sync: {
      status: 'warn',
      label: '章末交接缺口 1',
      summary: '章末追读没有写入下一章优先事项。',
      missed_count: 1,
      missed: [
        { label: '下一章拉力', text: '第二个证人说出旧案当晚还有第三个人。' },
      ],
      next_actions: ['下一章开篇必须接住第二个证人的最后一句话，先追查第三个人。'],
    },
    ...overrides.payload,
  }

  return {
    id: overrides.id || 410,
    review_type: 'chapter_handoff_delta_sync',
    status: overrides.status || 'warn',
    summary: overrides.summary || '章末交接存在 1 项风险。',
    created_at: overrides.created_at || '2026-05-24T00:29:00.000Z',
    payload: JSON.stringify(payload),
    ...overrides.record,
  }
}

function intentConfirmationSyncReview(overrides: Record<string, any> = {}) {
  const payload = {
    chapter_id: 101,
    chapter_no: 1,
    intent_confirmation_sync: {
      status: 'warn',
      label: '意图确认缺口 2',
      summary: '本章没有按写前意图统一发力。',
      missed_count: 2,
      missed: [
        { label: '情绪目标', text: '压抑回府没有转成当众夺回主动权。' },
        { label: '章尾承接', text: '带血腰牌没有成为下一章推动力。' },
      ],
      next_actions: ['重写中段和章尾，让情绪、节奏、代价和章尾承接回到写前意图。'],
    },
    ...overrides.payload,
  }

  return {
    id: overrides.id || 407,
    review_type: 'intent_confirmation_sync',
    status: overrides.status || 'warn',
    summary: overrides.summary || '意图确认存在 2 项风险。',
    created_at: overrides.created_at || '2026-05-24T00:26:00.000Z',
    payload: JSON.stringify(payload),
    ...overrides.record,
  }
}

function benchmarkRecallSyncReview(overrides: Record<string, any> = {}) {
  const payload = {
    chapter_id: 101,
    chapter_no: 1,
    benchmark_recall_sync: {
      status: 'warn',
      label: '文风召回缺口 1',
      summary: 'selected_emotion_module 和 rhythm_reference 没有进入正文。',
      missed_count: 1,
      missed: [
        { label: '节奏参照', text: '爆发后没有冷却承接，直接跳到总结。' },
      ],
      next_actions: ['按对标节奏补蓄势、爆发、冷却和章尾承接，不复制桥段原句。'],
    },
    ...overrides.payload,
  }

  return {
    id: overrides.id || 408,
    review_type: 'benchmark_recall_sync',
    status: overrides.status || 'warn',
    summary: overrides.summary || '文风召回存在 1 项风险。',
    created_at: overrides.created_at || '2026-05-24T00:27:00.000Z',
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

describe('writing cockpit target chapter actions b', () => {
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

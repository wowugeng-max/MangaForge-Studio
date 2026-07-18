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

  test('summarizes oh-story longform workflow into four production stages', () => {
    const reviewedChapter = {
      ...chapters[0],
      scene_list: [
        {
          scene_no: 1,
          title: '断臂入府',
          purpose: '把失势皇子的回府压成公开站队',
          conflict: '新贵压席，旧臣观望',
          turn: '谢怀安拿出军中信物',
          ending_hook: '王府内钟声先乱',
        },
      ],
    }
    const model = buildWritingCockpitModel({
      selectedProject: {
        ...acceptedProject,
        reference_config: {
          ...acceptedProject.reference_config,
          story_state: { last_updated_chapter: 0 },
        },
      },
      outlines,
      chapters: [reviewedChapter, chapters[1]],
      activeChapter: reviewedChapter,
      contextPackage,
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        chapterAttractionReview(),
        readerRetentionSyncReview(),
        qualityAuditRepairReceiptSyncReview(),
      ],
    })

    expect(model.longformWorkflow.stages.map(stage => stage.key)).toEqual([
      'creation_setup',
      'pre_draft',
      'post_draft_review',
      'quality_continuity',
    ])
    expect(model.longformWorkflow.stages.find(stage => stage.key === 'creation_setup')?.status).toBe('ready')
    expect(model.longformWorkflow.stages.find(stage => stage.key === 'pre_draft')?.status).toBe('ready')
    expect(model.longformWorkflow.stages.find(stage => stage.key === 'post_draft_review')?.status).toBe('needs_action')
    expect(model.longformWorkflow.stages.find(stage => stage.key === 'post_draft_review')?.evidence.join('｜')).toContain('吸引力缺口 3')
    expect(model.longformWorkflow.stages.find(stage => stage.key === 'quality_continuity')?.status).toBe('needs_action')
    expect(model.longformWorkflow.stages.find(stage => stage.key === 'quality_continuity')?.evidence.join('｜')).toContain('故事状态待同步')
    expect(model.longformWorkflow.currentStage.key).toBe('post_draft_review')
    expect(model.longformWorkflow.primaryAction.key).toBe('open_task_center')
    expect(model.longformWorkflow.riskCount).toBeGreaterThan(0)
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

  test('director needs_repair owns the single planning desk status and action', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[1],
      contextPackage: {
        ...contextPackage,
        preflight: {
          ready: false,
          blockers: ['旧预检缺少章节目标'],
        },
        oh_story_director: {
          stage: 'pre_draft',
          readiness: 'needs_repair',
          primary_action: {
            key: 'repair_pre_draft_materials',
            label: '补齐并继续',
            mode: 'automatic',
          },
          blocking_summary: '本章蓝图缺核心字段',
          required_repairs: [
            { detail: '补齐 chapter_blueprint.core_conflict' },
            { label: '确认章末钩子' },
          ],
        },
      },
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.statusLabel).toBe('需要修复')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('repair_materials')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.label).toBe('补齐并继续')
    expect(model.chapterPlanningDesk.reasons.join('｜')).toContain('本章蓝图缺核心字段')
    expect(model.chapterPlanningDesk.reasons.join('｜')).toContain('补齐 chapter_blueprint.core_conflict')
    expect(model.chapterPlanningDesk.reasons.join('｜')).not.toContain('旧预检缺少章节目标')
  })

  test('director needs_repair overrides legacy diagnostics blockers', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[1],
      contextPackage: {
        ...contextPackage,
        oh_story_director: {
          stage: 'pre_draft',
          readiness: 'needs_repair',
          primary_action: {
            key: 'repair_pre_draft_materials',
            label: '总导演修复',
            mode: 'automatic',
          },
          blocking_summary: '总导演要求补齐写前材料',
          required_repairs: [
            { detail: '补齐本章蓝图的核心冲突' },
          ],
        },
      },
      diagnostics: {
        preflight: {
          ready: false,
          blockers: ['旧诊断缺少上一章承接'],
        },
      },
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.statusLabel).toBe('需要修复')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('repair_materials')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.label).toBe('总导演修复')
    expect(model.chapterPlanningDesk.reasons.join('｜')).toContain('总导演要求补齐写前材料')
    expect(model.chapterPlanningDesk.reasons.join('｜')).not.toContain('诊断阻塞')
    expect(model.chapterPlanningDesk.reasons.join('｜')).not.toContain('旧诊断缺少上一章承接')
  })

  test.each([
    {
      wrapperKey: 'context_package',
      readiness: 'needs_repair',
      actionKey: 'repair_pre_draft_materials',
      expectedReadiness: 'needs_context',
      expectedStatus: '需要修复',
      expectedAction: 'repair_materials',
    },
    {
      wrapperKey: 'contextPackage',
      readiness: 'blocked',
      actionKey: 'manual_confirmation_required',
      expectedReadiness: 'blocked',
      expectedStatus: '需要确认',
      expectedAction: 'open_generation_diagnostics',
    },
  ])('planning desk honors $readiness director inside $wrapperKey response wrappers', ({
    wrapperKey,
    readiness,
    actionKey,
    expectedReadiness,
    expectedStatus,
    expectedAction,
  }) => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], sceneCardChapter],
      activeChapter: sceneCardChapter,
      contextPackage: {
        ok: true,
        [wrapperKey]: {
          ...contextPackage,
          oh_story_director: {
            readiness,
            primary_action: { key: actionKey, label: '处理写前缺口' },
            blocking_summary: '包装响应中的总导演要求先处理缺口',
          },
        },
      },
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.readiness).toBe(expectedReadiness)
    expect(model.chapterPlanningDesk.statusLabel).toBe(expectedStatus)
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe(expectedAction)
    expect(model.chapterPlanningDesk.reasons).toContain('包装响应中的总导演要求先处理缺口')
  })

  test('planning desk skips empty director aliases before a wrapped camel director', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], sceneCardChapter],
      activeChapter: sceneCardChapter,
      contextPackage: {
        ok: true,
        oh_story_director: {},
        context_package: {
          ...contextPackage,
          oh_story_director: {},
          ohStoryDirector: {
            readiness: 'blocked',
            primaryAction: { key: 'manual_confirmation_required', label: '确认角色选择' },
            blockingSummary: '包装响应中的角色选择仍待确认',
          },
        },
      },
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.readiness).toBe('blocked')
    expect(model.chapterPlanningDesk.statusLabel).toBe('需要确认')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('open_generation_diagnostics')
    expect(model.chapterPlanningDesk.reasons).toContain('包装响应中的角色选择仍待确认')
  })

  test('director ready owns the single planning desk action without repair prompts', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], sceneCardChapter],
      activeChapter: sceneCardChapter,
      contextPackage: {
        ...contextPackage,
        preflight: { ready: true, blockers: [] },
        oh_story_director: {
          stage: 'pre_draft',
          readiness: 'ready',
          primary_action: {
            key: 'generate_prose',
            label: '生成正文',
            mode: 'automatic',
          },
        },
      },
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.statusLabel).toBe('可继续')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('confirm_plan_and_write_draft')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.label).toBe('生成正文')
    expect(model.chapterPlanningDesk.shouldAutoExpandPlanner).toBe(false)
    expect(model.chapterPlanningDesk.reasons.join('｜')).not.toContain('修复')
  })

  test('director ready does not override diagnostics blockers', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], sceneCardChapter],
      activeChapter: sceneCardChapter,
      contextPackage: {
        ...contextPackage,
        oh_story_director: {
          readiness: 'ready',
          primary_action: { key: 'generate_prose', label: '生成正文' },
        },
      },
      diagnostics: {
        preflight: { ready: false, blockers: ['缺少上一章承接'] },
      },
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.readiness).toBe('blocked')
    expect(model.chapterPlanningDesk.statusLabel).toBe('诊断阻塞')
    expect(model.chapterPlanningDesk.reasons).toContain('生成诊断阻塞：缺少上一章承接')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('open_generation_diagnostics')
  })

  test('director ready does not override context preflight blockers', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], sceneCardChapter],
      activeChapter: sceneCardChapter,
      contextPackage: {
        ...contextPackage,
        preflight: { ready: false, blockers: ['缺少章节目标'] },
        oh_story_director: {
          readiness: 'ready',
          primary_action: { key: 'generate_prose', label: '生成正文' },
        },
      },
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.readiness).toBe('needs_context')
    expect(model.chapterPlanningDesk.statusLabel).toBe('上下文不足')
    expect(model.chapterPlanningDesk.reasons).toContain('上下文包预检未通过：缺少章节目标')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('open_generation_diagnostics')
  })

  test.each(['strict_ready', 'strictReady'])('director ready does not override %s=false', strictReadyKey => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], sceneCardChapter],
      activeChapter: sceneCardChapter,
      contextPackage: {
        ...contextPackage,
        preflight: {
          ready: true,
          [strictReadyKey]: false,
          blockers: [],
        },
        oh_story_director: {
          readiness: 'ready',
          primary_action: { key: 'generate_prose', label: '生成正文' },
        },
      },
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.readiness).toBe('needs_context')
    expect(model.chapterPlanningDesk.statusLabel).toBe('上下文不足')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('open_generation_diagnostics')
  })

  test('director ready does not override a present preflight without ready=true', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], sceneCardChapter],
      activeChapter: sceneCardChapter,
      contextPackage: {
        ...contextPackage,
        preflight: {
          strict_ready: true,
          blockers: [],
        },
        oh_story_director: {
          readiness: 'ready',
          primary_action: { key: 'generate_prose', label: '生成正文' },
        },
      },
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.contextPackageStatus).toBe('insufficient')
    expect(model.chapterPlanningDesk.readiness).toBe('needs_context')
    expect(model.chapterPlanningDesk.statusLabel).toBe('上下文不足')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('open_generation_diagnostics')
  })

  test('planning desk keeps legacy target-only context ready when preflight is absent', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], sceneCardChapter],
      activeChapter: sceneCardChapter,
      contextPackage: {
        chapter_target: contextPackage.chapter_target,
      },
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.contextPackageStatus).toBe('ready')
    expect(model.chapterPlanningDesk.readiness).toBe('ready')
  })

  test('director ready does not override write preparation source gaps', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], sceneCardChapter],
      activeChapter: sceneCardChapter,
      contextPackage: {
        ...contextPackage,
        chapter_target: {
          ...contextPackage.chapter_target,
          write_preparation_brief: {
            readiness_status: 'needs_context',
            source_gaps: ['上一章正文或上一章承接｜状态=missing'],
          },
        },
        oh_story_director: {
          readiness: 'ready',
          primary_action: { key: 'generate_prose', label: '生成正文' },
        },
      },
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.readiness).toBe('needs_context')
    expect(model.chapterPlanningDesk.statusLabel).toBe('写前准备待确认')
    expect(model.chapterPlanningDesk.reasons.join('｜')).toContain('来源缺口')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('open_generation_diagnostics')
  })

  test('planning desk preserves camel hard gaps behind empty snake wrapper aliases', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], sceneCardChapter],
      activeChapter: sceneCardChapter,
      contextPackage: {
        ok: true,
        context_package: {
          ...contextPackage,
          chapter_target: {
            ...contextPackage.chapter_target,
            write_preparation_brief: {
              source_gaps: [],
              asset_risks: [],
              delivery_risk_actions: [],
            },
            writePreparationBrief: {
              sourceGaps: ['上一章承接｜状态=missing｜缺少上一章正文承接'],
              assetRisks: ['旧钥匙触发代价待落到现场'],
              deliveryRiskActions: ['开篇动作：前300字接住围捕压力'],
            },
            state_tracking_contract: {
              source_readiness: [],
            },
          },
          pre_draft_brief: {
            write_preparation_brief: {},
            state_tracking_contract: {
              source_readiness: [],
            },
          },
          preDraftBrief: {
            stateTrackingContract: {
              sourceReadiness: [
                {
                  label: '世界约束',
                  status: 'missing',
                  evidence: '红雾裂缝规则尚未就绪',
                },
              ],
            },
          },
          oh_story_director: {
            readiness: 'ready',
            primary_action: { key: 'generate_prose', label: '生成正文' },
          },
        },
      },
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.readiness).toBe('needs_context')
    expect(model.chapterPlanningDesk.statusLabel).toBe('写前准备待确认')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('open_generation_diagnostics')
    expect(model.chapterPlanningDesk.writePreparationBrief?.sourceGaps).toContain('上一章承接｜状态=missing｜缺少上一章正文承接')
    expect(model.chapterPlanningDesk.writePreparationBrief?.sourceGaps.join('｜')).toContain('世界约束｜状态=missing')
    expect(model.chapterPlanningDesk.writePreparationBrief?.assetRisks).toContain('旧钥匙触发代价待落到现场')
    expect(model.chapterPlanningDesk.writePreparationBrief?.deliveryRiskActions).toContain('开篇动作：前300字接住围捕压力')
  })

  test('director ready does not override unmapped quality continuity actions', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], sceneCardChapter],
      activeChapter: sceneCardChapter,
      contextPackage: {
        ...contextPackage,
        chapter_target: {
          ...contextPackage.chapter_target,
          delivery_risk_carry_over: {
            opening_actions: ['前300字先接住上一章追兵压迫'],
            middle_actions: ['中段让新证据改变盟友立场'],
            ending_actions: ['章末留下幕后主使的新问题'],
          },
        },
        oh_story_director: {
          readiness: 'ready',
          primary_action: { key: 'generate_prose', label: '生成正文' },
        },
      },
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.qualityContinuitySceneMap).toEqual([])
    expect(model.chapterPlanningDesk.readiness).toBe('needs_scene_plan')
    expect(model.chapterPlanningDesk.statusLabel).toBe('需补质量续航落点')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('build_scene_plan')
  })

  test('director ready does not override a missing scene plan', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[1],
      contextPackage: {
        ...contextPackage,
        oh_story_director: {
          readiness: 'ready',
          primary_action: { key: 'generate_prose', label: '生成正文' },
        },
      },
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.scenePlanStatus).toBe('missing')
    expect(model.chapterPlanningDesk.readiness).toBe('needs_scene_plan')
    expect(model.chapterPlanningDesk.statusLabel).toBe('需补场景计划')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('build_scene_plan')
  })

  test('camelCase director action and repairs are supported', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[1],
      contextPackage: {
        ...contextPackage,
        ohStoryDirector: {
          stage: 'pre_draft',
          readiness: 'blocked',
          primaryAction: {
            key: 'manual_confirmation_required',
            label: '查看缺口',
            mode: 'manual',
          },
          blockingSummary: '需要人工确认角色选择',
          requiredRepairs: [
            { detail: '确认谢怀安是否公开旧臣身份' },
          ],
        },
      },
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.statusLabel).toBe('需要确认')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('open_generation_diagnostics')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.label).toBe('查看缺口')
    expect(model.chapterPlanningDesk.reasons.join('｜')).toContain('需要人工确认角色选择')
    expect(model.chapterPlanningDesk.reasons.join('｜')).toContain('确认谢怀安是否公开旧臣身份')
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

  test('planning desk keeps relationship graph risks visible without treating them as missing context', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], sceneCardChapter],
      activeChapter: sceneCardChapter,
      contextPackage: {
        ...contextPackage,
        chapter_target: {
          ...contextPackage.chapter_target,
          asset_linkage_contract: {
            relationship_graph_risks: [
              '旧钥匙还没有和主角、禁门规则或章末钩子建立关系',
              '禁门规则缺少拥有者或触发方',
            ],
          },
        },
      },
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.readiness).toBe('ready')
    expect(model.chapterPlanningDesk.statusLabel).toBe('本章可写')
    expect(model.chapterPlanningDesk.writePreparationBrief?.assetRisks.join('｜')).toContain('旧钥匙')
  })

  test('planning desk keeps pure execution risks advisory when sources and scene cards are ready', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], sceneCardChapter],
      activeChapter: sceneCardChapter,
      contextPackage: {
        ...contextPackage,
        chapter_target: {
          ...contextPackage.chapter_target,
          asset_linkage_contract: {
            relationship_graph_risks: ['旧钥匙需要在现场建立触发条件和代价'],
          },
          write_preparation_brief: {
            version: 'oh_story_write_preparation_v1',
            readiness_status: 'ready',
            source_gaps: [],
            asset_risks: ['旧钥匙需要在现场建立触发条件和代价'],
            delivery_risk_actions: ['开篇动作：前300字接住上一章围捕压力'],
            rolling_rhythm_preflight: {
              principle: '拉期待速度 > 断期待速度',
              next_actions: ['先铺下一目标，再兑现当前回报'],
            },
            must_confirm: ['关系图风险：旧钥匙需要在现场建立触发条件和代价'],
            execution_order: ['把风险动作写进正文并在写后回执核验。'],
          },
        },
      },
      materialScore: { score: 88, can_generate: true },
    })

    expect(model.chapterPlanningDesk.readiness).toBe('ready')
    expect(model.chapterPlanningDesk.statusLabel).toBe('本章可写')
    expect(model.chapterPlanningDesk.writePreparationBrief?.sourceGaps).toEqual([])
    expect(model.chapterPlanningDesk.writePreparationBrief?.assetRisks).toContain('旧钥匙需要在现场建立触发条件和代价')
    expect(model.chapterPlanningDesk.writePreparationBrief?.deliveryRiskActions).toContain('开篇动作：前300字接住上一章围捕压力')
  })

  test('planning desk surfaces write preparation brief before drafting', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[1],
      contextPackage: {
        ...contextPackage,
        chapter_target: {
          ...contextPackage.chapter_target,
          write_preparation_brief: {
            version: 'oh_story_write_preparation_v1',
            readiness_status: 'needs_context',
            source_gaps: ['上一章正文或上一章承接｜状态=missing｜缺少上一章承接'],
            asset_risks: ['旧钥匙(isolated_key_asset)：旧钥匙还没有和禁门规则建立现场关系'],
            delivery_risk_actions: ['前 300 字先接住上一章门外黑影压迫'],
            blueprint_focus: ['开篇钩子：警钟第三响压入筵席'],
            reader_payoff_focus: ['读者回报：失势皇子第一次当众夺回主动权'],
            must_confirm: ['补上旧钥匙的现场功能和代价。'],
            execution_order: ['先确认来源就绪，再进入场景卡。'],
          },
        },
      },
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.readiness).toBe('needs_context')
    expect(model.chapterPlanningDesk.statusLabel).toBe('写前准备待确认')
    expect(model.chapterPlanningDesk.reasons.join('｜')).toContain('来源缺口')
    expect(model.chapterPlanningDesk.reasons.join('｜')).toContain('旧钥匙')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('open_generation_diagnostics')
    expect(model.chapterPlanningDesk.writePreparationBrief?.sourceGaps.join('｜')).toContain('上一章正文')
    expect(model.chapterPlanningDesk.writePreparationBrief?.assetRisks.join('｜')).toContain('旧钥匙')
    expect(model.chapterPlanningDesk.writePreparationBrief?.mustConfirm.join('｜')).toContain('补上旧钥匙')
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
          evidence: ['上一章章末只总结黑影逼近，没有留下身份反转问题。'],
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
    expect(model.chapterPlanningDesk.episodePlan.deliveryRiskCarryOver.evidence).toContain('上一章章末只总结黑影逼近，没有留下身份反转问题。')
  })

  test('planning desk preserves structured delivery risk stage actions in write preparation', () => {
    const backendContextPackage = {
      chapter_target: {
        goal: '把上一章交稿风险拆成开篇、中段、章末三段修复',
        conflict: '李超想硬闯，张智要用规则边界反制黑影',
        ending_hook: '门外校服男生说出李超车祸前最后一句话',
        delivery_risk_carry_over: {
          label: '待修复 3',
          priority_label: '优先修分段承接',
          items: ['修开篇承接', '补中段事件推进', '补章末翻页'],
          opening_actions: ['前 300 字先兑现门外黑影压迫'],
          middle_actions: ['中段用规则边界反制黑影'],
          ending_actions: ['章末必须留下身份反转问题'],
          forbidden_repeats: ['不要再用“他知道，这只是开始”总结体收尾。'],
          evidence: ['上一章章末只总结黑影逼近，没有留下身份反转问题。'],
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

    expect(model.chapterPlanningDesk.episodePlan.deliveryRiskCarryOver.openingActions).toContain('前 300 字先兑现门外黑影压迫')
    expect(model.chapterPlanningDesk.episodePlan.deliveryRiskCarryOver.middleActions).toContain('中段用规则边界反制黑影')
    expect(model.chapterPlanningDesk.episodePlan.deliveryRiskCarryOver.endingActions).toContain('章末必须留下身份反转问题')
    expect(model.chapterPlanningDesk.episodePlan.deliveryRiskCarryOver.forbiddenRepeats).toContain('不要再用“他知道，这只是开始”总结体收尾。')
    expect(model.chapterPlanningDesk.writePreparationBrief?.deliveryRiskActions.join('｜')).toContain('前 300 字先兑现门外黑影压迫')
    expect(model.chapterPlanningDesk.writePreparationBrief?.deliveryRiskActions.join('｜')).toContain('中段用规则边界反制黑影')
    expect(model.chapterPlanningDesk.writePreparationBrief?.deliveryRiskActions.join('｜')).toContain('章末必须留下身份反转问题')
    expect(model.chapterPlanningDesk.writePreparationBrief?.deliveryRiskActions.join('｜')).toContain('禁用重复：不要再用“他知道，这只是开始”总结体收尾。')
  })

  test('planning desk surfaces scene-level quality continuity mapping before drafting', () => {
    const qualityMappedChapter = {
      ...chapters[1],
      scene_list: [
        {
          scene_no: 1,
          title: '旧账压门',
          purpose: '主角带着账册入场',
          required_beats: ['前300字先让旧账压迫重新逼近主角'],
          serial_risk_repairs: ['delivery_risk_carry_over', '质量续航'],
          recent_fatigue_action: '前300字先让旧账压迫重新逼近主角',
        },
        {
          scene_no: 2,
          title: '证据翻面',
          purpose: '主角逼执事回应证据',
          conflict: '执事拒认旧账',
          state_changes_expected: ['中段用新证据推动目标并改变盟友立场'],
          serial_risk_repairs: ['质量续航'],
          recent_fatigue_action: '中段用新证据推动目标并改变盟友立场',
        },
        {
          scene_no: 3,
          title: '新名单落地',
          purpose: '用名单留下下一章追问',
          ending_hook: '章末抛出第三个名字作为追读钩子',
          required_beats: ['章末抛出第三个名字作为追读钩子'],
          serial_risk_repairs: ['delivery_risk_carry_over', '不要再用旁白宣布风险已修复'],
        },
      ],
    }

    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], qualityMappedChapter],
      activeChapter: qualityMappedChapter,
      contextPackage,
      diagnostics: { preflight: { ready: true, blockers: [] }, material_score: { score: 88, can_generate: true } },
      materialScore: { score: 88, can_generate: true },
    })

    expect(model.chapterPlanningDesk.sceneCards).toHaveLength(3)
    expect(model.chapterPlanningDesk.qualityContinuitySceneMap).toHaveLength(3)
    expect(model.chapterPlanningDesk.qualityContinuitySceneMap[0]).toMatchObject({
      sceneNo: 1,
      title: '旧账压门',
      stage: 'opening',
      action: '前300字先让旧账压迫重新逼近主角',
    })
    expect(model.chapterPlanningDesk.qualityContinuitySceneMap[1]).toMatchObject({
      stage: 'middle',
      action: '中段用新证据推动目标并改变盟友立场',
    })
    expect(model.chapterPlanningDesk.qualityContinuitySceneMap[2]).toMatchObject({
      stage: 'ending',
      action: '章末抛出第三个名字作为追读钩子',
    })
    expect(model.chapterPlanningDesk.qualityContinuitySceneMap[2].forbiddenRepeats).toContain('不要再用旁白宣布风险已修复')
  })

  test('planning desk blocks drafting when delivery risk carry-over is not mapped into scene cards', () => {
    const unmappedSceneCardChapter = {
      ...chapters[1],
      scene_list: [
        {
          scene_no: 1,
          title: '审判厅入场',
          purpose: '主角进入审判厅',
          conflict: '执事拒认旧账',
          ending_hook: '第三个名字出现',
        },
      ],
    }
    const backendContextPackage = {
      chapter_target: {
        goal: '把上一章交稿风险拆成开篇、中段、章末三段修复',
        conflict: '主角要用旧账反制执事',
        ending_hook: '第三个名字出现',
        delivery_risk_carry_over: {
          label: '待修复 3',
          opening_actions: ['前300字先让旧账压迫重新逼近主角'],
          middle_actions: ['中段用新证据推动目标并改变盟友立场'],
          ending_actions: ['章末抛出第三个名字作为追读钩子'],
          forbidden_repeats: ['不要再用旁白宣布风险已修复'],
        },
      },
      preflight: { ready: true, blockers: [] },
    }

    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], unmappedSceneCardChapter],
      activeChapter: unmappedSceneCardChapter,
      contextPackage: backendContextPackage,
      diagnostics: { preflight: { ready: true, blockers: [] }, material_score: { score: 88, can_generate: true } },
      materialScore: { score: 88, can_generate: true },
    })

    expect(model.chapterPlanningDesk.scenePlanStatus).toBe('ready')
    expect(model.chapterPlanningDesk.qualityContinuitySceneMap).toEqual([])
    expect(model.chapterPlanningDesk.readiness).toBe('needs_scene_plan')
    expect(model.chapterPlanningDesk.statusLabel).toBe('需补质量续航落点')
    expect(model.chapterPlanningDesk.reasons.join('｜')).toContain('delivery_risk_carry_over')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('build_scene_plan')
    expect(model.chapterPlanningDesk.shouldAutoExpandPlanner).toBe(true)
  })

  test('planning desk still blocks unmapped delivery risk carry-over when asset risks are advisory', () => {
    const unmappedSceneCardChapter = {
      ...chapters[1],
      scene_list: [
        {
          scene_no: 1,
          title: '审判厅入场',
          purpose: '主角进入审判厅',
          conflict: '执事拒认旧账',
          ending_hook: '第三个名字出现',
        },
      ],
    }
    const backendContextPackage = {
      chapter_target: {
        goal: '把上一章交稿风险拆成开篇、中段、章末三段修复',
        conflict: '主角要用旧账反制执事',
        ending_hook: '第三个名字出现',
        asset_linkage_contract: {
          relationship_graph_risks: ['旧钥匙需要在现场建立触发条件和代价'],
        },
        delivery_risk_carry_over: {
          label: '待修复 3',
          opening_actions: ['前300字先让旧账压迫重新逼近主角'],
          middle_actions: ['中段用新证据推动目标并改变盟友立场'],
          ending_actions: ['章末抛出第三个名字作为追读钩子'],
        },
      },
      preflight: { ready: true, blockers: [] },
      oh_story_director: {
        readiness: 'ready',
        primary_action: { key: 'generate_prose', label: '生成正文' },
      },
    }

    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], unmappedSceneCardChapter],
      activeChapter: unmappedSceneCardChapter,
      contextPackage: backendContextPackage,
      diagnostics: { preflight: { ready: true, blockers: [] }, material_score: { score: 88, can_generate: true } },
      materialScore: { score: 88, can_generate: true },
    })

    expect(model.chapterPlanningDesk.writePreparationBrief?.assetRisks).toContain('旧钥匙需要在现场建立触发条件和代价')
    expect(model.chapterPlanningDesk.qualityContinuitySceneMap).toEqual([])
    expect(model.chapterPlanningDesk.readiness).toBe('needs_scene_plan')
    expect(model.chapterPlanningDesk.statusLabel).toBe('需补质量续航落点')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('build_scene_plan')
  })

  test('planning desk reads quality continuity scene cards from backend context package', () => {
    const backendContextPackage = {
      chapter_target: {
        goal: '把上一章交稿风险拆成开篇、中段、章末三段修复',
        conflict: '主角要用旧账反制执事',
        ending_hook: '第三个名字出现',
        delivery_risk_carry_over: {
          label: '待修复 3',
          opening_actions: ['前300字先让旧账压迫重新逼近主角'],
          middle_actions: ['中段用新证据推动目标并改变盟友立场'],
          ending_actions: ['章末抛出第三个名字作为追读钩子'],
          forbidden_repeats: ['不要再用旁白宣布风险已修复'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '旧账压门',
            purpose: '主角带着账册入场',
            required_beats: ['前300字先让旧账压迫重新逼近主角'],
            serial_risk_repairs: ['delivery_risk_carry_over', '质量续航'],
          },
          {
            scene_no: 2,
            title: '证据翻面',
            purpose: '主角逼执事回应证据',
            state_changes_expected: ['中段用新证据推动目标并改变盟友立场'],
            serial_risk_repairs: ['质量续航'],
          },
          {
            scene_no: 3,
            title: '新名单落地',
            purpose: '用名单留下下一章追问',
            ending_hook: '章末抛出第三个名字作为追读钩子',
            serial_risk_repairs: ['delivery_risk_carry_over', '不要再用旁白宣布风险已修复'],
          },
        ],
      },
      preflight: { ready: true, blockers: [] },
    }

    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], chapters[1]],
      activeChapter: chapters[1],
      contextPackage: backendContextPackage,
      diagnostics: { preflight: { ready: true, blockers: [] }, material_score: { score: 88, can_generate: true } },
      materialScore: { score: 88, can_generate: true },
    })

    expect(model.chapterPlanningDesk.scenePlanStatus).toBe('ready')
    expect(model.chapterPlanningDesk.sceneCards).toHaveLength(3)
    expect(model.chapterPlanningDesk.qualityContinuitySceneMap).toHaveLength(3)
    expect(model.chapterPlanningDesk.qualityContinuitySceneMap[0]).toMatchObject({
      sceneNo: 1,
      stage: 'opening',
      action: '前300字先让旧账压迫重新逼近主角',
    })
    expect(model.chapterPlanningDesk.qualityContinuitySceneMap[2].forbiddenRepeats).toContain('不要再用旁白宣布风险已修复')
    expect(model.chapterPlanningDesk.readiness).toBe('ready')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('confirm_plan_and_write_draft')
  })

  test('planning desk treats dialogue voice and style recall scene cards as quality continuity mapping', () => {
    const backendContextPackage = {
      chapter_target: {
        goal: '把上一章对白声线和文风漂移风险拆到具体场景',
        conflict: '主角要在高压问讯中逼出证据来源',
        ending_hook: '证人一句短句反问暴露第三方',
        delivery_risk_carry_over: {
          label: '待修复 2',
          required_actions: [
            '对白声线：高压场景里搞笑担当声线让位，信息型配角不能当科普嘴。',
            '文风召回：按文风指纹恢复中长句呼吸，避免逗号结巴体。',
          ],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '问讯开场',
            purpose: '主角用短句压住证人',
            character_voice: '主角短句反问；证人长句辩解；搞笑担当在高压 beat 声线让位。',
            dialogue_goals: ['逼证人说漏证据来源，不能科普规则来历。'],
          },
          {
            scene_no: 2,
            title: '证词翻面',
            purpose: '用证词改变现场判断',
            style_directives: ['按文风指纹恢复中长句呼吸，避免逗号结巴体。'],
            benchmark_recall_directives: ['只学习对标章的节奏和潜台词，不复制原句。'],
          },
        ],
      },
      preflight: { ready: true, blockers: [] },
    }

    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], chapters[1]],
      activeChapter: chapters[1],
      contextPackage: backendContextPackage,
      diagnostics: { preflight: { ready: true, blockers: [] }, material_score: { score: 88, can_generate: true } },
      materialScore: { score: 88, can_generate: true },
    })

    expect(model.chapterPlanningDesk.scenePlanStatus).toBe('ready')
    expect(model.chapterPlanningDesk.qualityContinuitySceneMap).toHaveLength(2)
    expect(model.chapterPlanningDesk.qualityContinuitySceneMap[0]).toMatchObject({
      sceneNo: 1,
      action: expect.stringContaining('主角短句反问'),
    })
    expect(model.chapterPlanningDesk.qualityContinuitySceneMap[1]).toMatchObject({
      sceneNo: 2,
      action: expect.stringContaining('文风指纹'),
    })
    expect(model.chapterPlanningDesk.readiness).toBe('ready')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('confirm_plan_and_write_draft')
  })

  test('planning desk treats concept anchor scene cards as quality continuity mapping', () => {
    const backendContextPackage = {
      chapter_target: {
        goal: '让新设定第一次出现时跟动作后果绑定',
        conflict: '主角必须用蓝晶抢回证据记忆',
        ending_hook: '蓝晶烧出第二段陌生记忆',
        delivery_risk_carry_over: {
          label: '待修复 1',
          required_actions: [
            '新概念锚点：蓝晶首次出现必须靠动作反应、对话半句或物理后果解释当下作用。',
          ],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '蓝晶灼手',
            purpose: '蓝晶首次进入正文并改变证据判断',
            concept_anchor_rules: ['蓝晶首次出现时，先写灼手反应和记忆碎片炸开，再让角色半句对话确认用途。'],
            prose_craft_directives: ['不得用整段来历/等级解释蓝晶，只给当下作用锚点。'],
          },
        ],
      },
      preflight: { ready: true, blockers: [] },
    }

    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], chapters[1]],
      activeChapter: chapters[1],
      contextPackage: backendContextPackage,
      diagnostics: { preflight: { ready: true, blockers: [] }, material_score: { score: 88, can_generate: true } },
      materialScore: { score: 88, can_generate: true },
    })

    expect(model.chapterPlanningDesk.scenePlanStatus).toBe('ready')
    expect(model.chapterPlanningDesk.qualityContinuitySceneMap).toHaveLength(1)
    expect(model.chapterPlanningDesk.qualityContinuitySceneMap[0]).toMatchObject({
      sceneNo: 1,
      action: expect.stringContaining('蓝晶首次出现'),
    })
    expect(model.chapterPlanningDesk.readiness).toBe('ready')
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

  test('stored prose accepted with warnings stays delivered while quality and state repairs remain optional', () => {
    const warningChapter = {
      ...chapters[0],
      raw_payload: {
        ...chapters[0].raw_payload,
        prose_admission: {
          status: 'accepted_with_warnings',
          quality_score: 72,
          quality_warnings: [{ code: 'quality_score_below_target', source: 'quality', message: '评分低于建议目标' }],
          story_state_status: 'pending',
          post_commit_warnings: [{ stage: 'memory', message: '记忆索引稍后补同步' }],
        },
      },
    }
    const staleProject = {
      ...project,
      reference_config: {
        ...project.reference_config,
        story_state: { ...project.reference_config.story_state, last_updated_chapter: 0 },
      },
    }

    const model = buildWritingCockpitModel({
      project: staleProject,
      outlines,
      chapters: [warningChapter, chapters[1]],
      activeChapter: warningChapter,
      materialScore: { score: 82, can_generate: true },
      reviews: [proseQualityReview({
        payload: {
          self_check: {
            review: {
              score: 72,
              passed: false,
              status: 'warn',
              must_fix: ['强化章末钩子'],
              optional_improvements: ['压缩解释'],
            },
          },
        },
      })],
      activeRuns: [{
        id: 901,
        created_at: '2026-07-13T12:00:00.000Z',
        output_ref: JSON.stringify({
          chapter_id: warningChapter.id,
          chapter_no: warningChapter.chapter_no,
          admission_status: 'accepted',
          story_state_status: 'synced',
        }),
      }],
    })

    expect(model.chapterAcceptanceDesk.statusLabel).toBe('已入库，待同步状态机')
    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_state_sync')
    expect(model.chapterAcceptanceDesk.admissionStatus).toBe('accepted_with_warnings')
    expect(model.chapterAcceptanceDesk.qualityWarnings).toEqual([
      { code: 'quality_score_below_target', source: 'quality', message: '评分低于建议目标' },
    ])
    expect(model.chapterAcceptanceDesk.storyStateStatus).toBe('pending')
    expect(model.chapterAcceptanceDesk.postCommitWarnings).toEqual([{ stage: 'memory', message: '记忆索引稍后补同步' }])
    expect(model.chapterAcceptanceDesk.qualityScore).toBe(72)
    expect(model.chapterAcceptanceDesk.mustFix).toContain('强化章末钩子')
    expect(model.chapterAcceptanceDesk.storyStateSynced).toBe(false)
    expect(model.chapterAcceptanceDesk.storyStatePanel?.status).toBe('pending')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('sync_story_state')
    expect(model.chapterAcceptanceDesk.secondaryActions.map(action => action.key)).toEqual(expect.arrayContaining(['apply_editor_revision', 'sync_story_state']))
    expect(model.chapterAcceptanceDesk.approvalBlocker).toBeNull()
    expect(model.chapterHandoffDesk.status).toBe('needs_delivery')
    expect(model.primaryActionKey).toBe('sync_story_state')
  })

  test('accepted admission metadata overrides legacy low score must-fix and failed quality gate', () => {
    const acceptedChapter = {
      ...chapters[0],
      raw_payload: {
        ...chapters[0].raw_payload,
        proseAdmission: {
          status: 'accepted',
          qualityScore: 64,
          storyStateStatus: 'synced',
        },
      },
    }
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters: [acceptedChapter, chapters[1]],
      activeChapter: acceptedChapter,
      materialScore: { score: 82, can_generate: true },
      reviews: [proseQualityReview({
        payload: {
          prose_admission: { status: 'blocked_invalid' },
          quality_gate: { passed: false },
          self_check: {
            review: {
              score: 64,
              passed: false,
              must_fix: ['旧门禁必须修复'],
              needs_revision: true,
            },
          },
        },
      })],
    })

    expect(model.chapterAcceptanceDesk.admissionStatus).toBe('accepted')
    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('delivered')
    expect(model.chapterAcceptanceDesk.statusLabel).toBe('已入库')
    expect(model.chapterAcceptanceDesk.approvalBlocker).toBeNull()
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('accept_chapter_and_continue')
  })

  test('blocked invalid admission remains an explicit terminal blocker', () => {
    const invalidChapter = {
      ...chapters[0],
      raw_payload: {
        ...chapters[0].raw_payload,
        prose_admission: {
          status: 'blocked_invalid',
          quality_warnings: [{ code: 'invalid_prose', source: 'validation', message: '正文为空或结构无效' }],
          story_state_status: 'pending',
        },
      },
    }
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [invalidChapter, chapters[1]],
      activeChapter: invalidChapter,
      materialScore: { score: 82, can_generate: true },
      reviews: [proseQualityReview()],
    })

    expect(model.chapterAcceptanceDesk.admissionStatus).toBe('blocked_invalid')
    expect(model.chapterAcceptanceDesk.statusLabel).toBe('正文无效，未入库')
    expect(model.chapterAcceptanceDesk.acceptanceReasons.join('；')).toContain('正文为空或结构无效')
    expect(model.chapterAcceptanceDesk.approvalBlocker?.type).toBe('blocked_invalid')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('open_generation_diagnostics')
  })

  test('blocked invalid admission remains visible when the rejected chapter has no prose', () => {
    const invalidChapter = {
      ...chapters[1],
      raw_payload: {
        ...chapters[1].raw_payload,
        prose_admission: {
          status: 'blocked_invalid',
          quality_warnings: [{ code: 'invalid_prose', source: 'validation', message: '正文为空或结构无效' }],
          story_state_status: 'pending',
        },
      },
    }
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], invalidChapter],
      activeChapter: invalidChapter,
      materialScore: { score: 82, can_generate: true },
      reviews: [],
    })

    expect(model.chapterAcceptanceDesk.visible).toBe(true)
    expect(model.chapterAcceptanceDesk.admissionStatus).toBe('blocked_invalid')
    expect(model.chapterAcceptanceDesk.statusLabel).toBe('正文无效，未入库')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('open_generation_diagnostics')
  })

  test('restores a no-prose blocked invalid terminal state from a standalone run record', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[1],
      materialScore: { score: 82, can_generate: true },
      reviews: [],
      activeRuns: [{
        id: 901,
        run_type: 'generate_prose',
        status: 'failed',
        created_at: '2026-07-13T12:00:00.000Z',
        output_ref: JSON.stringify({
          error: '正文为空或结构无效',
          error_code: 'PROSE_ADMISSION_BLOCKED_INVALID',
          admission_status: 'blocked_invalid',
          chapter_id: 102,
          chapter_no: 2,
          pipeline: [{ key: 'review', status: 'failed' }],
        }),
      }],
    })

    expect(model.chapterAcceptanceDesk.visible).toBe(true)
    expect(model.chapterAcceptanceDesk.admissionStatus).toBe('blocked_invalid')
    expect(model.chapterAcceptanceDesk.statusLabel).toBe('正文无效，未入库')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('open_generation_diagnostics')
  })

  test('does not reuse a top-level run admission from a different chapter', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [],
      activeRuns: [{
        id: 801,
        created_at: '2026-07-13T10:00:00.000Z',
        output_ref: JSON.stringify({
          chapter_id: 102,
          chapter_no: 2,
          admission_status: 'blocked_invalid',
          quality_warnings: [{ source: 'validation', code: 'invalid_prose', message: '第二章正文无效' }],
        }),
      }],
    })

    expect(model.chapterAcceptanceDesk.admissionStatus).toBe('')
    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_quality_check')
  })

  test('uses the latest persisted run admission for the current chapter regardless of input order', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [],
      activeRuns: [
        {
          id: 802,
          created_at: '2026-07-13T11:00:00.000Z',
          output_ref: JSON.stringify({
            chapter_id: 101,
            chapter_no: 1,
            admission_status: 'accepted_with_warnings',
            quality_score: 72,
            story_state_status: 'pending',
            quality_warnings: [{ source: 'quality', code: 'score_low', message: '评分低于建议目标' }],
          }),
        },
        {
          id: 801,
          created_at: '2026-07-13T10:00:00.000Z',
          output_ref: JSON.stringify({
            chapter_id: 101,
            chapter_no: 1,
            admission_status: 'accepted',
            story_state_status: 'synced',
          }),
        },
      ],
    })

    expect(model.chapterAcceptanceDesk.admissionStatus).toBe('accepted_with_warnings')
    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_state_sync')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('sync_story_state')
    expect(model.chapterAcceptanceDesk.qualityWarnings[0]?.message).toBe('评分低于建议目标')
  })

  test('ignores stale blocked_invalid runs when the chapter already has stored prose', () => {
    const writtenChapter = {
      ...chapters[0],
      chapter_text: '盟友已经入局，通道尽头的裂缝又裂开一寸。'.repeat(40),
      raw_payload: {
        ...(chapters[0].raw_payload || {}),
      },
    }
    delete (writtenChapter.raw_payload as any).prose_admission
    delete (writtenChapter.raw_payload as any).proseAdmission
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [writtenChapter, chapters[1]],
      activeChapter: writtenChapter,
      materialScore: { score: 82, can_generate: true },
      reviews: [],
      activeRuns: [
        {
          id: 431,
          status: 'success',
          created_at: '2026-07-14T03:22:23.483Z',
          output_ref: JSON.stringify({
            truncated: true,
            reason: 'storage_compaction',
            chapter_id: writtenChapter.id,
            chapter_no: writtenChapter.chapter_no,
            admission_status: 'accepted_with_warnings',
            quality_warnings: [{ source: 'quality', code: 'quality_advisory', message: '替换一级禁用词' }],
            preview: '{"chapter":{"id":' + writtenChapter.id + ',"chapter_no":' + writtenChapter.chapter_no + '}}',
          }),
        },
        {
          id: 430,
          status: 'failed',
          created_at: '2026-07-14T03:06:57.786Z',
          output_ref: JSON.stringify({
            error: '模型未返回正文',
            error_code: 'PROSE_ADMISSION_BLOCKED_INVALID',
            admission_status: 'blocked_invalid',
            chapter_id: writtenChapter.id,
            chapter_no: writtenChapter.chapter_no,
          }),
        },
      ],
    })

    expect(model.chapterAcceptanceDesk.admissionStatus).toBe('accepted_with_warnings')
    expect(model.chapterAcceptanceDesk.statusLabel).toBe('已入库，建议修订')
    expect(model.chapterAcceptanceDesk.approvalBlocker).toBeNull()
  })

  test('does not terminal-block a written chapter from an older failed admission-only run', () => {
    const writtenChapter = {
      ...chapters[0],
      chapter_text: '通道里的雾气更浓，老陈的呼吸声贴着岩壁。'.repeat(40),
      has_prose: true,
      word_count: 2400,
      raw_payload: {},
    }
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [writtenChapter, chapters[1]],
      activeChapter: writtenChapter,
      materialScore: { score: 82, can_generate: true },
      reviews: [],
      activeRuns: [{
        id: 430,
        status: 'failed',
        created_at: '2026-07-14T03:06:57.786Z',
        output_ref: JSON.stringify({
          error: '模型未返回正文',
          error_code: 'PROSE_ADMISSION_BLOCKED_INVALID',
          admission_status: 'blocked_invalid',
          chapter_id: writtenChapter.id,
          chapter_no: writtenChapter.chapter_no,
        }),
      }],
    })

    expect(model.chapterAcceptanceDesk.admissionStatus).not.toBe('blocked_invalid')
    expect(model.chapterAcceptanceDesk.statusLabel).not.toBe('正文无效，未入库')
  })

  test('surfaces a clear story-state panel and primary sync action when prose is stored but state is pending', () => {
    const writtenChapter = {
      ...chapters[0],
      chapter_text: '通道尽头的裂缝又裂开一寸，老陈的符文随之颤了一下。'.repeat(30),
      raw_payload: {
        ...(chapters[0].raw_payload || {}),
        prose_admission: {
          status: 'accepted_with_warnings',
          quality_score: 88,
          story_state_status: 'pending',
          story_state_warning: {
            hard_failures: [
              { key: 'character_state_delta_sync', message: '本章计划的关键状态变化未记录：character_state_delta_sync' },
              { key: 'chapter_handoff_delta_sync', message: '本章计划的关键状态变化未记录：chapter_handoff_delta_sync' },
            ],
          },
          quality_warnings: [{ source: 'quality', code: 'quality_advisory', message: '替换一级禁用词' }],
        },
      },
    }
    const model = buildWritingCockpitModel({
      project: {
        ...project,
        reference_config: {
          ...(project.reference_config || {}),
          story_state: { last_updated_chapter: 10 },
        },
      },
      outlines,
      chapters: [writtenChapter, chapters[1]],
      activeChapter: writtenChapter,
      materialScore: { score: 82, can_generate: true },
      reviews: [],
    })

    expect(model.chapterAcceptanceDesk.visible).toBe(true)
    expect(model.chapterAcceptanceDesk.storyStateSynced).toBe(false)
    expect(model.chapterAcceptanceDesk.storyStatePanel?.status).toBe('pending')
    expect(model.chapterAcceptanceDesk.storyStatePanel?.headline).toContain('尚未写入')
    expect(model.chapterAcceptanceDesk.storyStatePanel?.reasons.join('；')).toContain('character_state_delta_sync')
    expect(model.chapterAcceptanceDesk.storyStatePanel?.primaryAction?.key).toBe('sync_story_state')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('sync_story_state')
    expect(model.chapterAcceptanceDesk.statusLabel).toContain('待同步状态机')
  })

  test('explains draft_only mode skip and still offers manual story-state sync', () => {
    const writtenChapter = {
      ...chapters[0],
      chapter_text: '他把秩序核心捏进掌心，决定先活着离开回廊。'.repeat(30),
      raw_payload: {
        prose_admission: {
          status: 'accepted',
          story_state_status: 'pending',
          story_state_warning: {
            skipped: true,
            reason: 'draft_only production mode',
          },
        },
      },
    }
    const model = buildWritingCockpitModel({
      project: {
        ...project,
        reference_config: { story_state: { last_updated_chapter: 0 } },
      },
      outlines,
      chapters: [writtenChapter, chapters[1]],
      activeChapter: writtenChapter,
      materialScore: { score: 82, can_generate: true },
      reviews: [],
    })

    expect(model.chapterAcceptanceDesk.storyStatePanel?.status).toBe('skipped')
    expect(model.chapterAcceptanceDesk.storyStatePanel?.summary).toContain('不会自动写状态机')
    expect(model.chapterAcceptanceDesk.storyStatePanel?.primaryAction?.label).toContain('同步故事状态')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('sync_story_state')
  })

  test('shows established event preview when present', () => {
    const writtenChapter = {
      ...chapters[0],
      chapter_no: 2,
      chapter_text: '他把秩序核心捏进掌心，决定先活着离开回廊。'.repeat(30),
      raw_payload: {
        prose_admission: {
          status: 'accepted',
          story_state_status: 'synced',
        },
      },
    }
    const model = buildWritingCockpitModel({
      project: {
        ...project,
        reference_config: {
          story_state: {
            last_updated_chapter: 2,
            established_events: [
              {
                kind: 'death',
                subject: '林战',
                predicate: '死亡方式',
                fact: '林战因违规开门被剥皮而死',
                status: 'confirmed',
                lock_level: 'hard',
                source_excerpt: '开了不该开的门',
              },
            ],
          },
        },
      },
      outlines,
      chapters: [writtenChapter, chapters[1]],
      activeChapter: writtenChapter,
      materialScore: { score: 82, can_generate: true },
      reviews: [],
    })

    expect(model.chapterAcceptanceDesk.storyStatePanel?.establishedEvents?.confirmedCount).toBe(1)
    expect(model.chapterAcceptanceDesk.storyStatePanel?.establishedEvents?.preview[0]).toContain('林战')
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

  test('readability review surfaces oh-story deslop risks as soft repair work', () => {
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
              meme_sense: { intensity: '克制', immersion_risks: [] },
              ai_smell: {
                level: '中度',
                pattern_hits: [
                  { type: '禁用词', evidence: '眼神复杂' },
                  { type: '总结体', evidence: '新的篇章开始了' },
                ],
                rewrite_tactics: ['删总结体', '用动作代替抽象心理'],
              },
              issues: [],
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.readabilityReview?.aiSmellRisk).toBe(true)
    expect(model.chapterAcceptanceDesk.readabilityReview?.aiSmellHitCount).toBe(2)
    expect(model.chapterAcceptanceDesk.readabilityReview?.aiSmellLabel).toBe('AI味中度 2')
    expect(model.chapterAcceptanceDesk.readabilityReview?.riskLabel).toBe('AI味中度 2')
    expect(model.chapterAcceptanceDesk.readabilityReview?.aiSmellTactics).toContain('删总结体')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('去AI味：AI味中度 2')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先去AI味')
  })

  test('surfaces scene-card receipt failures as repairable delivery work', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          status: 'warn',
          payload: {
            self_check: {
              review: {
                score: 84,
                passed: false,
                status: 'warn',
                issues: [],
                quality_audit_checks: [
                  {
                    key: 'scene_card_receipt_2_undelivered',
                    label: '场景卡回执证据复核',
                    status: 'fail',
                    scene_no: 2,
                    fields: ['目标/阻碍/状态变化', '感知锚点'],
                    evidence: '场景2《盟友改口》scene_card_receipts 标记未兑现。',
                    fix: '按 delivered=false 的字段修正文，再重写 scene_card_receipts。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('复核场景回执：场景回执缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先复核场景')
  })

  test('reads nested scene-card delivery receipts as repairable delivery work', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          status: 'warn',
          payload: {
            self_check: {
              review: {
                score: 84,
                passed: false,
                status: 'warn',
                issues: [],
                quality_audit_checks: [],
                oh_story_delivery_receipts: {
                  scene_card_receipts: [
                    {
                      scene_no: 2,
                      title: '盟友改口',
                      delivered: false,
                      fields: ['目标/阻碍/状态变化', '感知锚点'],
                      remaining_risk: '场景卡要求盟友当场改口，但正文只写了沉默。',
                      evidence: '场景2没有出现改口动作。',
                    },
                  ],
                },
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.sceneCardReceipt?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.sceneCardReceipt?.label).toBe('场景回执缺口 1')
    expect(model.chapterAcceptanceDesk.sceneCardReceipt?.scenes).toContain('场景2')
    expect(model.chapterAcceptanceDesk.sceneCardReceipt?.fields).toContain('目标/阻碍/状态变化')
    expect(model.chapterAcceptanceDesk.sceneCardReceipt?.evidence.join('；')).toContain('场景卡要求盟友当场改口')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('复核场景回执：场景回执缺口 1')
  })

  test('surfaces quality audit failures as repairable delivery work', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          status: 'warn',
          payload: {
            self_check: {
              review: {
                score: 84,
                passed: false,
                status: 'warn',
                issues: [],
                quality_audit_checks: [
                  {
                    key: 'purpose_tag_density_gap',
                    label: '目的词详略分配',
                    status: 'fail',
                    evidence: '爽点场景只用一句摘要带过，过渡场景反而展开三段环境描写。',
                    fix: '按目的词重排详略：爽点/打脸展开出手过程，过渡压缩到1-2句。',
                    strategy: 'rewrite',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.qualityAudit?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.qualityAudit?.label).toBe('质量诊断缺口 1')
    expect(model.chapterAcceptanceDesk.qualityAudit?.checks).toContain('目的词详略分配')
    expect(model.chapterAcceptanceDesk.qualityAudit?.evidence[0]).toContain('爽点场景只用一句摘要带过')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('修质量诊断：质量诊断缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先修质量诊断')
  })

  test('surfaces quality audit sync misses as next-chapter quality carry-over', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        qualityAuditSyncReview(),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.qualityAuditSync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.qualityAuditSync?.label).toBe('质量诊断缺口 2')
    expect(model.chapterAcceptanceDesk.qualityAuditSync?.missedCount).toBe(2)
    expect(model.chapterAcceptanceDesk.qualityAuditSync?.evidence.join('｜')).toContain('信息负载')
    expect(model.chapterAcceptanceDesk.qualityAuditSync?.nextActions.join('｜')).toContain('本章不可删除')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补诊断承接：质量诊断缺口 2')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补质量诊断')
  })

  test('surfaces quality audit repair receipt gaps as a delivery risk queue item', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        qualityAuditRepairReceiptSyncReview(),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.qualityAuditRepairReceiptSync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.qualityAuditRepairReceiptSync?.label).toBe('质量诊断修复回执缺口 1')
    expect(model.chapterAcceptanceDesk.qualityAuditRepairReceiptSync?.missedCount).toBe(1)
    expect(model.chapterAcceptanceDesk.qualityAuditRepairReceiptSync?.receiptCount).toBe(2)
    expect(model.chapterAcceptanceDesk.qualityAuditRepairReceiptSync?.evidence.join('｜')).toContain('changed_evidence')
    expect(model.chapterAcceptanceDesk.qualityAuditRepairReceiptSync?.nextActions.join('｜')).toContain('quality_audit_repair_receipts')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('复核质量修复回执：质量诊断修复回执缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补质量回执')
  })

  test('surfaces chapter handoff sync gaps as repairable continuity work', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        chapterHandoffSyncReview(),
        chapterHandoffDeltaSyncReview(),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.chapterHandoffSync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.chapterHandoffSync?.label).toBe('章首承接缺口 2')
    expect(model.chapterAcceptanceDesk.chapterHandoffSync?.missedCount).toBe(2)
    expect(model.chapterAcceptanceDesk.chapterHandoffSync?.evidence.join('｜')).toContain('玻璃门水痕')
    expect(model.chapterAcceptanceDesk.chapterHandoffDeltaSync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.chapterHandoffDeltaSync?.label).toBe('章末交接缺口 1')
    expect(model.chapterAcceptanceDesk.chapterHandoffDeltaSync?.missedCount).toBe(1)
    expect(model.chapterAcceptanceDesk.chapterHandoffDeltaSync?.nextActions.join('｜')).toContain('先追查第三个人')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补章首承接：章首承接缺口 2')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补章末交接：章末交接缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补章首承接')
  })

  test('surfaces oh-story intent and benchmark recall sync gaps as repairable delivery work', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        intentConfirmationSyncReview(),
        benchmarkRecallSyncReview(),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.intentConfirmationSync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.intentConfirmationSync?.label).toBe('意图确认缺口 2')
    expect(model.chapterAcceptanceDesk.intentConfirmationSync?.missedCount).toBe(2)
    expect(model.chapterAcceptanceDesk.intentConfirmationSync?.evidence.join('｜')).toContain('章尾承接')
    expect(model.chapterAcceptanceDesk.intentConfirmationSync?.nextActions.join('｜')).toContain('写前意图')
    expect(model.chapterAcceptanceDesk.benchmarkRecallSync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.benchmarkRecallSync?.label).toBe('文风召回缺口 1')
    expect(model.chapterAcceptanceDesk.benchmarkRecallSync?.missedCount).toBe(1)
    expect(model.chapterAcceptanceDesk.benchmarkRecallSync?.evidence.join('｜')).toContain('节奏参照')
    expect(model.chapterAcceptanceDesk.benchmarkRecallSync?.nextActions.join('｜')).toContain('不复制桥段原句')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补意图确认：意图确认缺口 2')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补文风召回：文风召回缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补意图确认')
  })

  test('surfaces nested pre-draft execution receipt misses as repairable delivery work', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          payload: {
            oh_story_delivery_receipts: {
              pre_draft_execution_receipts: {
                intent_confirmation_checks: [
                  {
                    key: 'emotion_target',
                    label: '情绪目标',
                    delivered: false,
                    evidence: '正文只写了断臂回府，没有从压抑转为当众夺回主动权。',
                    remaining_risk: '写前意图里的情绪反转没有落到正文。',
                  },
                ],
                benchmark_recall_checks: [
                  {
                    key: 'rhythm_reference',
                    label: '节奏参照',
                    delivered: false,
                    evidence: '爆发后没有冷却承接，直接跳到总结。',
                    remaining_risk: '文风召回里的先压后爆没有执行。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.intentConfirmationSync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.intentConfirmationSync?.label).toBe('意图确认缺口 1')
    expect(model.chapterAcceptanceDesk.intentConfirmationSync?.missedCount).toBe(1)
    expect(model.chapterAcceptanceDesk.intentConfirmationSync?.evidence.join('｜')).toContain('写前意图里的情绪反转没有落到正文')
    expect(model.chapterAcceptanceDesk.benchmarkRecallSync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.benchmarkRecallSync?.label).toBe('文风召回缺口 1')
    expect(model.chapterAcceptanceDesk.benchmarkRecallSync?.missedCount).toBe(1)
    expect(model.chapterAcceptanceDesk.benchmarkRecallSync?.evidence.join('｜')).toContain('文风召回里的先压后爆没有执行')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补意图确认：意图确认缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补文风召回：文风召回缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补意图确认')
  })

  test('surfaces write-preparation execution misses as repairable delivery work', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          payload: {
            oh_story_delivery_receipts: {
              pre_draft_execution_receipts: {
                write_preparation_checks: [
                  {
                    key: 'asset_linkage',
                    label: '旧钥匙挂钩',
                    delivered: false,
                    evidence: '正文用了旧钥匙开门，但没交代旧钥匙和母亲旧铺印记的关系。',
                    remaining_risk: '孤立资产仍未挂到主线证据链。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.writePreparation?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.writePreparation?.label).toBe('写前准备缺口 1')
    expect(model.chapterAcceptanceDesk.writePreparation?.missedCount).toBe(1)
    expect(model.chapterAcceptanceDesk.writePreparation?.evidence.join('｜')).toContain('孤立资产仍未挂到主线证据链')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补写前准备：写前准备缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补写前准备')
  })

  test('surfaces prose self-review chapter handoff misses as repairable delivery work', () => {
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
              review: {
                score: 86,
                passed: true,
                status: 'pass',
                issues: [],
                chapter_handoff_checks: [
                  {
                    key: 'opening_obligation',
                    label: '开篇义务',
                    status: 'warn',
                    evidence: '前300字直接切到新场景，没有接住上一章玻璃门水痕。',
                    fix: '先让主角回到玻璃门前确认水痕名单，再推进新线索。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.chapterHandoffSync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.chapterHandoffSync?.label).toBe('章首承接缺口 1')
    expect(model.chapterAcceptanceDesk.chapterHandoffSync?.missedCount).toBe(1)
    expect(model.chapterAcceptanceDesk.chapterHandoffSync?.evidence.join('｜')).toContain('前300字直接切到新场景')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补章首承接：章首承接缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补章首承接')
  })

  test('surfaces source readiness misses as repairable delivery work', () => {
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
              review: {
                score: 84,
                passed: true,
                status: 'pass',
                issues: [],
                source_readiness_checks: [
                  {
                    key: 'artifact_state',
                    label: '黑色钥匙状态',
                    status: 'warn',
                    evidence: '正文把黑色钥匙当成已解锁道具，但写前来源表标记为 missing。',
                    fix: '先补角色确认钥匙来源和限制，再让它参与本章反制。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.sourceReadiness?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.sourceReadiness?.label).toBe('来源就绪缺口 1')
    expect(model.chapterAcceptanceDesk.sourceReadiness?.missedCount).toBe(1)
    expect(model.chapterAcceptanceDesk.sourceReadiness?.evidence.join('｜')).toContain('黑色钥匙当成已解锁道具')
    expect(model.chapterAcceptanceDesk.sourceReadiness?.nextActions.join('｜')).toContain('确认钥匙来源和限制')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补来源就绪：来源就绪缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补来源')
  })

  test('surfaces state tracking misses as repairable delivery work', () => {
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
              review: {
                score: 84,
                passed: true,
                status: 'pass',
                issues: [],
                state_tracking_checks: [
                  {
                    key: 'character_state',
                    label: '周远状态',
                    status: 'fail',
                    evidence: '正文让周远直接出手，但上一章状态仍是昏迷未醒。',
                    fix: '先补周远苏醒代价和行动限制，再参与本章选择。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.stateTracking?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.stateTracking?.label).toBe('状态跟踪缺口 1')
    expect(model.chapterAcceptanceDesk.stateTracking?.missedCount).toBe(1)
    expect(model.chapterAcceptanceDesk.stateTracking?.evidence.join('｜')).toContain('上一章状态仍是昏迷未醒')
    expect(model.chapterAcceptanceDesk.stateTracking?.nextActions.join('｜')).toContain('苏醒代价和行动限制')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补状态跟踪：状态跟踪缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补状态')
  })

  test('surfaces style boundary misses as repairable delivery work', () => {
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
              review: {
                score: 84,
                passed: true,
                status: 'pass',
                issues: [],
                style_boundary_checks: [
                  {
                    key: 'source_copy_risk',
                    label: '参照句式过近',
                    status: 'warn',
                    evidence: '正文连续三句沿用标杆样章的句式节奏，只有名词替换。',
                    fix: '保留压迫感，但改用本章动作链和角色口吻重写。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.styleBoundary?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.styleBoundary?.label).toBe('风格边界缺口 1')
    expect(model.chapterAcceptanceDesk.styleBoundary?.evidence.join('｜')).toContain('标杆样章的句式节奏')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('校风格边界：风格边界缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先校风格边界')
  })

  test('surfaces information flow misses as repairable delivery work', () => {
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
              review: {
                score: 84,
                passed: true,
                status: 'pass',
                issues: [],
                information_flow_checks: [
                  {
                    key: 'reveal_order',
                    label: '线索揭示顺序',
                    status: 'fail',
                    evidence: '正文先解释封条真相，再让主角发现供词，导致悬念提前泄底。',
                    fix: '先写主角误判和供词异常，再用封条真相收束本场。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.informationFlow?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.informationFlow?.label).toBe('信息流缺口 1')
    expect(model.chapterAcceptanceDesk.informationFlow?.evidence.join('｜')).toContain('悬念提前泄底')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('调信息流：信息流缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先调信息流')
  })

  test('surfaces expectation threshold misses as repairable delivery work', () => {
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
              review: {
                score: 84,
                passed: true,
                status: 'pass',
                issues: [],
                expectation_threshold_checks: [
                  {
                    key: 'page_turn_question',
                    label: '章末追问强度',
                    status: 'warn',
                    evidence: '章末只说封条异常，没有形成读者必须点下一章的具体问题。',
                    fix: '把封条异常落到一个未揭身份、代价或选择压力上。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.expectationThreshold?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.expectationThreshold?.label).toBe('期待阈值缺口 1')
    expect(model.chapterAcceptanceDesk.expectationThreshold?.evidence.join('｜')).toContain('必须点下一章')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补期待阈值：期待阈值缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补期待阈值')
  })

  test('surfaces story loop misses as repairable delivery work', () => {
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
              review: {
                score: 84,
                passed: true,
                status: 'pass',
                issues: [],
                story_loop_checks: [
                  {
                    key: 'setup_payoff_loop',
                    label: '设问回收闭环',
                    status: 'fail',
                    evidence: '本章开头抛出谁换了封条，但结尾没有推进答案、代价或新问题。',
                    fix: '至少推进一个答案碎片，并把新问题挂到下一章钩子。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.storyLoop?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.storyLoop?.label).toBe('故事闭环缺口 1')
    expect(model.chapterAcceptanceDesk.storyLoop?.evidence.join('｜')).toContain('没有推进答案')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补故事闭环：故事闭环缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补闭环')
  })

  test('surfaces emotional arc misses as repairable delivery work', () => {
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
              review: {
                score: 84,
                passed: true,
                status: 'pass',
                issues: [],
                emotional_arc_checks: [
                  {
                    key: 'pressure_release',
                    label: '压迫释放弧',
                    status: 'fail',
                    evidence: '开场压迫后直接解释规则，没有写出调动、反制和爽感释放。',
                    fix: '把压迫落到现场选择，用动作和对白完成反制，再给旁观反馈。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.emotionalArc?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.emotionalArc?.label).toBe('情绪弧缺口 1')
    expect(model.chapterAcceptanceDesk.emotionalArc?.evidence.join('｜')).toContain('爽感释放')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补情绪弧：情绪弧缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补情绪弧')
  })

  test('surfaces chapter hook misses as repairable delivery work', () => {
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
              review: {
                score: 84,
                passed: true,
                status: 'pass',
                issues: [],
                chapter_hook_checks: [
                  {
                    key: 'ending_page_turn',
                    label: '章尾翻页钩子',
                    status: 'warn',
                    evidence: '最后一幕只写封条异常，没有形成具体翻页问题或下一章压力。',
                    fix: '把封条异常落到未揭身份和立即到来的选择压力上。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.chapterHook?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.chapterHook?.label).toBe('章级钩子缺口 1')
    expect(model.chapterAcceptanceDesk.chapterHook?.evidence.join('｜')).toContain('具体翻页问题')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补章级钩子：章级钩子缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补章钩')
  })

  test('surfaces paragraph hook misses as repairable delivery work', () => {
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
              review: {
                score: 84,
                passed: true,
                status: 'pass',
                issues: [],
                paragraph_hook_checks: [
                  {
                    key: 'micro_hook_stall',
                    label: '段落微推进',
                    status: 'fail',
                    evidence: '连续六段只写环境和站位，没有信息、风险、情绪或关系变化。',
                    fix: '加入暗牌、倒计时或对话压迫，让每3-5段产生可见变化。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.paragraphHook?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.paragraphHook?.label).toBe('段落级钩子缺口 1')
    expect(model.chapterAcceptanceDesk.paragraphHook?.evidence.join('｜')).toContain('连续六段')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补段落钩子：段落级钩子缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补段钩')
  })

  test('surfaces suspense misses as repairable delivery work', () => {
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
              review: {
                score: 84,
                passed: true,
                status: 'pass',
                issues: [],
                suspense_checks: [
                  {
                    key: 'question_misdirect_answer',
                    label: '疑问误导答案循环',
                    status: 'fail',
                    evidence: '正文只抛出封条异常，没有给可信误导、局部答案或新期待。',
                    fix: '先提出谁换封条的问题，再给假提示，章末公布一片答案并立起新问题。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.suspense?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.suspense?.label).toBe('悬念编排缺口 1')
    expect(model.chapterAcceptanceDesk.suspense?.evidence.join('｜')).toContain('可信误导')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补悬念编排：悬念编排缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补悬念')
  })

  test('surfaces asset linkage misses as repairable delivery work', () => {
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
              review: {
                score: 84,
                passed: true,
                status: 'pass',
                issues: [],
                asset_linkage_checks: [
                  {
                    key: 'isolated_assets',
                    label: '孤立资产',
                    status: 'fail',
                    evidence: '旧钥匙只被点名，没有推进目标、制造阻碍、兑现伏笔或打开章尾钩子。',
                    fix: '让旧钥匙触发暗格并带来锁死代价。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.assetLinkage?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.assetLinkage?.label).toBe('资产挂钩缺口 1')
    expect(model.chapterAcceptanceDesk.assetLinkage?.evidence.join('｜')).toContain('旧钥匙')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('挂资产：资产挂钩缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补资产挂钩')
  })

  test('surfaces asset linkage sync misses as repairable delivery work', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        {
          id: 911,
          chapter_id: chapters[0].id,
          review_type: 'asset_linkage_sync',
          status: 'warn',
          created_at: '2026-06-10T09:00:00.000Z',
          payload: JSON.stringify({
            chapter_id: chapters[0].id,
            chapter_no: chapters[0].chapter_no,
            asset_linkage_sync: {
              status: 'warn',
              label: '资产挂钩缺口 2',
              missed_count: 2,
              missed: [
                { label: '孤立资产', text: '旧钥匙只被点名，没有推进目标或制造阻碍。' },
                { label: '关系图风险', text: '禁门规则仍没有明确触发者和代价。' },
              ],
              next_actions: [
                '下一章必须先处理关系图风险：孤立资产要接核心关系，缺拥有者资产要明确归属、触发者、限制和代价。',
              ],
            },
          }),
        },
      ],
    })

    expect(model.chapterAcceptanceDesk.assetLinkage?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.assetLinkage?.label).toBe('资产挂钩缺口 2')
    expect(model.chapterAcceptanceDesk.assetLinkage?.missedCount).toBe(2)
    expect(model.chapterAcceptanceDesk.assetLinkage?.evidence.join('｜')).toContain('旧钥匙只被点名')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('挂资产：资产挂钩缺口 2')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补资产挂钩')
  })

  test('surfaces dialogue misses as repairable delivery work', () => {
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
              review: {
                score: 84,
                passed: true,
                status: 'pass',
                issues: [],
                dialogue_checks: [
                  {
                    key: 'subtext_agenda',
                    label: '潜台词与议程',
                    status: 'fail',
                    evidence: '周薄森直接解释真实目的，整段对白像说明书，没有权力博弈或信息差。',
                    fix: '把真实目的改成借口、试探、回避和动作反应。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.dialogue?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.dialogue?.label).toBe('对白质量缺口 1')
    expect(model.chapterAcceptanceDesk.dialogue?.evidence.join('｜')).toContain('说明书')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('修对白：对白质量缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先修对白')
  })

  test('surfaces plot dynamics misses as repairable delivery work', () => {
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
              review: {
                score: 84,
                passed: true,
                status: 'pass',
                issues: [],
                plot_dynamics_checks: [
                  {
                    key: 'goal_obstacle_action_feedback',
                    label: '剧情闭环',
                    status: 'fail',
                    evidence: '红色阀门没有形成目标、阻碍、行动、代价/反馈、新期待闭环。',
                    fix: '先给账本编号目标和协会阻碍，再写主角行动、代价反馈和新的章末期待。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.plotDynamics?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.plotDynamics?.label).toBe('剧情动力缺口 1')
    expect(model.chapterAcceptanceDesk.plotDynamics?.evidence.join('｜')).toContain('红色阀门')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补动力：剧情动力缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补剧情动力')
  })

  test('surfaces character relation misses as repairable delivery work', () => {
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
              review: {
                score: 84,
                passed: true,
                status: 'pass',
                issues: [],
                character_relation_checks: [
                  {
                    key: 'goal_ownership',
                    label: '目标归属',
                    status: 'fail',
                    evidence: '主角只是在帮林栖雨追查旧案，缺少自己的诉求、主动选择和代价。',
                    fix: '把旧案改成会影响主角阵盘资格的风险，让主角主动押上名额交换线索。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.characterRelation?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.characterRelation?.label).toBe('角色关系缺口 1')
    expect(model.chapterAcceptanceDesk.characterRelation?.evidence.join('｜')).toContain('帮林栖雨')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('修关系：角色关系缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先修角色关系')
  })

  test('surfaces character behavior misses as repairable delivery work', () => {
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
              review: {
                score: 84,
                passed: true,
                status: 'pass',
                issues: [],
                character_behavior_checks: [
                  {
                    key: 'motivation_specificity',
                    label: '动机具体性',
                    status: 'fail',
                    evidence: '主角只是想变强，缺少具体起因、情感理由和动机演变铺垫。',
                    fix: '把动机改成阵盘资格被夺的具体事件，并补主角为母亲旧约承担代价的情感理由。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.characterBehavior?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.characterBehavior?.label).toBe('角色行为缺口 1')
    expect(model.chapterAcceptanceDesk.characterBehavior?.evidence.join('｜')).toContain('只是想变强')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('修行为：角色行为缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先修角色行为')
  })

  test('surfaces conflict structure misses as repairable delivery work', () => {
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
              review: {
                score: 84,
                passed: true,
                status: 'pass',
                issues: [],
                conflict_structure_checks: [
                  {
                    key: 'no_exit_stakes',
                    label: '有进无出',
                    status: 'fail',
                    evidence: '主角可以随时离开账房，没人阻止他拿到账本，也没有退出代价。',
                    fix: '让内门执事封门并押上阵盘资格，必须完成账本核验才能脱身。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.conflictStructure?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.conflictStructure?.label).toBe('冲突结构缺口 1')
    expect(model.chapterAcceptanceDesk.conflictStructure?.evidence.join('｜')).toContain('随时离开账房')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('加冲突：冲突结构缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先修冲突结构')
  })

  test('surfaces opening misses as repairable delivery work', () => {
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
              review: {
                score: 84,
                passed: true,
                status: 'pass',
                issues: [],
                opening_checks: [
                  {
                    key: 'protagonist_entry_delay',
                    label: '300字主角登场',
                    status: 'fail',
                    evidence: '开头连续写宗门天气和旧史，主角第900字才出现，1000字内没有期待点。',
                    fix: '第一段直接让主角被叫到验阵台，300字内亮明目标，1000字内给出阵盘资格被夺的爽点/危机。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.opening?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.opening?.label).toBe('开篇设计缺口 1')
    expect(model.chapterAcceptanceDesk.opening?.evidence.join('｜')).toContain('主角第900字')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('改开篇：开篇设计缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先修开篇')
  })

  test('surfaces bridge unit misses as repairable delivery work', () => {
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
              review: {
                score: 84,
                passed: true,
                status: 'pass',
                issues: [],
                bridge_unit_checks: [
                  {
                    key: 'expectation_chain_break',
                    label: '连续期待',
                    status: 'fail',
                    evidence: '旧城会审兑现旧期待后直接散场，章尾没有新目标，也没有高潮中埋钩子。',
                    fix: '兑现账本爽点前先挂赤炉城供奉新目标，高潮中埋钩子，章尾给连续小期待。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.bridgeUnit?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.bridgeUnit?.label).toBe('桥段节奏缺口 1')
    expect(model.chapterAcceptanceDesk.bridgeUnit?.evidence.join('｜')).toContain('章尾没有新目标')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补桥段：桥段节奏缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补桥段节奏')
  })

  test('surfaces reversal misses as repairable delivery work', () => {
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
              review: {
                score: 84,
                passed: true,
                status: 'pass',
                issues: [],
                reversal_checks: [
                  {
                    key: 'setup_clues_missing',
                    label: '铺垫暗示',
                    status: 'fail',
                    evidence: '执事身份反转是揭示时才出现的新信息，前文没有3处公平暗示，揭示后只靠长解释说明。',
                    fix: '在验印、账页错位、证人迟疑里提前埋3处暗示，揭示时用旧印反证直接改变局势。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.reversal?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.reversal?.label).toBe('反转设计缺口 1')
    expect(model.chapterAcceptanceDesk.reversal?.evidence.join('｜')).toContain('没有3处公平暗示')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补反转：反转设计缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补反转设计')
  })

  test('surfaces showdown misses as repairable delivery work', () => {
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
              review: {
                score: 84,
                passed: true,
                status: 'pass',
                issues: [],
                showdown_checks: [
                  {
                    key: 'payoff_release_missing',
                    label: '爽点释放',
                    status: 'fail',
                    evidence: '主角亮出旧印后执事没有受到对应压制，旁观者只统一震惊，底牌释放后没有新目标。',
                    fix: '让执事当场失去审判资格，分层写友方、敌方、中立方反应，并补长老追查内库阵图的新门槛。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.showdown?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.showdown?.label).toBe('高潮对抗缺口 1')
    expect(model.chapterAcceptanceDesk.showdown?.evidence.join('｜')).toContain('没有受到对应压制')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补高潮：高潮对抗缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补高潮对抗')
  })

  test('surfaces prose craft misses as repairable delivery work', () => {
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
              review: {
                score: 84,
                passed: true,
                status: 'pass',
                issues: [],
                prose_craft_checks: [
                  {
                    key: 'omniscient_crowd_camera',
                    label: '远景概括',
                    status: 'fail',
                    evidence: '高潮段连续写全场死寂、所有人震惊，没有主角深度限知，也没有身体细节或环境交互承接。',
                    fix: '改成主角听见审判木裂响、指尖沾到旧印冷灰，用身体动作和视线承接围观者分层反应。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.proseCraft?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.proseCraft?.label).toBe('正文工艺缺口 1')
    expect(model.chapterAcceptanceDesk.proseCraft?.evidence.join('｜')).toContain('没有主角深度限知')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('修工艺：正文工艺缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先修正文工艺')
  })

  test('surfaces scene-card execution directive misses as priority delivery work', () => {
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
              review: {
                score: 84,
                passed: true,
                status: 'pass',
                issues: [],
                prose_craft_checks: [
                  {
                    key: 'scene_card_1_forbidden_directives',
                    label: '场景卡禁令执行',
                    status: 'fail',
                    evidence: '场景1《蓝晶灼手》违反场景卡禁令：不得用整段来历/等级解释蓝晶；正文出现整段来历/等级解释或说明书式科普。',
                    fix: '删掉说明书式来历、原理和等级解释，改成角色当下动作反应、对话半句、物理后果或证据判断变化。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.proseCraft?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('修场景卡：场景卡执行缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先修场景卡')
  })

  test('surfaces punctuation tone misses as repairable delivery work', () => {
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
              review: {
                score: 84,
                passed: true,
                status: 'pass',
                issues: [],
                punctuation_tone_checks: [
                  {
                    key: 'ellipsis_dash_pause',
                    label: '硬停顿',
                    status: 'fail',
                    evidence: '执事质问连续用“你……你竟然——”制造停顿，爆发句乱用三个感叹号，角色声线和主角一样。',
                    fix: '改成执事话被审判木裂响打断，用短句和动作承接迟疑；爆发只保留一个情绪落点。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.punctuationTone?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.punctuationTone?.label).toBe('语气标点缺口 1')
    expect(model.chapterAcceptanceDesk.punctuationTone?.evidence.join('｜')).toContain('爆发句乱用三个感叹号')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('调语气：语气标点缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先修语气标点')
  })

  test('surfaces content rubric misses as repairable delivery work', () => {
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
              review: {
                score: 84,
                passed: true,
                status: 'pass',
                issues: [],
                content_rubric_checks: [
                  {
                    key: 'golden_three_questions',
                    label: '黄金三问',
                    status: 'fail',
                    evidence: '本章没有回答读者为什么翻下一页，旧印亮出后局势没有可见变化，也缺少支持内容判断的正文证据。',
                    fix: '补旧印改变审判资格、长老席追查内库阵图的新期待，并用正文动作和对白证明变化。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.contentRubric?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.contentRubric?.label).toBe('内容基准缺口 1')
    expect(model.chapterAcceptanceDesk.contentRubric?.evidence.join('｜')).toContain('为什么翻下一页')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补内容：内容基准缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先修内容基准')
  })

  test('prioritizes creation contract risks before ordinary delivery risks', () => {
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
              review: {
                score: 80,
                passed: false,
                status: 'warn',
                issues: [],
                content_rubric_checks: [
                  {
                    key: 'golden_three_questions',
                    label: '黄金三问',
                    status: 'fail',
                    evidence: '旧印亮出后局势没有可见变化。',
                    fix: '补旧印改变审判资格的正文证据。',
                  },
                ],
                target_reader_checks: [
                  {
                    key: 'emotion_gap_missing',
                    label: '情绪缺口',
                    status: 'fail',
                    evidence: '目标读者核心痛苦没有转成尊严补偿。',
                    fix: '把被轻视的压力写成当众反证资格。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items[0]).toBe('创作契约：目标读者缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补内容：内容基准缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先修创作契约')
  })

  test('surfaces reader retention checks as repairable delivery work', () => {
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
              review: {
                score: 84,
                passed: true,
                status: 'pass',
                issues: [],
                reader_retention_checks: [
                  {
                    key: 'double_engine_hunger_missing',
                    label: '留存双引擎',
                    status: 'fail',
                    evidence: '本章有情绪爆发，但没有信息差植入问号，旧印来源和内库阵图线索一次性讲完，章尾没有追读饥饿。',
                    fix: '把旧印来源卡到章尾，只露出内库阵图半枚残印，给长老席追查的新问题和随机额外收获。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.readerRetentionCheck?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.readerRetentionCheck?.label).toBe('追读雷达缺口 1')
    expect(model.chapterAcceptanceDesk.readerRetentionCheck?.evidence.join('｜')).toContain('没有信息差植入问号')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('创作契约：追读留存缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先修创作契约')
  })

  test('surfaces target reader checks as repairable delivery work', () => {
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
              review: {
                score: 84,
                passed: true,
                status: 'pass',
                issues: [],
                target_reader_checks: [
                  {
                    key: 'emotion_gap_missing',
                    label: '情绪缺口',
                    status: 'fail',
                    evidence: '目标读者画像只写年轻读者，缺核心痛苦、深层情结和未满足需求，本章旧印亮出后没有给尊严补偿。',
                    fix: '把被宗门轻视的核心痛苦写成审判现场压力，用旧印反证资格并给读者尊严回报。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.targetReader?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.targetReader?.label).toBe('目标读者缺口 1')
    expect(model.chapterAcceptanceDesk.targetReader?.evidence.join('｜')).toContain('缺核心痛苦')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('创作契约：目标读者缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先修创作契约')
  })

  test('surfaces genre positioning checks as repairable delivery work', () => {
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
              review: {
                score: 84,
                passed: true,
                status: 'pass',
                issues: [],
                genre_positioning_checks: [
                  {
                    key: 'core_hook_blurry',
                    label: '核心梗',
                    status: 'fail',
                    evidence: '本章挂阵修题材，但旧印只当普通信物使用，核心梗和阵法长板没有变成审判现场优势，书名简介承诺的阵师逆袭没有正文证据。',
                    fix: '把旧印改成阵法资格反证，围绕阵修长板扩出识阵、破阵、反制三处正文证据。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.genrePositioning?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.genrePositioning?.label).toBe('题材定位缺口 1')
    expect(model.chapterAcceptanceDesk.genrePositioning?.evidence.join('｜')).toContain('核心梗')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('创作契约：题材定位缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先修创作契约')
  })

  test('surfaces female audience checks as repairable delivery work', () => {
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
              review: {
                score: 84,
                passed: true,
                status: 'pass',
                issues: [],
                female_audience_checks: [
                  {
                    key: 'agency_and_security_missing',
                    label: '安全感与主动性',
                    status: 'fail',
                    evidence: '本章女主被长老安排着赢，缺少自己做决定的动作；旧印反转只打脸，没有安全感锚点、被珍视回馈和虐后反糖。',
                    fix: '改成女主主动亮出旧印并承担代价，让盟友公开站队给安全感反馈，章尾补一颗反转后的糖。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.femaleAudience?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.femaleAudience?.label).toBe('女频长篇缺口 1')
    expect(model.chapterAcceptanceDesk.femaleAudience?.evidence.join('｜')).toContain('被长老安排着赢')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补女频：女频长篇缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补女频长篇')
  })

  test('surfaces upgrade rhythm checks as repairable delivery work', () => {
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
              review: {
                score: 84,
                passed: true,
                status: 'pass',
                issues: [],
                upgrade_rhythm_checks: [
                  {
                    key: 'feedback_and_threshold_missing',
                    label: '升级反馈与门槛',
                    status: 'fail',
                    evidence: '本章获得旧印后只有奖励，没有展示升级前情绪缺口、即时反馈、延迟反馈和新门槛；金手指触发条件和升级规则不清晰。',
                    fix: '补升级前被压制的情绪缺口，旧印即时改变审判资格，延迟引出更高门槛，并把金手指功能、触发、奖励和升级规则写成一眼能懂的动作反馈。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.upgradeRhythm?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.upgradeRhythm?.label).toBe('升级节奏缺口 1')
    expect(model.chapterAcceptanceDesk.upgradeRhythm?.evidence.join('｜')).toContain('升级前情绪缺口')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补升级：升级节奏缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补升级节奏')
  })

  test('surfaces chapter structure and progression checks as repairable delivery work', () => {
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
              review: {
                score: 81,
                passed: false,
                status: 'warn',
                issues: [],
                structure_checks: [
                  {
                    key: 'missing_turning_structure',
                    label: '章节结构',
                    status: 'fail',
                    evidence: '本章开头没有钩子，中段只复述旧设定，局势没有变化，结尾落在总结而不是新的发现或危机。',
                    fix: '补开头钩子、中段推进、局势变化和章尾翻页。',
                  },
                ],
                progression_checks: [
                  {
                    key: 'deletable_chapter',
                    label: '章节推进',
                    status: 'warn',
                    evidence: '删掉这章不影响理解，主线、关系、设定都没有可见位移。',
                    fix: '补本章不可删除的证据、选择、代价或关系变化。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_revision')
    expect(model.chapterAcceptanceDesk.chapterStructure?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.chapterStructure?.label).toBe('章节结构缺口 1')
    expect(model.chapterAcceptanceDesk.chapterStructure?.evidence.join('｜')).toContain('开头没有钩子')
    expect(model.chapterAcceptanceDesk.chapterProgression?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.chapterProgression?.label).toBe('章节推进缺口 1')
    expect(model.chapterAcceptanceDesk.chapterProgression?.evidence.join('｜')).toContain('删掉这章不影响理解')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补结构：章节结构缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补推进：章节推进缺口 1')
  })

  test('surfaces information load and longform checks as repairable delivery work', () => {
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
              review: {
                score: 80,
                passed: false,
                status: 'warn',
                issues: [],
                information_checks: [
                  {
                    key: 'concept_overload',
                    label: '信息负载',
                    status: 'fail',
                    evidence: '本章一次性解释三套阵法、两条宗门规则和旧印来历，信息没有跟着冲突走，读者还没看到动作就被设定淹没。',
                    fix: '压缩新概念到三个以内，把旧印规则放进冲突反馈里释放。',
                  },
                ],
                longform_checks: [
                  {
                    key: 'recent_progress_stalled',
                    label: '长篇连续性',
                    status: 'warn',
                    evidence: '最近5章都在解释旧印背景，没有明确进展，爽点间隔过长，读者看不到阶段目标推进。',
                    fix: '补最近5章的阶段位移、爽点间隔和下一阶段目标。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_revision')
    expect(model.chapterAcceptanceDesk.informationLoad?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.informationLoad?.label).toBe('信息负载缺口 1')
    expect(model.chapterAcceptanceDesk.informationLoad?.evidence.join('｜')).toContain('信息没有跟着冲突走')
    expect(model.chapterAcceptanceDesk.longformContinuity?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.longformContinuity?.label).toBe('长篇连续性缺口 1')
    expect(model.chapterAcceptanceDesk.longformContinuity?.evidence.join('｜')).toContain('最近5章')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('压信息：信息负载缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('保长篇：长篇连续性缺口 1')
  })

  test('surfaces core contract and continuity heat checks as repairable delivery work', () => {
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
              review: {
                score: 79,
                passed: false,
                status: 'warn',
                issues: [],
                core_contract_checks: [
                  {
                    key: 'theme_unity_rules',
                    label: '核心契约',
                    status: 'fail',
                    evidence: '本章追逐支线宝物，主角没有服务规则反制的核心承诺，小情绪没有服从全书核心情绪。',
                    fix: '把支线宝物改成规则判定证据，让主角用规则反制兑现核心承诺。',
                  },
                ],
                continuity_heat_checks: [
                  {
                    key: 'cold_recall_without_warmup',
                    label: '连续性热度',
                    status: 'warn',
                    evidence: '旧印作为 hot 元素本章只提名字没有推进，cold 伏笔突然回收前没有升温。',
                    fix: '让旧印触发新证据推进，cold 回收前先给一处可见升温。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_revision')
    expect(model.chapterAcceptanceDesk.coreContractCheck?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.coreContractCheck?.label).toBe('核心契约缺口 1')
    expect(model.chapterAcceptanceDesk.coreContractCheck?.evidence.join('｜')).toContain('核心承诺')
    expect(model.chapterAcceptanceDesk.continuityHeat?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.continuityHeat?.label).toBe('连续性热度缺口 1')
    expect(model.chapterAcceptanceDesk.continuityHeat?.evidence.join('｜')).toContain('cold 伏笔突然回收前没有升温')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('创作契约：核心承诺缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补热度：连续性热度缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先修创作契约')
  })

  test('surfaces revision receipt and deslop repair checks as repairable delivery work', () => {
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
              review: {
                score: 78,
                passed: false,
                status: 'warn',
                issues: [],
                revision_receipt_checks: [
                  {
                    key: 'prose_revision_receipt_sync',
                    label: '修订回执',
                    status: 'fail',
                    evidence: 'delivery_risk_receipts 要求修正文首钩子，但 revision_receipts 没有给 changed_evidence。',
                    fix: '重新输出 revision_receipts。',
                  },
                ],
                deslop_repair_checks: [
                  {
                    key: 'deslop_repair_receipt_sync',
                    label: '去AI味修复',
                    status: 'warn',
                    evidence: 'Gate E 模板化对白仍残留，但 deslop_repair_receipts 没有引用修订后正文证据。',
                    fix: '重修 Gate E 对话腔调。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_revision')
    expect(model.chapterAcceptanceDesk.revisionReceiptCheck?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.revisionReceiptCheck?.label).toBe('修订回执缺口 1')
    expect(model.chapterAcceptanceDesk.revisionReceiptCheck?.evidence.join('｜')).toContain('changed_evidence')
    expect(model.chapterAcceptanceDesk.deslopRepairCheck?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.deslopRepairCheck?.label).toBe('去AI味修复缺口 1')
    expect(model.chapterAcceptanceDesk.deslopRepairCheck?.evidence.join('｜')).toContain('Gate E')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补回执：修订回执缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补去味：去AI味修复缺口 1')
  })

  test('surfaces prose meta and serial risk repair checks as repairable delivery work', () => {
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
              review: {
                score: 77,
                passed: false,
                status: 'warn',
                issues: [],
                prose_meta_checks: [
                  {
                    key: 'meta_narration_leak',
                    label: '正文元叙事',
                    status: 'fail',
                    evidence: '正文出现“这一章主要用来铺垫后续反转”这类作者说明，破坏读者沉浸。',
                    fix: '删除作者说明。',
                  },
                ],
                serial_risk_repair_checks: [
                  {
                    key: 'scene_serial_risk_unrepaired',
                    label: '连续风险修复',
                    status: 'warn',
                    evidence: '安全批量标记场景承接风险，但修订稿没有补 scene_serial_risk_repair_receipt。',
                    fix: '补齐连续生产风险修复回执。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_revision')
    expect(model.chapterAcceptanceDesk.proseMeta?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.proseMeta?.label).toBe('正文元叙事缺口 1')
    expect(model.chapterAcceptanceDesk.proseMeta?.evidence.join('｜')).toContain('作者说明')
    expect(model.chapterAcceptanceDesk.serialRiskRepair?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.serialRiskRepair?.label).toBe('连续风险修复缺口 1')
    expect(model.chapterAcceptanceDesk.serialRiskRepair?.evidence.join('｜')).toContain('场景承接风险')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('删元叙：正文元叙事缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补连修：连续风险修复缺口 1')
  })

  test('surfaces chapter hook quality checks as repairable delivery work', () => {
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
              review: {
                score: 77,
                passed: false,
                status: 'warn',
                issues: [],
                chapter_hook_quality_checks: [
                  {
                    key: 'ending_hook_weak_pull',
                    label: '章钩质量',
                    status: 'warn',
                    evidence: '章尾只写“新的麻烦来了”，没有具体问题、危险、选择或下一章行动压力。',
                    fix: '把章尾改成可追读的具体未解问题。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_revision')
    expect(model.chapterAcceptanceDesk.chapterHookQuality?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.chapterHookQuality?.label).toBe('章钩质量缺口 1')
    expect(model.chapterAcceptanceDesk.chapterHookQuality?.evidence.join('｜')).toContain('下一章行动压力')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('强章钩：章钩质量缺口 1')
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

  test('summarizes prose revision receipts and routes residual risk into delivery queue', () => {
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
              revision: {
                revision_receipts: [
                  {
                    issue_index: 0,
                    severity: 'S2',
                    category: 'prose',
                    original_evidence: '眼神复杂',
                    applied_fix: '改成具体动作和对白反应',
                    changed_evidence: '谢怀安把腰牌翻到血迹那面，直接问管事认不认。',
                    remaining_risk: '',
                  },
                  {
                    issue_index: 1,
                    severity: 'S2',
                    category: 'structure',
                    original_evidence: '章末只总结局势',
                    applied_fix: '补章末现场钩子',
                    changed_evidence: '第三声钟响后，守将闯入。',
                    remaining_risk: '守将动机仍需下一章补证据。',
                  },
                ],
              },
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
    expect(model.chapterAcceptanceDesk.revisionReceipt?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.revisionReceipt?.scoreLabel).toBe('修订闭环 1/2')
    expect(model.chapterAcceptanceDesk.revisionReceipt?.closedCount).toBe(1)
    expect(model.chapterAcceptanceDesk.revisionReceipt?.riskCount).toBe(1)
    expect(model.chapterAcceptanceDesk.revisionReceipt?.evidence.join('；')).toContain('腰牌翻到血迹')
    expect(model.chapterAcceptanceDesk.revisionReceipt?.risks).toContain('守将动机仍需下一章补证据。')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('复核修订：修订残留 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先复核修订')
  })

  test('summarizes nested oh-story revision receipts and routes residual risk into delivery queue', () => {
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
              revision: {
                oh_story_delivery_receipts: {
                  revision_receipts: [
                    {
                      issue_index: 0,
                      severity: 'S2',
                      category: 'prose',
                      applied_fix: '把腰牌血迹变成阵堂旧案的新问题。',
                      changed_evidence: '带血腰牌翻到背面，刻着阵堂旧案当夜的第三个名字。',
                      remaining_risk: '',
                    },
                    {
                      issue_index: 1,
                      severity: 'S2',
                      category: 'structure',
                      applied_fix: '补章末现场钩子',
                      changed_evidence: '第三声钟响后，守将闯入。',
                      remaining_risk: '守将动机仍需下一章补证据。',
                    },
                  ],
                },
              },
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

    expect(model.chapterAcceptanceDesk.revisionReceipt?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.revisionReceipt?.scoreLabel).toBe('修订闭环 1/2')
    expect(model.chapterAcceptanceDesk.revisionReceipt?.closedCount).toBe(1)
    expect(model.chapterAcceptanceDesk.revisionReceipt?.riskCount).toBe(1)
    expect(model.chapterAcceptanceDesk.revisionReceipt?.evidence.join('；')).toContain('带血腰牌翻到背面')
    expect(model.chapterAcceptanceDesk.revisionReceipt?.risks).toContain('守将动机仍需下一章补证据。')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('复核修订：修订残留 1')
  })

  test('surfaces prose revision receipt sync misses even when revision receipts look closed', () => {
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
              revision: {
                revision_receipts: [
                  {
                    issue_index: 0,
                    severity: 'S2',
                    category: 'prose',
                    original_evidence: '解释偏长',
                    applied_fix: '压缩说明',
                    changed_evidence: '三句压成一句。',
                    remaining_risk: '无',
                  },
                ],
              },
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
        {
          id: 233,
          review_type: 'prose_revision_receipt_sync',
          status: 'warn',
          summary: '缺少交稿风险修订回执。',
          created_at: '2026-05-24T00:30:00.000Z',
          payload: JSON.stringify({
            chapter_id: 101,
            chapter_no: 1,
            prose_revision_receipt_sync: {
              status: 'warn',
              label: '修订回执残留 1',
              missed_count: 1,
              receipt_count: 1,
              missed: [
                {
                  category: 'delivery_risk_receipt',
                  label: '交稿风险修订回执缺失',
                  text: '缺少对应交稿风险修订回执：章末翻页风险｜章末把带血腰牌变成新的未解问题。',
                  evidence: 'ending_actions｜最后300字没有形成追读钩子。',
                },
              ],
              next_actions: [
                '补齐 delivery_risk_receipts 对应的 revision_receipts；每条必须写 required_action、repair_segment、applied_fix 和 changed_evidence。',
              ],
            },
          }),
        },
      ],
    })

    expect(model.chapterAcceptanceDesk.revisionReceipt?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.revisionReceipt?.label).toBe('修订回执残留 1')
    expect(model.chapterAcceptanceDesk.revisionReceipt?.riskCount).toBe(1)
    expect(model.chapterAcceptanceDesk.revisionReceipt?.risks.join('；')).toContain('章末把带血腰牌')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('复核修订：修订回执残留 1')
  })

  test('summarizes deslop repair receipts as a de-ai revision closure signal', () => {
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
              revision: {
                deslop_repair_receipts: [
                  {
                    gate: 'B',
                    label: '主语重复',
                    original_evidence: '谢怀安看着钟。谢怀安抬手。',
                    applied_fix: '把第二句改为动作承接。',
                    changed_evidence: '钟声压过席面时，他把腰牌按在桌上。',
                    remaining_risk: '',
                  },
                  {
                    gate: 'G',
                    label: '解释腔',
                    original_evidence: '这意味着更大的危机即将到来。',
                    applied_fix: '改成现场可见危机。',
                    changed_evidence: '城门方向的火把忽然连成一条线。',
                    remaining_risk: '结尾仍有一句偏总结。',
                  },
                ],
              },
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
    expect(model.chapterAcceptanceDesk.revisionReceipt?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.revisionReceipt?.label).toBe('去AI味残留 1')
    expect(model.chapterAcceptanceDesk.revisionReceipt?.scoreLabel).toBe('去AI味闭环 1/2')
    expect(model.chapterAcceptanceDesk.revisionReceipt?.evidence.join('；')).toContain('腰牌按在桌上')
    expect(model.chapterAcceptanceDesk.revisionReceipt?.risks).toContain('结尾仍有一句偏总结。')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('复核修订：去AI味残留 1')
  })

  test('summarizes nested oh-story deslop repair receipts as a de-ai closure signal', () => {
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
              revision: {
                oh_story_delivery_receipts: {
                  deslop_repair_receipts: [
                    {
                      gate: 'F',
                      label: '章末总结升华',
                      original_evidence: '这一刻，他终于明白真正的成长不是赢，而是学会承担。',
                      applied_fix: '改成章末可见压力。',
                      changed_evidence: '城门方向的火把忽然断成两截，他把腰牌压进掌心。',
                      remaining_risk: '',
                    },
                    {
                      gate: 'G',
                      label: '解释腔',
                      original_evidence: '这意味着更大的危机即将到来。',
                      applied_fix: '改成现场可见危机。',
                      changed_evidence: '城门方向的火把忽然连成一条线。',
                      remaining_risk: '结尾仍有一句偏总结。',
                    },
                  ],
                },
              },
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

    expect(model.chapterAcceptanceDesk.revisionReceipt?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.revisionReceipt?.label).toBe('去AI味残留 1')
    expect(model.chapterAcceptanceDesk.revisionReceipt?.scoreLabel).toBe('去AI味闭环 1/2')
    expect(model.chapterAcceptanceDesk.revisionReceipt?.evidence.join('；')).toContain('腰牌压进掌心')
    expect(model.chapterAcceptanceDesk.revisionReceipt?.risks).toContain('结尾仍有一句偏总结。')
  })

  test('summarizes stored deslop repair receipt sync when quality payload lacks receipts', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        {
          id: 260,
          review_type: 'deslop_repair_receipt_sync',
          status: 'warn',
          summary: '去AI味修复回执未生成：本章存在去AI味门禁缺口且已执行修订，但没有生成逐项去AI味修复回执。',
          created_at: '2026-05-24T00:30:00.000Z',
          payload: JSON.stringify({
            chapter_id: 101,
            chapter_no: 1,
            deslop_repair_receipt_sync: {
              status: 'warn',
              label: '去AI味修复回执未生成',
              receipt_count: 0,
              missed_count: 1,
              completed_count: 0,
              missed: [
                {
                  gate: 'Gate F',
                  label: '去AI味修复回执未生成',
                  text: '本章已执行去AI味修复，但没有生成逐项 deslop_repair_receipts。',
                  evidence: 'Gate F｜章末总结升华｜真正的成长不是赢，而是学会承担。',
                },
              ],
            },
          }),
        },
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.revisionReceipt?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.revisionReceipt?.label).toBe('去AI味修复回执未生成')
    expect(model.chapterAcceptanceDesk.revisionReceipt?.scoreLabel).toBe('去AI味闭环 0/1')
    expect(model.chapterAcceptanceDesk.revisionReceipt?.riskCount).toBe(1)
    expect(model.chapterAcceptanceDesk.revisionReceipt?.evidence.join('；')).toContain('Gate F')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('复核修订：去AI味修复回执未生成')
  })

  test('surfaces prose quality approval blockers as delivery repair work', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          status: 'warn',
          summary: '章节群质检评分 84，仿写安全阈值未通过',
          payload: {
            approval_type: 'reference_safety_blocked',
            quality_gate: {
              passed: false,
              reasons: ['仿写安全阈值未通过：相似片段过高'],
            },
            safety_decision: {
              blocked: true,
              score: 45,
              copy_hit_count: 3,
              reasons: ['连续三段与参考材料高度相似'],
            },
            self_check: {
              review: {
                score: 84,
                passed: false,
                status: 'warn',
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
    expect(model.chapterAcceptanceDesk.approvalBlocker?.type).toBe('reference_safety_blocked')
    expect(model.chapterAcceptanceDesk.approvalBlocker?.label).toBe('仿写安全阻断')
    expect(model.chapterAcceptanceDesk.approvalBlocker?.detail).toContain('连续三段与参考材料高度相似')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先处理入库阻断')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items[0]).toContain('处理入库阻断：仿写安全阻断')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('create_editor_report')
  })

  test('summarizes delivery risk receipts and routes missed carry-over into delivery queue', () => {
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
              review: {
                score: 86,
                passed: true,
                status: 'pass',
                issues: [],
                must_fix: [],
                optional_improvements: [],
                revision_directives: [],
                needs_revision: false,
                delivery_risk_receipts: [
                  {
                    risk_item: '去AI味：AI味中度 2',
                    required_action: '章末必须用现场反转或新证据收束。',
                    delivered: true,
                    evidence: '水迹在玻璃上拼出第二个名字。',
                    remaining_risk: '',
                  },
                  {
                    risk_item: '复盘审稿：S2问题 1',
                    required_action: '下一章开篇必须让主角追查湿漉漉学生身份。',
                    delivered: false,
                    evidence: '',
                    remaining_risk: '开篇仍只写宿舍环境，没有追查湿漉漉学生身份。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.deliveryRiskReceipt?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.deliveryRiskReceipt?.scoreLabel).toBe('承接闭环 1/2')
    expect(model.chapterAcceptanceDesk.deliveryRiskReceipt?.riskCount).toBe(1)
    expect(model.chapterAcceptanceDesk.deliveryRiskReceipt?.risks).toContain('开篇仍只写宿舍环境，没有追查湿漉漉学生身份。')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('复核承接：承接残留 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先复核承接')
  })

  test('summarizes nested oh-story delivery risk receipts and routes missed carry-over into delivery queue', () => {
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
              review: {
                score: 86,
                passed: true,
                status: 'pass',
                issues: [],
                must_fix: [],
                optional_improvements: [],
                revision_directives: [],
                needs_revision: false,
              },
            },
            oh_story_delivery_receipts: {
              delivery_risk_receipts: [
                {
                  risk_item: '质量诊断闭环：质量诊断残留 1',
                  required_action: '下一章必须写出换防令造成的新阻碍。',
                  delivered: false,
                  evidence: '',
                  remaining_risk: '换防令造成的新阻碍还没有进入下一章开篇。',
                },
              ],
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.deliveryRiskReceipt?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.deliveryRiskReceipt?.scoreLabel).toBe('承接闭环 0/1')
    expect(model.chapterAcceptanceDesk.deliveryRiskReceipt?.risks).toContain('换防令造成的新阻碍还没有进入下一章开篇。')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('复核承接：承接残留 1')
  })

  test('summarizes platform rubric checks and routes failed platform fit into delivery queue', () => {
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
              review: {
                score: 84,
                passed: true,
                rubric: 'fanqie',
                rubric_source: 'oh_story_embedded_fallback',
                platform_checks: [
                  {
                    key: 'opening_hook',
                    label: '前三段钩子',
                    status: 'fail',
                    evidence: '前三段都在解释背景。',
                    fix: '开篇改成对手当众撕毁证据。',
                  },
                  {
                    key: 'ending_pull',
                    label: '章末翻页',
                    status: 'pass',
                    evidence: '最后一份证据指向身边人。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.platformRubric?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.platformRubric?.label).toBe('平台基准：番茄')
    expect(model.chapterAcceptanceDesk.platformRubric?.scoreLabel).toBe('平台达标 1/2')
    expect(model.chapterAcceptanceDesk.platformRubric?.missed).toContain('前三段钩子')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('平台适配：平台缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先修平台适配')
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

  test('summarizes chapter blueprint receipts from generated scene breakdown', () => {
    const chapterWithReceipts = {
      ...chapters[0],
      scene_breakdown: [
        {
          scene_no: 1,
          title: '审判开场',
          blueprint_receipts: {
            target_emotion: { delivered: true, evidence: '开场压迫，中段反证，结尾释放爽感。' },
            opening_hook: { delivered: true, evidence: '第一段直接抛出认罪书。' },
            core_payoff: { delivered: false, evidence: '反证完成了，但没有写出夺回主动权后的在场反应。' },
            content_outline: { delivered: true, evidence: '先被伪证逼到绝境，再用账本反证。' },
            beat_sequence: { delivered: true, evidence: '场景完成开篇钩子和反证转折。' },
            ending_contract: { delivered: false, evidence: '章尾没有抛出第二本账册。' },
          },
        },
      ],
    }
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters: [chapterWithReceipts, chapters[1]],
      activeChapter: chapterWithReceipts,
      materialScore: { score: 82, can_generate: true },
      reviews: [proseQualityReview()],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.blueprintReceipt?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.blueprintReceipt?.label).toBe('蓝图缺口 2')
    expect(model.chapterAcceptanceDesk.blueprintReceipt?.scoreLabel).toBe('蓝图兑现 4/6')
    expect(model.chapterAcceptanceDesk.blueprintReceipt?.deliveredCount).toBe(4)
    expect(model.chapterAcceptanceDesk.blueprintReceipt?.totalCount).toBe(6)
    expect(model.chapterAcceptanceDesk.blueprintReceipt?.missedCount).toBe(2)
    expect(model.chapterAcceptanceDesk.blueprintReceipt?.evidence.join('；')).toContain('先被伪证逼到绝境')
    expect(model.chapterAcceptanceDesk.blueprintReceipt?.missed).toContain('核心回报')
    expect(model.chapterAcceptanceDesk.blueprintReceipt?.missed).toContain('章尾承接')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补蓝图：蓝图缺口 2')
  })

  test('summarizes nested oh-story chapter blueprint receipts from raw payload', () => {
    const chapterWithNestedBlueprintReceipts = {
      ...chapters[0],
      raw_payload: {
        ...chapters[0].raw_payload,
        oh_story_delivery_receipts: {
          chapter_blueprint: {
            receipts: {
              opening_hook: { delivered: true, evidence: '前三百字落下认罪书。' },
              core_payoff: { delivered: false, evidence: '反证后没有写出读者期待的夺权爽点。' },
              ending_contract: { delivered: false, evidence: '章尾没有把下一章钩子递出去。' },
            },
          },
        },
      },
    }
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters: [chapterWithNestedBlueprintReceipts, chapters[1]],
      activeChapter: chapterWithNestedBlueprintReceipts,
      materialScore: { score: 82, can_generate: true },
      reviews: [proseQualityReview()],
    })

    expect(model.chapterAcceptanceDesk.blueprintReceipt?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.blueprintReceipt?.label).toBe('蓝图缺口 2')
    expect(model.chapterAcceptanceDesk.blueprintReceipt?.scoreLabel).toBe('蓝图兑现 1/3')
    expect(model.chapterAcceptanceDesk.blueprintReceipt?.missed).toContain('核心回报')
    expect(model.chapterAcceptanceDesk.blueprintReceipt?.missed).toContain('章尾承接')
    expect(model.chapterAcceptanceDesk.blueprintReceipt?.evidence.join('；')).toContain('前三百字落下认罪书')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补蓝图：蓝图缺口 2')
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

  test('summarizes deslop gate diagnostics from the current prose quality review', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [proseQualityReview({
        payload: {
          self_check: {
            review: {
              score: 82,
              passed: true,
              status: 'pass',
              deslop_gate_diagnostics: {
                version: 'oh_story_deslop_gate_diagnostics_v1',
                total: 2,
                concern_gate_count: 1,
                summary: 'A-G 门禁 1 项需处理',
                gates: [
                  {
                    gate: 'B',
                    label: '主语重复',
                    status: 'warn',
                    count: 2,
                    evidence: ['连续三句都以谢怀安开头'],
                    fix: '把第二句改成动作或环境承接。',
                    patterns: ['谢怀安'],
                  },
                  {
                    gate: 'F',
                    label: '结尾总结',
                    status: 'pass',
                    count: 0,
                    evidence: [],
                    fix: '',
                    patterns: [],
                  },
                ],
              },
            },
          },
        },
      })],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.deslopGateDiagnostics?.summary).toBe('A-G 门禁 1 项需处理')
    expect(model.chapterAcceptanceDesk.deslopGateDiagnostics?.concernGateCount).toBe(1)
    expect(model.chapterAcceptanceDesk.deslopGateDiagnostics?.gates).toHaveLength(2)
    expect(model.chapterAcceptanceDesk.deslopGateDiagnostics?.gates[0]).toMatchObject({
      gate: 'B',
      label: '主语重复',
      status: 'warn',
      count: 2,
      fix: '把第二句改成动作或环境承接。',
    })
    expect(model.chapterAcceptanceDesk.deslopGateDiagnostics?.gates[0].evidence).toContain('连续三句都以谢怀安开头')
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


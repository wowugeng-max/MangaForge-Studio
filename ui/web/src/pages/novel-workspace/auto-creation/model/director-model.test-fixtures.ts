export const basePlanning = {
  topStatus: {
    projectTitle: '万古长夜',
    currentVolume: '第一卷 宗门试炼',
    currentStage: '压迫升级',
    currentChapterLabel: '第8章',
    writtenWords: 21000,
    targetWords: 3000000,
    future10Coverage: { ready: true, planned: 10, required: 10, missingChapters: [], label: '10/10' },
    future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
    longformHealth: { status: 'healthy', label: '规划健康' },
  },
  mainline: {
    readerPromise: '寒门少年以阵法反压宗门秩序',
    currentVolumeGoal: '进入内门视野',
    currentStageConflict: '执事逼主角交出阵盘',
    payoffModel: '升级+打脸',
    previousTurn: '',
    nextTurn: '试炼前夜',
    currentChapterServesVolume: true,
    risks: [],
  },
  futureRoute: [],
  first30Retention: {
    status: 'ready',
    score: 84,
    summary: '前30章留存达标。',
    promiseReady: true,
    stale: false,
    actionKey: 'run_first30_retention',
    segments: [],
    chapterCards: [],
    risks: [],
    nextActions: [],
  },
  storylineBoard: {
    status: 'ready',
    summary: '剧情线调度正常。',
    total: 6,
    overdueCount: 0,
    debtCount: 0,
    retentionRiskCount: 0,
    groups: [],
  },
  longformRhythm: {
    status: 'ready',
    score: 86,
    label: '节奏健康 86',
    summary: '长篇节奏稳定，可以继续推进当前章。',
    currentBandLabel: '第1个10万字',
    signals: [
      { key: 'core', label: '核心守恒', status: 'ok', score: 90, detail: '核心稳定', actionKey: 'open_outline_tree' },
      { key: 'volume', label: '卷级推进', status: 'ok', score: 84, detail: '当前卷推进正常', actionKey: 'update_rolling_plan' },
      { key: 'payoff', label: '回报兑现', status: 'ok', score: 86, detail: '回报债务可控', actionKey: 'open_quality_revision' },
      { key: 'fatigue', label: '疲劳风险', status: 'ok', score: 84, detail: '留存和剧情线风险可控', actionKey: 'run_first30_retention' },
    ],
    nextActions: [],
  },
  volumeBeatBudget: {
    status: 'ready',
    score: 86,
    label: '爆点预算 86',
    summary: '当前卷高潮与爽点预算稳定。',
    currentVolumeTitle: '第一卷 宗门试炼',
    chapterRange: '第1-50章',
    totalChapters: 50,
    plannedChapterCount: 50,
    climaxTarget: 4,
    climaxCount: 4,
    payoffTarget: 12,
    payoffCount: 18,
    beats: [],
    nextActions: [],
  },
  recentFatigueRadar: {
    status: 'ready',
    score: 86,
    label: '疲劳稳定 86',
    summary: '近10章冲突来源、回报形态、章末钩子和可视化场面没有明显同质化。',
    chapterRangeLabel: '第1-10章',
    actionKey: 'enter_chapter_writing',
    signals: [
      { key: 'conflict_variety', label: '冲突变化', status: 'ok', score: 88, count: 0, detail: '冲突来源轮换正常。', actionKey: 'enter_chapter_writing' },
      { key: 'payoff_variety', label: '回报变化', status: 'ok', score: 86, count: 0, detail: '回报形态轮换正常。', actionKey: 'enter_chapter_writing' },
      { key: 'hook_variety', label: '钩子变化', status: 'ok', score: 85, count: 0, detail: '章末问题轮换正常。', actionKey: 'enter_chapter_writing' },
      { key: 'scene_freshness', label: '场面新鲜度', status: 'ok', score: 86, count: 0, detail: '场面新鲜度正常。', actionKey: 'enter_chapter_writing' },
    ],
    nextActions: [],
  },
  storyPressureLadder: {
    status: 'ready',
    score: 88,
    label: '压力稳定 88',
    summary: '未来章节有明确压力源、冲突升级、赌注升级和反转逼迫。',
    chapterRangeLabel: '第8-10章',
    actionKey: 'enter_chapter_writing',
    pressureSources: [
      { label: '执事设局', count: 1, chapters: [8], riskLevel: 'ok' },
      { label: '同门围堵', count: 1, chapters: [9], riskLevel: 'ok' },
      { label: '内门条件', count: 1, chapters: [10], riskLevel: 'ok' },
    ],
    signals: [
      { key: 'pressure_source', label: '压力源', status: 'ok', score: 88, count: 0, detail: '压力源轮换正常。', actionKey: 'enter_chapter_writing' },
      { key: 'conflict_escalation', label: '冲突升级', status: 'ok', score: 88, count: 0, detail: '冲突持续加码。', actionKey: 'enter_chapter_writing' },
      { key: 'stakes_growth', label: '赌注升级', status: 'ok', score: 88, count: 0, detail: '赌注持续升级。', actionKey: 'enter_chapter_writing' },
      { key: 'reversal_pressure', label: '反转逼迫', status: 'ok', score: 88, count: 0, detail: '反转逼迫稳定。', actionKey: 'enter_chapter_writing' },
    ],
    nextActions: [],
  },
  storyUnitWorkshop: {
    status: 'ready',
    score: 88,
    label: '单元完整 88',
    summary: '当前剧情单元具备完整事件包，可以支撑 5-20 章连续推进。',
    actionKey: 'enter_chapter_writing',
    currentUnit: {
      key: 'unit-8-10',
      title: '试炼前夜剧情单元',
      chapterRangeLabel: '第8-10章',
      startChapter: 8,
      endChapter: 10,
      status: 'ready',
      score: 88,
      summary: '入口钩子、压力升级、小高潮回报、伏笔/剧情线和出单元钩子完整。',
      chapters: [
        { chapterNo: 8, title: '试炼前夜', role: '入口钩子', goal: '主角拿到试炼资格' },
        { chapterNo: 9, title: '阵盘裂纹', role: '压力升级', goal: '阵盘异常暴露主角潜力' },
        { chapterNo: 10, title: '外门震动', role: '出单元钩子', goal: '试炼结果引发宗门震动' },
      ],
      signals: [
        { key: 'entry_hook', label: '入口钩子', status: 'ok', score: 88, count: 1, detail: '第8章有入口钩子。', actionKey: 'enter_chapter_writing' },
        { key: 'pressure_escalation', label: '压力升级', status: 'ok', score: 88, count: 2, detail: '本单元有压力升级。', actionKey: 'enter_chapter_writing' },
        { key: 'mini_climax_payoff', label: '小高潮/回报', status: 'ok', score: 88, count: 1, detail: '本单元包含小高潮。', actionKey: 'enter_chapter_writing' },
        { key: 'setup_and_storyline', label: '伏笔/剧情线', status: 'ok', score: 88, count: 1, detail: '本单元有剧情线调度。', actionKey: 'enter_chapter_writing' },
        { key: 'exit_hook', label: '出单元钩子', status: 'ok', score: 88, count: 1, detail: '第10章有出单元钩子。', actionKey: 'enter_chapter_writing' },
      ],
    },
    units: [],
    nextActions: [],
  },
  volumeTree: [],
  healthIssues: [],
} as any

export const baseWriting = {
  topStatus: {
    projectTitle: '万古长夜',
    currentVolume: '第一卷 宗门试炼',
    writtenWords: 21000,
    currentRoleLabel: '分集策划',
    nextActionLabel: '补章节场景计划',
    primaryActionKey: 'build_scene_plan',
  },
  nextChapter: {
    id: 8,
    chapterNo: 8,
    title: '试炼前夜',
    wordCount: 0,
    hasProse: false,
    chapterGoal: '主角拿到试炼资格',
    conflict: '执事设局阻拦',
    endingHook: '阵盘亮起第二道裂纹',
    mustAdvance: [],
    forbiddenRepeats: [],
    rawPayload: {},
  },
  previousChapter: { chapterNo: 7, title: '执事加码', wordCount: 3100, hasProse: true },
  chapterPlanningDesk: {
    readiness: 'needs_scene_plan',
    statusLabel: '需补场景计划',
    contextPackageStatus: 'ready',
    scenePlanStatus: 'missing',
    reasons: ['本章还没有可用场景卡。'],
    recommendedPlannerAction: { key: 'build_scene_plan', label: '补章节场景计划' },
    shouldAutoExpandPlanner: true,
    episodePlan: {},
    sceneCards: [],
  },
  chapterAcceptanceDesk: {
    visible: false,
    acceptanceStatus: 'hidden',
    statusLabel: '等待正文',
    acceptanceReasons: [],
    qualityScore: null,
    storyStateSynced: false,
    recommendedAcceptanceAction: { key: 'write_draft', label: '生成本章初稿' },
  },
  primaryActionKey: 'build_scene_plan',
  recommendedRole: 'episode_planner',
  readiness: { checks: [], blockers: [], warnings: [] },
  blockers: [],
  readinessChecks: [],
  modelTeam: { recommendedRole: 'episode_planner', roles: [] },
  draftPipeline: { state: 'no_draft', label: '等待生成初稿' },
  canonUpdatePreview: [],
} as any

export const safeBatchFutureRoute = [
  { chapterNo: 8, title: '试炼前夜', chapterTask: '主角拿到试炼资格', conflict: '执事设局阻拦', endingHook: '阵盘亮起第二道裂纹', mainlineProgress: '进入外门试炼核心局', riskTags: [] },
  { chapterNo: 9, title: '阵盘裂纹', chapterTask: '阵盘异常暴露主角潜力', conflict: '同门围堵试探底牌', endingHook: '内门执事点名关注', mainlineProgress: '让宗门高层第一次注意主角', riskTags: [] },
  { chapterNo: 10, title: '外门震动', chapterTask: '试炼结果引发宗门震动', conflict: '旧秩序压制新晋黑马', endingHook: '内门招揽提出苛刻条件', mainlineProgress: '打开内门势力线', riskTags: [] },
]

export function futureRouteRange(start: number, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const chapterNo = start + index
    return {
      chapterNo,
      title: `稳定扩批${chapterNo}`,
      chapterTask: `第${chapterNo}章推进扩批后的内门主线`,
      conflict: `第${chapterNo}章用新压力测试主角选择`,
      endingHook: `第${chapterNo + 1}章压力升级`,
      mainlineProgress: `内门规则谜团推进到第${chapterNo}章节点`,
      riskTags: [],
    }
  })
}

export function readySafeBatchPlanning(overrides: any = {}) {
  return {
    ...basePlanning,
    topStatus: {
      ...basePlanning.topStatus,
      future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
      ...(overrides.topStatus || {}),
    },
    futureRoute: safeBatchFutureRoute,
    ...overrides,
  }
}

export function readySafeBatchWriting(overrides: any = {}) {
  const {
    chapterPlanningDesk: chapterPlanningDeskOverrides,
    topStatus: topStatusOverrides,
    ...writingOverrides
  } = overrides
  return {
    ...baseWriting,
    primaryActionKey: 'confirm_plan_and_write_draft',
    ...writingOverrides,
    chapterPlanningDesk: {
      ...baseWriting.chapterPlanningDesk,
      readiness: 'ready',
      statusLabel: '本章可写',
      scenePlanStatus: 'ready',
      sceneCards: [
        { title: '压迫升级', goal: '执事逼主角交阵盘' },
        { title: '反向设局', goal: '主角用阵法拿回主动权' },
      ],
      recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
      ...(chapterPlanningDeskOverrides || {}),
    },
    topStatus: {
      ...baseWriting.topStatus,
      nextActionLabel: '确认并生成',
      primaryActionKey: 'confirm_plan_and_write_draft',
      ...(topStatusOverrides || {}),
    },
  }
}

export function recoveryEvidenceFailureRun(id: number, createdAt: string) {
  return {
    id,
    run_type: 'longform_production_repair',
    created_at: createdAt,
    status: 'ready',
    output_ref: JSON.stringify({
      report: { source: 'auto_creation_safe_batch_risk' },
      tasks: [
        {
          issue_type: 'recovery_evidence_mismatch',
          recovery_evidence_review: {
            status: 'warn',
            failed_items: [
              {
                evidence: '单章治理复查：生产阻断已解除',
                source: 'recovery_evidence_release_summary',
                source_label: '安全连写放行摘要',
                source_action: 'single_chapter_governance_recheck',
                source_action_label: '复检单章',
                production_gate_source: 'single_chapter_governance_recheck',
              },
            ],
          },
        },
      ],
    }),
  }
}

export function recoveryEvidenceDeepRepairRun(args: {
  id: number
  createdAt: string
  updatedAt?: string
  taskStatus: string
  actionLabel: string
  deepRepairLevel: 'first_deep_repair' | 'escalated_after_recurrence'
}) {
  return {
    id: args.id,
    run_type: 'longform_production_repair',
    created_at: args.createdAt,
    updated_at: args.updatedAt || args.createdAt,
    status: 'ready',
    output_ref: JSON.stringify({
      report: { source: 'recovery_evidence_governance_queue' },
      tasks: [
        {
          issue_type: 'recovery_evidence_governance_queue',
          source: 'single_chapter_governance_recheck',
          source_label: '单章治理复查',
          source_status: 'repeated_release_failure',
          action_key: 'deep_repair_single_brief',
          action_label: args.actionLabel,
          deep_repair_level: args.deepRepairLevel,
          task_status: args.taskStatus,
          updated_at: args.updatedAt || args.createdAt,
          recovery_evidence_review: {
            failed_evidence: ['单章治理复查：生产阻断已解除'],
          },
        },
      ],
    }),
  }
}

export function strengthenedRepairReleaseSummary(chapterNos = [41, 42, 43]) {
  return {
    status: 'released',
    source: 'recovery_evidence_source_risk_profile',
    summary: `恢复依据画像强化深修已收敛，可恢复 ${chapterNos.length} 章安全连写。`,
    safe_chapter_count: chapterNos.length,
    allowed_chapter_nos: chapterNos,
    next_batch_label: `第${chapterNos[0]}-${chapterNos[chapterNos.length - 1]}章`,
    strengthened_repair_source_count: 1,
    strengthened_repair_sources: [
      {
        source: 'single_chapter_governance_recheck',
        label: '单章治理复查',
        status: 'converged',
        status_label: '强化深修已收敛',
      },
    ],
    evidence: ['单章治理复查：强化深修已收敛'],
  }
}

export function buildStrengthenedRepairAcceptanceInput(extraReviews: any[] = []) {
  return {
    planning: readySafeBatchPlanning(),
    writing: readySafeBatchWriting({
      nextChapter: { ...baseWriting.nextChapter, id: 44, chapterNo: 44, title: '强化复盘后续' },
    }),
    activeTasks: [],
    selectedModelId: 12,
    storyState: { last_updated_chapter: 43 },
    chapters: [
      { id: 41, chapter_no: 41, title: '强化复盘一', chapter_text: '强化复盘一'.repeat(500) },
      { id: 42, chapter_no: 42, title: '强化复盘二', chapter_text: '强化复盘二'.repeat(500) },
      { id: 43, chapter_no: 43, title: '强化复盘三', chapter_text: '强化复盘三'.repeat(500) },
    ],
    reviews: [
      { id: 4501, chapter_id: 41, review_type: 'prose_quality', created_at: '2026-06-06T01:00:00.000Z', payload: JSON.stringify({ score: 84, passed: true }) },
      { id: 4502, chapter_id: 42, review_type: 'prose_quality', created_at: '2026-06-06T01:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
      { id: 4503, chapter_id: 43, review_type: 'prose_quality', created_at: '2026-06-06T01:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
      ...extraReviews,
    ],
    runRecords: [
      {
        id: 450,
        run_type: 'batch_generate_prose',
        created_at: '2026-06-06T00:00:00.000Z',
        status: 'success',
        input_ref: JSON.stringify({
          source: 'auto_creation_safe_batch',
          safety_limit: 3,
          batch_preflight: {
            recovery_evidence_release_summary: strengthenedRepairReleaseSummary(),
          },
        }),
        output_ref: JSON.stringify({
          total: 3,
          success: 3,
          failed: 0,
          chapters: [
            { id: 41, chapter_no: 41, title: '强化复盘一', status: 'success', score: 84, word_count: 3180 },
            { id: 42, chapter_no: 42, title: '强化复盘二', status: 'success', score: 85, word_count: 3090 },
            { id: 43, chapter_no: 43, title: '强化复盘三', status: 'success', score: 86, word_count: 3021 },
          ],
        }),
      },
    ],
  } as any
}

export function strengthenedAcceptanceBatchRun(args: {
  id: number
  createdAt: string
  chapterNos: number[]
}) {
  return {
    id: args.id,
    run_type: 'batch_generate_prose',
    created_at: args.createdAt,
    status: 'success',
    input_ref: JSON.stringify({
      source: 'auto_creation_safe_batch',
      safety_limit: args.chapterNos.length,
      batch_preflight: {
        recovery_evidence_release_summary: strengthenedRepairReleaseSummary(args.chapterNos),
      },
    }),
    output_ref: JSON.stringify({
      total: args.chapterNos.length,
      success: args.chapterNos.length,
      failed: 0,
      chapters: args.chapterNos.map((chapterNo, index) => ({
        id: chapterNo,
        chapter_no: chapterNo,
        title: `强化趋势${chapterNo}`,
        status: 'success',
        score: 84 + index,
        word_count: 3000 + index * 10,
      })),
    }),
  }
}

export function expandedSafeBatchRun(args: {
  id: number
  createdAt: string
  chapterNos: number[]
}) {
  return {
    id: args.id,
    run_type: 'batch_generate_prose',
    created_at: args.createdAt,
    status: 'success',
    input_ref: JSON.stringify({
      source: 'auto_creation_safe_batch',
      safety_limit: args.chapterNos.length,
      batch_preflight: {
        safe_chapter_count: args.chapterNos.length,
        allowed_chapter_nos: args.chapterNos,
        safe_batch_expansion_policy: {
          status: 'expanded',
          label: '强化扩批规则',
          summary: '强化恢复验收连续 3/3 批通过，本轮可从 3 章扩到 5 章安全连写。',
          target_chapter_count: 5,
          base_chapter_count: 3,
          expanded_chapter_count: 5,
          required_pass_streak: 3,
          pass_streak: 3,
          accepted_batch_count: 3,
          failed_batch_count: 0,
          latest_status: 'ok',
        },
      },
    }),
    output_ref: JSON.stringify({
      total: args.chapterNos.length,
      success: args.chapterNos.length,
      failed: 0,
      chapters: args.chapterNos.map((chapterNo, index) => ({
        id: chapterNo,
        chapter_no: chapterNo,
        title: `扩批验收${chapterNo}`,
        status: 'success',
        score: 84 + index,
        word_count: 3000 + index * 10,
      })),
    }),
  }
}

export function restoredFiveChapterBatchRun(args: {
  id: number
  createdAt: string
  chapterNos: number[]
  validationChapterNos?: number[]
  defaultFiveChapterRecoveryVerdict?: any
}) {
  const validationChapterNos = args.validationChapterNos || [50, 51, 52]
  const recoveryRestoreConfirmation = {
    status: 'ready',
    label: '确认恢复5章扩批',
    validation_chapter_nos: validationChapterNos,
    target_chapter_count: 5,
    ...(args.defaultFiveChapterRecoveryVerdict ? {
      default_five_chapter_recovery_verdict: args.defaultFiveChapterRecoveryVerdict,
    } : {}),
  }
  return {
    id: args.id,
    run_type: 'batch_generate_prose',
    created_at: args.createdAt,
    status: 'success',
    input_ref: JSON.stringify({
      source: 'safe_batch_recovery_restore_five_batch',
      safety_limit: args.chapterNos.length,
      recovery_restore_confirmation: recoveryRestoreConfirmation,
      batch_preflight: {
        safe_chapter_count: args.chapterNos.length,
        allowed_chapter_nos: args.chapterNos,
        safe_batch_recovery_restore_confirmation: recoveryRestoreConfirmation,
        safe_batch_expansion_policy: {
          status: 'expanded',
          label: '强化扩批规则',
          summary: '3章验证批通过，本轮确认恢复 5 章扩批。',
          target_chapter_count: 5,
          base_chapter_count: 3,
          expanded_chapter_count: 5,
          required_pass_streak: 3,
          pass_streak: 3,
          accepted_batch_count: 3,
          failed_batch_count: 1,
          latest_status: 'ok',
          expansion_feedback: {
            visible: true,
            status: 'recovered',
            label: '扩批热区反馈',
            summary: '扩批结构验证批通过，可恢复5章扩批。',
            target_chapter_count: 5,
            latest_chapter_nos: validationChapterNos,
            risk_count: 0,
            repeated_hotspot_segment: { key: 'middle', label: '中段', count: 2 },
            expansion_structure_validation_result: {
              visible: true,
              status: 'ok',
              label: '扩批结构验证',
              summary: '扩批结构验证批通过。',
              validation_chapter_nos: validationChapterNos,
              risk_count: 0,
              repeated_hotspot_segment: { key: 'middle', label: '中段', count: 2 },
            },
          },
        },
      },
    }),
    output_ref: JSON.stringify({
      total: args.chapterNos.length,
      success: args.chapterNos.length,
      failed: 0,
      chapters: args.chapterNos.map((chapterNo, index) => ({
        id: chapterNo,
        chapter_no: chapterNo,
        title: `恢复扩批${chapterNo}`,
        status: 'success',
        score: 88 + index,
        word_count: 3150 + index * 20,
      })),
    }),
  }
}

export function defaultFiveChapterLaneBatchRun(args: {
  id: number
  createdAt: string
  chapterNos: number[]
  restoreChapterNos: number[]
  validationChapterNos: number[]
  defaultFiveChapterRecoveryVerdict?: any
  templateVersionProfile?: any
}) {
  const lane = {
    visible: true,
    status: 'ready',
    label: '默认5章档位',
    source: 'recovery_restore_stability_evidence',
    stable_pass_streak: 2,
    required_stable_pass_streak: 2,
    default_five_chapter_ready: true,
    restore_chapter_nos: args.restoreChapterNos,
    validation_chapter_nos: args.validationChapterNos,
    summary: `恢复5章扩批连续 2 批稳定，第${args.restoreChapterNos.join('、')}章已可作为默认5章档位证据。`,
    ...(args.templateVersionProfile ? {
      template_version_id: args.templateVersionProfile.id,
      latest_template_version_profile: args.templateVersionProfile,
    } : {}),
    ...(args.defaultFiveChapterRecoveryVerdict ? {
      default_five_chapter_recovery_verdict: args.defaultFiveChapterRecoveryVerdict,
    } : {}),
  }
  return {
    id: args.id,
    run_type: 'batch_generate_prose',
    created_at: args.createdAt,
    status: 'success',
    input_ref: JSON.stringify({
      source: 'auto_creation_safe_batch',
      safety_limit: args.chapterNos.length,
      default_five_chapter_lane: lane,
      batch_preflight: {
        safe_chapter_count: args.chapterNos.length,
        allowed_chapter_nos: args.chapterNos,
        safe_batch_recovery_restore_stability_lane: lane,
        safe_batch_expansion_policy: {
          status: 'expanded',
          label: '强化扩批规则',
          summary: '恢复5章扩批连续 2 批稳定，本轮作为默认5章档位生产。',
          target_chapter_count: 5,
          base_chapter_count: 3,
          expanded_chapter_count: 5,
          required_pass_streak: 3,
          pass_streak: 3,
          accepted_batch_count: 3,
          failed_batch_count: 1,
          latest_status: 'ok',
        },
      },
    }),
    output_ref: JSON.stringify({
      total: args.chapterNos.length,
      success: args.chapterNos.length,
      failed: 0,
      chapters: args.chapterNos.map((chapterNo, index) => ({
        id: chapterNo,
        chapter_no: chapterNo,
        title: `默认档${chapterNo}`,
        status: 'success',
        score: 87 + index,
        word_count: 3180 + index * 15,
      })),
    }),
  }
}

export function expansionStructureVerification(chapterNos = [50, 51, 52]) {
  return {
    source: 'safe_batch_expansion_structure_repair',
    label: '扩批结构验证',
    repeated_hotspot_segment: { key: 'middle', label: '中段', count: 2 },
    validation_chapter_nos: chapterNos,
    fixed_segment_role: '中段固定职责：每批第3-4章必须完成主线转折、显性回报和章末追读。',
    conflict_rotation: '验证批次每章必须更换冲突来源。',
    explicit_payoff: '每章至少一个显性回报，不能只铺垫。',
    ending_hook_requirement: '每章章末必须留下不同的章末追读问题。',
    structure_actions: ['前段抛压，中段兑现并升级，后段留钩。'],
  }
}

export function expansionStructureValidationBatchRun(args: {
  id: number
  createdAt: string
  chapterNos: number[]
  source?: string
}) {
  return {
    id: args.id,
    run_type: 'batch_generate_prose',
    created_at: args.createdAt,
    status: 'success',
    input_ref: JSON.stringify({
      source: args.source || 'auto_creation_safe_batch',
      safety_limit: args.chapterNos.length,
      batch_preflight: {
        safe_chapter_count: args.chapterNos.length,
        allowed_chapter_nos: args.chapterNos,
        safe_batch_expansion_policy: {
          status: 'recovering',
          label: '强化扩批规则',
          summary: '扩批结构修复后进入2-3章验证批。',
          target_chapter_count: args.chapterNos.length,
          base_chapter_count: 3,
          expanded_chapter_count: 5,
          required_pass_streak: 3,
          pass_streak: 3,
          accepted_batch_count: 3,
          failed_batch_count: 1,
          latest_status: 'warn',
        },
        safe_batch_expansion_structure_verification: expansionStructureVerification(args.chapterNos),
      },
      next_batch_brief: {
        chapter_range_label: `第${args.chapterNos[0]}-${args.chapterNos[args.chapterNos.length - 1]}章`,
        expansionStructureVerification: expansionStructureVerification(args.chapterNos),
      },
    }),
    output_ref: JSON.stringify({
      total: args.chapterNos.length,
      success: args.chapterNos.length,
      failed: 0,
      chapters: args.chapterNos.map((chapterNo, index) => ({
        id: chapterNo,
        chapter_no: chapterNo,
        title: `结构验证${chapterNo}`,
        status: 'success',
        score: 86 + index,
        word_count: 3100 + index * 20,
      })),
    }),
  }
}

export function defaultRegressionValidationBatchRun(args: {
  id: number
  createdAt: string
  chapterNos: number[]
  defaultRegression: any
}) {
  const verification = {
    ...expansionStructureVerification(args.chapterNos),
    default_five_chapter_regression: args.defaultRegression,
  }
  return {
    id: args.id,
    run_type: 'batch_generate_prose',
    created_at: args.createdAt,
    status: 'success',
    input_ref: JSON.stringify({
      source: 'safe_batch_recovery_validation_batch',
      safety_limit: args.chapterNos.length,
      batch_preflight: {
        safe_chapter_count: args.chapterNos.length,
        allowed_chapter_nos: args.chapterNos,
        safe_batch_expansion_policy: {
          status: 'recovering',
          label: '强化扩批规则',
          summary: '默认档位回退后进入3章验证批。',
          target_chapter_count: args.chapterNos.length,
          base_chapter_count: 3,
          expanded_chapter_count: 5,
          required_pass_streak: 3,
          pass_streak: 3,
          accepted_batch_count: 3,
          failed_batch_count: 1,
          latest_status: 'warn',
        },
        safe_batch_expansion_structure_verification: verification,
      },
      next_batch_brief: {
        chapter_range_label: `第${args.chapterNos[0]}-${args.chapterNos[args.chapterNos.length - 1]}章`,
        expansionStructureVerification: verification,
      },
    }),
    output_ref: JSON.stringify({
      total: args.chapterNos.length,
      success: args.chapterNos.length,
      failed: 0,
      chapters: args.chapterNos.map((chapterNo, index) => ({
        id: chapterNo,
        chapter_no: chapterNo,
        title: `默认档验证${chapterNo}`,
        status: 'success',
        score: 88 + index,
        word_count: 3200 + index * 20,
      })),
    }),
  }
}

export function defaultLaneTemplateValidationBatchRun(args: {
  id: number
  createdAt: string
  chapterNos: number[]
  template?: any
}) {
  const template = args.template || {
    visible: true,
    status: 'fulfilled',
    label: '默认5章档位模板回检',
    summary: '默认5章档位模板已补齐。下一轮验证批逐章继承四项模板。',
    segment_duty_rewrite: '段位职责重写：前段压迫、中段兑现、后段升级钩子。',
    conflict_rotation: '冲突轮换：规则压迫、人物对抗、信息误导三类轮换。',
    payoff_density: '回报密度：每章至少交付一个显性回报。',
    ending_hook_template: '章末追读模板：最后 300 字落触发事件、读者问题、下一章风险。',
    requirements: [
      { key: 'default_lane_segment_duty', label: '默认档位段位职责', status: 'fulfilled' },
      { key: 'default_lane_conflict_rotation', label: '冲突轮换', status: 'fulfilled' },
      { key: 'default_lane_payoff_density', label: '回报密度', status: 'fulfilled' },
      { key: 'default_lane_ending_hook_template', label: '章末追读模板', status: 'fulfilled' },
    ],
  }
  const verification = {
    ...expansionStructureVerification(args.chapterNos),
    source: 'safe_batch_expansion_structure_decision_mismatch',
    default_five_chapter_lane_template: template,
  }
  return {
    id: args.id,
    run_type: 'batch_generate_prose',
    created_at: args.createdAt,
    status: 'success',
    input_ref: JSON.stringify({
      source: 'safe_batch_recovery_validation_batch',
      safety_limit: args.chapterNos.length,
      batch_preflight: {
        safe_chapter_count: args.chapterNos.length,
        allowed_chapter_nos: args.chapterNos,
        safe_batch_expansion_policy: {
          status: 'recovering',
          label: '强化扩批规则',
          summary: '默认档位模板修复后进入3章验证批。',
          target_chapter_count: args.chapterNos.length,
          base_chapter_count: 3,
          expanded_chapter_count: 5,
          required_pass_streak: 3,
          pass_streak: 3,
          accepted_batch_count: 3,
          failed_batch_count: 1,
          latest_status: 'warn',
        },
        safe_batch_expansion_structure_verification: verification,
      },
      next_batch_brief: {
        chapter_range_label: `第${args.chapterNos[0]}-${args.chapterNos[args.chapterNos.length - 1]}章`,
        expansionStructureVerification: verification,
      },
    }),
    output_ref: JSON.stringify({
      total: args.chapterNos.length,
      success: args.chapterNos.length,
      failed: 0,
      chapters: args.chapterNos.map((chapterNo, index) => ({
        id: chapterNo,
        chapter_no: chapterNo,
        title: `模板验证${chapterNo}`,
        status: 'success',
        score: 88 + index,
        word_count: 3200 + index * 20,
      })),
    }),
  }
}

export function strengthenedAcceptanceQualityReviews(chapterNos: number[], startId = 4600, createdAt = '2026-06-10T01:00:00.000Z') {
  return chapterNos.map((chapterNo, index) => ({
    id: startId + index,
    chapter_id: chapterNo,
    review_type: 'prose_quality',
    created_at: createdAt.replace('01:00', `01:${String(index).padStart(2, '0')}`),
    payload: JSON.stringify({ score: 84 + index, passed: true }),
  }))
}


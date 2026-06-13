import { describe, expect, test } from 'bun:test'
import { buildAutoCreationDirectorModel, buildStyleSampleTaskBookRecheckPlan } from './autoCreationDirectorModel'

const basePlanning = {
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

const baseWriting = {
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

describe('buildAutoCreationDirectorModel', () => {
  test('reuses the story planning creation pipeline as the director source of truth', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        creationPipeline: {
          currentStageKey: 'longform_plan',
          summary: '当前建议先处理「长线规划」：未来10章 10/10，未来100章 100/100，里程碑缺少百万字锚点。',
          riskCount: 1,
          primaryAction: {
            key: 'future100_generate',
            label: '生成未来100章',
            reason: '里程碑缺少百万字锚点。',
          },
          stages: [
            { key: 'book_core', label: '全书核心', status: 'ok', active: false, score: 90, detail: '核心稳定', actionKey: 'open_outline_tree' },
            { key: 'longform_plan', label: '长线规划', status: 'warn', active: true, score: 72, detail: '里程碑缺少百万字锚点。', actionKey: 'future100_generate' },
            { key: 'story_assets', label: '设定资产', status: 'ok', active: false, score: 88, detail: '资产可调度', actionKey: 'open_story_assets' },
            { key: 'chapter_launch', label: '章节开写', status: 'ok', active: false, score: 88, detail: '本章可写', actionKey: 'enter_chapter_writing' },
            { key: 'delivery_acceptance', label: '交稿验收', status: 'ok', active: false, score: 86, detail: '交稿风险可控', actionKey: 'open_quality_revision' },
            { key: 'serial_release', label: '连载发布', status: 'ok', active: false, score: 86, detail: '发布缓冲稳定', actionKey: 'enter_chapter_writing' },
          ],
        },
      },
      writing: baseWriting,
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.creationPipeline.currentStageKey).toBe('longform_plan')
    expect(model.creationPipeline.summary).toContain('长线规划')
    expect(model.creationPipeline.primaryAction.key).toBe('future100_generate')
    expect(model.creationPipeline.primaryAction.modelCall).toBe(true)
    expect(model.creationPipeline.stages.map(stage => stage.label)).toEqual([
      '全书核心',
      '长线规划',
      '设定资产',
      '章节开写',
      '交稿验收',
      '连载发布',
    ])
    expect(model.creationPipeline.stages.find(stage => stage.key === 'longform_plan')).toMatchObject({
      status: 'warning',
      active: true,
      action: { key: 'future100_generate', area: 'planning' },
    })
  })

  test('prioritizes running background work and routes the user to the task center', () => {
    const model = buildAutoCreationDirectorModel({
      planning: basePlanning,
      writing: baseWriting,
      activeTasks: [{ id: 91, run_type: 'chapter_generation_pipeline', type_label: '章节流水线', status: 'running', progress: 42 }],
      selectedModelId: 12,
    })

    expect(model.status).toBe('running')
    expect(model.mainAction.area).toBe('ops')
    expect(model.mainAction.key).toBe('open_task_center')
    expect(model.mainAction.label).toBe('查看任务中心')
    expect(model.queue.activeCount).toBe(1)
    expect(model.pipeline.find(step => step.key === 'async_tasks')?.status).toBe('active')
  })

  test('recommends strategic repair before drafting when longform planning is not ready', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          longformHealth: { status: 'needs_planning', label: '需要补规划' },
          future10Coverage: { ready: false, planned: 5, required: 10, missingChapters: [9, 10, 11, 12, 13], label: '5/10' },
        },
        healthIssues: [
          { key: 'future10_incomplete', severity: 'critical', title: '未来十章规划不足', detail: '当前覆盖 5/10。', actionKey: 'update_rolling_plan' },
        ],
      },
      writing: baseWriting,
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.status).toBe('blocked')
    expect(model.mainAction.area).toBe('planning')
    expect(model.mainAction.key).toBe('update_rolling_plan')
    expect(model.mainAction.modelCall).toBe(true)
    expect(model.blockers).toContain('未来十章规划不足')
    expect(model.pipeline.find(step => step.key === 'longform_planning')?.status).toBe('blocked')
  })

  test('surfaces retention and storyline governance before chapter generation', () => {
    const retentionModel = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        first30Retention: {
          ...basePlanning.first30Retention,
          status: 'stale',
          score: 62,
          summary: '前30章内容已变化，需重新诊断。',
          actionKey: 'run_first30_retention',
        },
      },
      writing: baseWriting,
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(retentionModel.status).toBe('needs_governance')
    expect(retentionModel.mainAction.area).toBe('planning')
    expect(retentionModel.mainAction.key).toBe('run_first30_retention')
    expect(retentionModel.mainAction.label).toBe('运行前30章诊断')

    const storylineModel = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        storylineBoard: {
          ...basePlanning.storylineBoard,
          status: 'needs_attention',
          overdueCount: 2,
          summary: '2 条剧情线逾期未推。',
        },
      },
      writing: baseWriting,
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(storylineModel.status).toBe('needs_governance')
    expect(storylineModel.mainAction.area).toBe('planning')
    expect(storylineModel.mainAction.key).toBe('open_story_assets')
    expect(storylineModel.confirmations).toContain('剧情线需要调度确认')
  })

  test('routes character growth risks into governance before chapter generation', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        characterArcBoard: {
          status: 'needs_attention',
          summary: '人物成长需治理：1 条成长断档，1 条关系待推进，人物弧光缺口 3。',
          total: 2,
          growthGapCount: 3,
          overdueCount: 1,
          relationshipRiskCount: 1,
          actionKey: 'open_quality_revision',
          arcs: [],
        },
      },
      writing: baseWriting,
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.status).toBe('needs_governance')
    expect(model.statusLabel).toBe('人物成长待治理')
    expect(model.mainAction.area).toBe('planning')
    expect(model.mainAction.key).toBe('open_quality_revision')
    expect(model.confirmations).toContain('人物成长需要治理确认')
    expect(model.dailyBattlePlan.currentStepKey).toBe('fuel_materials')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'fuel_materials')?.status).toBe('active')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'fuel_materials')?.action.key).toBe('open_quality_revision')
    expect(model.pipeline.find(step => step.key === 'story_assets')?.status).toBe('warning')
    expect(model.pipeline.find(step => step.key === 'story_assets')?.detail).toContain('人物弧光缺口 3')
  })

  test('surfaces longform rhythm governance before chapter generation', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        longformRhythm: {
          ...basePlanning.longformRhythm,
          status: 'needs_attention',
          score: 67,
          label: '节奏风险 67',
          summary: '核心偏移和回报欠账正在累积。',
          signals: basePlanning.longformRhythm.signals.map((signal: any) => signal.key === 'payoff'
            ? { ...signal, status: 'warn', score: 58, detail: '回报欠账 2', actionKey: 'open_quality_revision' }
            : signal),
          nextActions: ['先处理核心偏移、回报欠账和剧情线债务，再连续生成下一批章节。'],
        },
      },
      writing: baseWriting,
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.status).toBe('needs_governance')
    expect(model.mainAction.area).toBe('planning')
    expect(model.mainAction.key).toBe('open_quality_revision')
    expect(model.metrics.longformRhythmScore).toBe(67)
    expect(model.pipeline.find(step => step.key === 'longform_rhythm')?.status).toBe('warning')
    expect(model.confirmations).toContain('长篇节奏需要校准')
  })

  test('builds a five-stage serial workflow rail around the real writing order', () => {
    const planningModel = buildAutoCreationDirectorModel({
      planning: basePlanning,
      writing: baseWriting,
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(planningModel.serialWorkflow.stages.map(stage => stage.key)).toEqual([
      'book_core',
      'longform_plan',
      'chapter_launch',
      'delivery_acceptance',
      'serial_governance',
    ])
    expect(planningModel.serialWorkflow.currentKey).toBe('chapter_launch')
    expect(planningModel.serialWorkflow.currentLabel).toBe('单章开写')
    expect(planningModel.serialWorkflow.stages.find(stage => stage.key === 'chapter_launch')?.status).toBe('active')
    expect(planningModel.serialWorkflow.stages.find(stage => stage.key === 'book_core')?.status).toBe('done')
    expect(planningModel.serialWorkflow.stages.find(stage => stage.key === 'longform_plan')?.status).toBe('done')
    expect(planningModel.serialWorkflow.stages.find(stage => stage.key === 'delivery_acceptance')?.status).toBe('pending')

    const deliveryModel = buildAutoCreationDirectorModel({
      planning: basePlanning,
      writing: {
        ...baseWriting,
        nextChapter: { ...baseWriting.nextChapter, wordCount: 3180, hasProse: true },
        chapterAcceptanceDesk: {
          ...baseWriting.chapterAcceptanceDesk,
          visible: true,
          acceptanceStatus: 'needs_quality_check',
          statusLabel: '待交稿质检',
          acceptanceReasons: ['正文已生成，需要先跑交稿质检。'],
          recommendedAcceptanceAction: { key: 'review_draft', label: '运行交稿质检' },
        },
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(deliveryModel.serialWorkflow.currentKey).toBe('delivery_acceptance')
    expect(deliveryModel.serialWorkflow.currentLabel).toBe('交稿质检')
    expect(deliveryModel.serialWorkflow.stages.find(stage => stage.key === 'chapter_launch')?.status).toBe('done')
    expect(deliveryModel.serialWorkflow.stages.find(stage => stage.key === 'delivery_acceptance')?.status).toBe('active')
    expect(deliveryModel.serialWorkflow.summary).toContain('交稿质检')
  })

  test('maps the five-stage serial rail to actionable workspace entries', () => {
    const model = buildAutoCreationDirectorModel({
      planning: basePlanning,
      writing: baseWriting,
      activeTasks: [],
      selectedModelId: 12,
    })

    const actions = Object.fromEntries(model.serialWorkflow.stages.map(stage => [stage.key, stage.action]))
    expect(actions.book_core.key).toBe('longform_creation_diagnosis')
    expect(actions.book_core.area).toBe('planning')
    expect(actions.book_core.modelCall).toBe(true)
    expect(actions.longform_plan.key).toBe('enter_story_planning')
    expect(actions.longform_plan.area).toBe('planning')
    expect(actions.chapter_launch.key).toBe('enter_chapter_writing')
    expect(actions.chapter_launch.area).toBe('planning')
    expect(actions.delivery_acceptance.key).toBe('review_draft')
    expect(actions.delivery_acceptance.area).toBe('writing')
    expect(actions.serial_governance.key).toBe('open_task_center')
    expect(actions.serial_governance.area).toBe('ops')
  })

  test('carries the longform battle desk into the auto creation director', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        longformBattleDesk: {
          status: 'needs_action',
          score: 72,
          label: '长篇作战待治理 72',
          summary: '先处理 读者拉力：前30章留存需要复诊。',
          primaryAction: {
            key: 'run_first30_retention',
            label: '运行前30章诊断',
            reason: '前30章内容更新后需要重新诊断。',
          },
          riskChips: ['前30章留存', '剧情线调度'],
          lanes: [
            { key: 'story_core', label: '核心守恒', status: 'ok', score: 88, detail: '核心稳定。', actionKey: 'open_outline_tree' },
            { key: 'reader_pull', label: '读者拉力', status: 'warn', score: 62, detail: '前30章留存需要复诊。', actionKey: 'run_first30_retention' },
            { key: 'storyline', label: '剧情线调度', status: 'warn', score: 70, detail: '剧情线需要确认。', actionKey: 'open_story_assets' },
            { key: 'volume_beat', label: '卷级爆点', status: 'ok', score: 86, detail: '卷级爆点稳定。', actionKey: 'enter_chapter_writing' },
            { key: 'innovation_ip', label: '创新/IP场面', status: 'ok', score: 84, detail: '创新稳定。', actionKey: 'enter_chapter_writing' },
            { key: 'production_fuel', label: '生产燃料', status: 'ok', score: 88, detail: '生产燃料充足。', actionKey: 'enter_chapter_writing' },
          ],
        },
      },
      writing: baseWriting,
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.longformBattleDesk.status).toBe('needs_action')
    expect(model.longformBattleDesk.primaryAction.key).toBe('run_first30_retention')
    expect(model.longformBattleDesk.lanes.map(item => item.key)).toEqual([
      'story_core',
      'reader_pull',
      'storyline',
      'volume_beat',
      'innovation_ip',
      'production_fuel',
    ])
    expect(model.longformBattleDesk.riskChips).toContain('前30章留存')
  })

  test('surfaces volume climax budget governance before chapter generation', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        volumeBeatBudget: {
          ...basePlanning.volumeBeatBudget,
          status: 'needs_attention',
          score: 61,
          label: '爆点预算不足 61',
          summary: '当前卷只有 1 个转折点，缺少中段爆点和卷末爆点。',
          climaxCount: 1,
          nextActions: ['补齐当前卷的小高潮、中高潮和卷末爆点，再进入批量连写。'],
        },
      },
      writing: baseWriting,
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.status).toBe('needs_governance')
    expect(model.mainAction.key).toBe('complete_volume_plan')
    expect(model.metrics.volumeBeatScore).toBe(61)
    expect(model.pipeline.find(step => step.key === 'volume_beat_budget')?.status).toBe('warning')
    expect(model.confirmations).toContain('卷级高潮预算需要补齐')
  })

  test('builds a longform creation contract for core, story, innovation and reader pull', () => {
    const model = buildAutoCreationDirectorModel({
      planning: basePlanning,
      writing: baseWriting,
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.creationContract.map(item => item.key)).toEqual(['core', 'story', 'innovation', 'reader_pull'])
    expect(model.creationContract.find(item => item.key === 'core')?.label).toBe('核心不偏')
    expect(model.creationContract.find(item => item.key === 'story')?.label).toBe('故事强度')
    expect(model.creationContract.find(item => item.key === 'innovation')?.label).toBe('创新差异')
    expect(model.creationContract.find(item => item.key === 'reader_pull')?.label).toBe('读者吸引')
    expect(model.creationContract.every(item => item.status === 'ok')).toBe(true)
    expect(model.pipeline.find(step => step.key === 'creation_contract')?.status).toBe('done')
  })

  test('builds a longform compass from planning so the story core stays visible', () => {
    const model = buildAutoCreationDirectorModel({
      planning: basePlanning,
      writing: baseWriting,
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.longformCompass.status).toBe('ready')
    expect(model.longformCompass.readerPromise).toBe('寒门少年以阵法反压宗门秩序')
    expect(model.longformCompass.axes.map(item => item.key)).toEqual([
      'reader_promise',
      'core_conflict',
      'innovation_hook',
      'payoff_loop',
      'ending_direction',
    ])
    expect(model.longformCompass.axes.find(item => item.key === 'core_conflict')?.value).toContain('执事逼主角交出阵盘')
    expect(model.longformCompass.immutableRules[0]).toContain('读者承诺不可漂移')
    expect(model.longformCompass.flexibleZones).toContain('副本、支线和新资产可以调整，但必须服务当前卷目标。')
  })

  test('prefers backend longform compass from the latest creation diagnosis review', () => {
    const model = buildAutoCreationDirectorModel({
      planning: basePlanning,
      writing: baseWriting,
      activeTasks: [],
      selectedModelId: 12,
      reviews: [{
        id: 91,
        review_type: 'longform_creation_diagnosis',
        created_at: '2026-06-06T01:00:00.000Z',
        payload: JSON.stringify({
          report: {
            score: 91,
            status: 'ready',
            dimensions: [
              { key: 'core', label: '核心不偏', status: 'ok', detail: '核心稳定', evidence: ['核心证据'] },
              { key: 'story', label: '故事强度', status: 'ok', detail: '故事稳定', evidence: ['故事证据'] },
              { key: 'innovation', label: '创新差异', status: 'ok', detail: '创新稳定', evidence: ['创新证据'] },
              { key: 'reader_pull', label: '读者吸引', status: 'ok', detail: '吸引稳定', evidence: ['读者证据'] },
            ],
            compass: {
              reader_promise: '规则怪谈里用超人身体和智者脑力互补破局',
              protagonist_drive: '活下去并打穿规则牢笼',
              core_conflict: '超人蛮力与规则判定持续碰撞',
              world_hook: '每个副本都有可钻但会反噬的规则',
              innovation_hook: '超人力量不直接碾压，必须被规则约束后再反杀',
              payoff_loop: '每章一次规则发现或力量反制，每卷一次副本级真相回收',
              ending_direction: '找出规则之源并夺回制定规则的权力',
              immutable_rules: ['超人力量不能无代价碾压规则', '双主角互补关系不能拆散'],
              flexible_zones: ['副本题材可换', '支线角色可增减'],
            },
          },
        }),
      }],
    })

    expect(model.metrics.creationDiagnosisScore).toBe(91)
    expect(model.longformCompass.readerPromise).toBe('规则怪谈里用超人身体和智者脑力互补破局')
    expect(model.longformCompass.axes.find(item => item.key === 'world_hook')?.value).toContain('副本')
    expect(model.longformCompass.axes.find(item => item.key === 'protagonist_drive')?.value).toContain('活下去')
    expect(model.longformCompass.immutableRules).toContain('超人力量不能无代价碾压规则')
    expect(model.longformCompass.flexibleZones).toContain('副本题材可换')
  })

  test('marks the creation contract risky when promise, conflict, or retention are weak', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        mainline: {
          ...basePlanning.mainline,
          readerPromise: '',
          currentStageConflict: '',
          payoffModel: '',
          currentChapterServesVolume: false,
          risks: ['当前章没有服务卷目标'],
        },
        first30Retention: {
          ...basePlanning.first30Retention,
          status: 'needs_repair',
          score: 58,
          promiseReady: false,
          summary: '前30章吸引力不足。',
          actionKey: 'create_first30_repair',
        },
        healthIssues: [
          { key: 'missing_reader_promise', severity: 'critical', title: '缺读者承诺', detail: '项目缺少长篇核心承诺。', actionKey: 'open_story_assets' },
        ],
      },
      writing: baseWriting,
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.creationContract.find(item => item.key === 'core')?.status).toBe('block')
    expect(model.creationContract.find(item => item.key === 'story')?.status).toBe('warn')
    expect(model.creationContract.find(item => item.key === 'innovation')?.status).toBe('warn')
    expect(model.creationContract.find(item => item.key === 'reader_pull')?.status).toBe('block')
    expect(model.pipeline.find(step => step.key === 'creation_contract')?.status).toBe('blocked')
  })

  test('uses latest backend longform creation diagnosis review when available', () => {
    const model = buildAutoCreationDirectorModel({
      planning: basePlanning,
      writing: baseWriting,
      activeTasks: [],
      selectedModelId: 12,
      reviews: [
        {
          id: 1,
          review_type: 'longform_creation_diagnosis',
          created_at: '2026-06-01T00:00:00.000Z',
          payload: JSON.stringify({
            report: {
              score: 71,
              status: 'needs_repair',
              dimensions: [
                { key: 'core', label: '核心不偏', status: 'ok', score: 88, detail: '核心稳定', evidence: ['承诺清晰'] },
                { key: 'story', label: '故事强度', status: 'warn', score: 72, detail: '冲突阶梯偏弱', evidence: ['未来10章 8/10'], warnings: ['未来10章缺2章'] },
                { key: 'innovation', label: '创新差异', status: 'ok', score: 86, detail: '机制差异明确', evidence: ['阵法规则'] },
                { key: 'reader_pull', label: '读者吸引', status: 'warn', score: 70, detail: '前30章待修复', evidence: ['前30章 70分'] },
              ],
            },
          }),
        },
      ],
    })

    expect(model.creationContract.find(item => item.key === 'story')?.detail).toBe('冲突阶梯偏弱')
    expect(model.creationContract.find(item => item.key === 'reader_pull')?.status).toBe('warn')
    expect(model.pipeline.find(step => step.key === 'creation_contract')?.status).toBe('warning')
    expect(model.metrics.creationDiagnosisScore).toBe(71)
  })

  test('offers a runnable longform creation diagnosis from the director workspace', () => {
    const model = buildAutoCreationDirectorModel({
      planning: basePlanning,
      writing: baseWriting,
      activeTasks: [],
      selectedModelId: 12,
    })

    const action = model.secondaryActions.find(item => item.key === 'longform_creation_diagnosis')

    expect(action?.area).toBe('planning')
    expect(action?.label).toBe('运行创作诊断')
    expect(action?.modelCall).toBe(true)
  })

  test('uses chapter writing desk action when project governance is ready', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
      },
      writing: {
        ...baseWriting,
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '资格争夺', goal: '主角拿到试炼资格' }],
          reasons: [],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认计划，进入初稿' },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认计划，进入初稿',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.status).toBe('ready')
    expect(model.targetChapter?.chapterNo).toBe(8)
    expect(model.mainAction.area).toBe('writing')
    expect(model.mainAction.key).toBe('confirm_plan_and_write_draft')
    expect(model.mainAction.modelCall).toBe(true)
    expect(model.pipeline.find(step => step.key === 'chapter_execution')?.status).toBe('active')
    expect(model.dailyBattlePlan.steps.map(step => step.key)).toEqual([
      'clear_risks',
      'fuel_materials',
      'chapter_work',
      'batch_release',
    ])
    expect(model.dailyBattlePlan.currentStepKey).toBe('chapter_work')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'clear_risks')?.status).toBe('done')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'fuel_materials')?.status).toBe('done')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'chapter_work')?.status).toBe('active')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'chapter_work')?.action.key).toBe('confirm_plan_and_write_draft')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'chapter_work')?.action.modelCall).toBe(true)
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'clear_risks')?.gateChecks).toContain('交稿风险清零或已生成修复任务')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'fuel_materials')?.gateChecks).toContain('未来10章规划、剧情线、爆点预算和长篇节奏可支撑当前章')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'chapter_work')?.gateChecks).toContain('当前章完成任务书、正文、质检、修订、故事状态同步和验收闭环')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'batch_release')?.gateChecks).toContain('下一批只放行安全连写护栏允许的连续章节')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'batch_release')?.status).toBe('pending')
    expect(model.productionLicense.status).toBe('single_chapter')
    expect(model.productionLicense.modeLabel).toBe('单章生产')
    expect(model.productionLicense.summary).toContain('先推进当前章')
    expect(model.productionLicense.nextAction.key).toBe('confirm_plan_and_write_draft')
  })

  test('builds a compact today command deck from license and daily battle state', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
      },
      writing: {
        ...baseWriting,
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '资格争夺', goal: '主角拿到试炼资格' }],
          reasons: [],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认计划，进入初稿' },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认计划，进入初稿',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.todayCommandDeck.label).toBe('今日指挥条')
    expect(model.todayCommandDeck.modeLabel).toBe('单章生产')
    expect(model.todayCommandDeck.currentStepLabel).toBe('写/修当前章')
    expect(model.todayCommandDeck.action.key).toBe('confirm_plan_and_write_draft')
    expect(model.todayCommandDeck.actionLabel).toBe('确认计划，进入初稿')
    expect(model.todayCommandDeck.summary).toContain('先推进当前章')
    expect(model.todayCommandDeck.reasons[0]).toContain('当前章')
    expect(model.todayCommandDeck.qualityGates.map(item => item.key)).toEqual([
      'core',
      'story_drive',
      'reader_pull',
      'innovation',
      'serial_safety',
    ])
    expect(model.todayCommandDeck.qualityGates.find(item => item.key === 'core')?.label).toBe('核心不偏')
    expect(model.todayCommandDeck.qualityGates.find(item => item.key === 'story_drive')?.label).toBe('故事推进')
    expect(model.todayCommandDeck.qualityGates.find(item => item.key === 'reader_pull')?.label).toBe('读者拉力')
    expect(model.todayCommandDeck.qualityGates.find(item => item.key === 'innovation')?.label).toBe('创新差异')
    expect(model.todayCommandDeck.qualityGates.find(item => item.key === 'serial_safety')?.label).toBe('连载安全')
    expect(model.todayCommandDeck.qualityGates.every(item => item.status === 'ok')).toBe(true)
    expect(model.todayCommandDeck.flow.map(item => item.key)).toEqual([
      'clear_risks',
      'fuel_materials',
      'chapter_work',
      'batch_release',
    ])
    expect(model.todayCommandDeck.flow.find(item => item.key === 'chapter_work')?.status).toBe('active')
  })

  test('builds a longform serial cockpit from existing director signals', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
      },
      writing: {
        ...baseWriting,
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '资格争夺', goal: '主角拿到试炼资格' }],
          reasons: [],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认计划，进入初稿' },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认计划，进入初稿',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.serialCockpit.title).toBe('长篇连载驾驶舱')
    expect(model.serialCockpit.command.action.key).toBe('confirm_plan_and_write_draft')
    expect(model.serialCockpit.guardrails.map(item => item.key)).toEqual([
      'core_stability',
      'story_drive',
      'reader_pull',
      'innovation_ip',
      'serial_safety',
    ])
    expect(model.serialCockpit.guardrails.every(item => item.status === 'ok')).toBe(true)
    expect(model.serialCockpit.chapterChain.map(item => item.key)).toEqual([
      'handoff',
      'brief',
      'draft',
      'quality',
      'state_sync',
      'delivery',
    ])
    expect(model.serialCockpit.chapterChain.find(item => item.key === 'brief')?.status).toBe('done')
    expect(model.serialCockpit.chapterChain.find(item => item.key === 'draft')?.status).toBe('current')
    expect(model.serialCockpit.batchLicense.status).toBe('single_chapter')
    expect(model.serialCockpit.riskQueue.length).toBe(0)
  })

  test('serial cockpit summarizes open risks into a compact queue', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        first30Retention: {
          ...basePlanning.first30Retention,
          status: 'stale',
          stale: true,
          score: 70,
          summary: '前30章报告已过期。',
        },
        storylineBoard: {
          ...basePlanning.storylineBoard,
          status: 'needs_attention',
          overdueCount: 1,
          debtCount: 1,
          summary: '主线第8章应推进但未推进。',
        },
      },
      writing: {
        ...baseWriting,
        chapterAcceptanceDesk: {
          ...baseWriting.chapterAcceptanceDesk,
          visible: true,
          acceptanceStatus: 'needs_revision',
          statusLabel: '待修订',
          deliveryRiskQueue: {
            totalCount: 3,
            label: '待修复 3',
            priorityLabel: '优先补追读',
            items: ['开篇未承接上一章钩子', '主角选择不清', '章末钩子弱'],
          },
          assetIntake: {
            status: 'pending',
            label: '新资产 2 待确认',
            pendingCount: 2,
          },
          readerExpectationSync: {
            status: 'warn',
            label: '期待欠账 1',
            score: 72,
            scoreLabel: '72',
            missedCount: 1,
            openingHandoffMissedCount: 0,
          },
          recommendedAcceptanceAction: { key: 'apply_editor_revision', label: '生成修订稿' },
        },
      },
      activeTasks: [],
      selectedModelId: 12,
      reviews: [
        {
          review_type: 'delivery_risk_annotations',
          summary: '待修复 3',
          payload_json: { open_count: 3 },
          created_at: '2026-06-11T01:00:00.000Z',
        },
      ],
      selectedModelId: 12,
    })

    expect(model.serialCockpit.riskQueue.map(item => item.key)).toEqual(expect.arrayContaining([
      'delivery_risks',
      'storylines',
      'reader_expectation',
      'first30_retention',
      'asset_intake',
    ]))
    expect(model.serialCockpit.riskQueue.find(item => item.key === 'delivery_risks')?.label).toBe('待修复 3')
    expect(model.serialCockpit.riskQueue.find(item => item.key === 'asset_intake')?.count).toBe(2)
    expect(model.serialCockpit.guardrails.find(item => item.key === 'reader_pull')?.status).toBe('warn')
    expect(model.serialCockpit.guardrails.find(item => item.key === 'serial_safety')?.status).toBe('warn')
  })

  test('surfaces unresolved governance closure on director front page risk queue', () => {
    const model = buildAutoCreationDirectorModel({
      planning: basePlanning,
      writing: baseWriting,
      activeTasks: [],
      selectedModelId: 12,
      runRecords: [
        {
          id: 91,
          run_type: 'longform_production_repair',
          created_at: '2026-06-13T08:00:00Z',
          output_ref: JSON.stringify({
            audit_summary: {
              status: 'needs_followup',
              recovery_evidence_closure: {
                status: 'needs_followup',
                total: 3,
                resolved: 1,
                single_chapter_count: 1,
                batch_count: 2,
                sources: ['single_chapter_governance_recheck', 'safe_batch_recovery_recheck'],
                failed_evidence: ['样章任务书复检通过 1 项'],
                watch_items: ['下一批继续观察样章策略命中率'],
              },
            },
          }),
        },
        {
          id: 92,
          run_type: 'longform_production_repair',
          created_at: '2026-06-13T09:00:00Z',
          output_ref: JSON.stringify({
            source: 'storyline_diff_decision',
            tasks: [
              {
                source: 'storyline_diff_decision',
                issue_type: 'storyline_diff_revise_prose',
                task_status: 'needs_review',
                title: '第45章剧情线回修',
              },
            ],
          }),
        },
      ],
    })

    expect(model.governanceClosureBrief.status).toBe('block')
    expect(model.governanceClosureBrief.summary).toContain('恢复依据审计')
    expect(model.governanceClosureBrief.summary).toContain('单章治理复查 1')
    expect(model.governanceClosureBrief.summary).toContain('批次恢复复查 2')
    expect(model.governanceClosureBrief.sourceSummary).toBe('单章治理复查 1；批次恢复复查 2')
    expect(model.governanceClosureBrief.summary).toContain('剧情线决策')
    expect(model.governanceClosureBrief.action.key).toBe('review_governance_closure')
    expect(model.governanceClosureBrief.action.label).toBe('治理复查台')
    expect(model.governanceClosureBrief.action.payload).toEqual(expect.objectContaining({
      repairAuditRunId: 91,
      recoveryEvidenceStatus: 'needs_followup',
      storylineDecisionTaskCount: 1,
      storylineDecisionTaskTitles: ['第45章剧情线回修'],
      recoveryEvidenceSourceSummary: '单章治理复查 1；批次恢复复查 2',
    }))
    expect(model.serialCockpit.riskQueue[0]).toEqual(expect.objectContaining({
      key: 'governance_closure',
      label: '治理闭环',
      status: 'block',
    }))
    expect(model.serialCockpit.riskQueue[0].detail).toContain('样章任务书复检通过 1 项')
    expect(model.productionLicense.reasons.join('')).toContain('恢复依据审计')
  })

  test('records closed governance recheck memory in today command deck', () => {
    const model = buildAutoCreationDirectorModel({
      planning: basePlanning,
      writing: baseWriting,
      activeTasks: [],
      selectedModelId: 12,
      runRecords: [
        {
          id: 93,
          run_type: 'longform_production_repair',
          created_at: '2026-06-13T22:00:00Z',
          output_ref: JSON.stringify({
            audit_summary: {
              status: 'closed',
              recovery_evidence_closure: {
                status: 'closed',
                total: 2,
                resolved: 2,
                failed_evidence: ['样章任务书复检通过 1 项'],
                repaired_evidence: ['第42章对白交锋已补回样章节奏', '章末读者回报已兑现'],
                watch_items: ['下一批继续观察样章策略命中率'],
              },
            },
          }),
        },
      ],
    })

    expect(model.governanceClosureBrief.status).toBe('ok')
    expect(model.todayCommandDeck.governanceMemory.visible).toBe(true)
    expect(model.todayCommandDeck.governanceMemory.status).toBe('closed')
    expect(model.todayCommandDeck.governanceMemory.label).toBe('治理复查已记录')
    expect(model.todayCommandDeck.governanceMemory.summary).toContain('恢复依据闭环 2/2')
    expect(model.todayCommandDeck.governanceMemory.evidence).toContain('第42章对白交锋已补回样章节奏')
    expect(model.todayCommandDeck.governanceMemory.watchItems).toContain('下一批继续观察样章策略命中率')
  })

  test('serial cockpit degrades gracefully when chapter material is missing', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        mainline: {
          ...basePlanning.mainline,
          readerPromise: '',
          currentVolumeGoal: '',
        },
      },
      writing: {
        ...baseWriting,
        nextChapter: null,
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'blocked',
          statusLabel: '缺少章节',
          reasons: ['还没有可写章节。'],
          recommendedPlannerAction: { key: 'open_outline_panel', label: '打开大纲面板' },
        },
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.serialCockpit.chapterChain.find(item => item.key === 'handoff')?.status).toBe('block')
    expect(model.serialCockpit.chapterChain.find(item => item.key === 'handoff')?.detail).toContain('还没有可写章节')
    expect(model.serialCockpit.guardrails.find(item => item.key === 'core_stability')?.status).toBe('block')
    expect(model.serialCockpit.command.action.key).toBe('open_outline_panel')
  })

  test('today command deck explains why safe batch generation is allowed', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        futureRoute: [
          { chapterNo: 8, title: '试炼前夜', chapterTask: '主角拿到试炼资格', conflict: '执事设局阻拦', endingHook: '阵盘亮起第二道裂纹', mainlineProgress: '进入外门试炼核心局', riskTags: [] },
          { chapterNo: 9, title: '阵盘裂纹', chapterTask: '阵盘异常暴露主角潜力', conflict: '同门围堵试探底牌', endingHook: '内门执事点名关注', mainlineProgress: '让宗门高层第一次注意主角', riskTags: [] },
          { chapterNo: 10, title: '外门震动', chapterTask: '试炼结果引发宗门震动', conflict: '旧秩序压制新晋黑马', endingHook: '内门招揽提出苛刻条件', mainlineProgress: '打开内门势力线', riskTags: [] },
        ],
      },
      writing: {
        ...baseWriting,
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
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
      runRecords: [
        {
          id: 902,
          run_type: 'longform_production_repair',
          created_at: '2026-06-14T09:00:00Z',
          output_ref: {
            audit_summary: {
              status: 'closed',
              recovery_evidence_closure: {
                status: 'closed',
                total: 2,
                resolved: 2,
                tasks: [
                  {
                    chapter_no: 42,
                    task_index: 0,
                    task_status: 'resolved',
                    source: 'single_chapter_governance_recheck',
                    source_label: '单章治理复查',
                    recovery_evidence_review: {
                      status: 'ok',
                      summary: '单章治理复查通过。',
                      failed_evidence: [],
                    },
                  },
                  {
                    chapter_no: 43,
                    task_index: 1,
                    task_status: 'resolved',
                    source: 'safe_batch_recovery_recheck',
                    source_label: '批次恢复复查',
                    recovery_evidence_review: {
                      status: 'ok',
                      summary: '批次恢复复查通过。',
                      failed_evidence: [],
                    },
                  },
                ],
              },
            },
          },
        },
        {
          id: 901,
          run_type: 'longform_production_repair',
          created_at: '2026-06-14T08:00:00Z',
          status: 'ready',
          input_ref: {
            source: 'style_sample_batch_preflight',
          },
          output_ref: {
            report: {
              source: 'style_sample_batch_preflight',
            },
            tasks: [
              {
                issue_type: 'style_sample_task_book_rebuild',
                task_status: 'resolved',
                chapter_no: 9,
                sample_key: '旧高压反打样章',
              },
              {
                issue_type: 'style_sample_task_book_rebuild',
                task_status: 'resolved',
                chapter_no: 10,
                sample_key: '旧对白交锋样章',
              },
            ],
          },
        },
      ],
      storyState: {
        last_updated_chapter: 7,
        global: {
          core_promise: '李超用超人蛮力碰撞规则怪谈，张智负责拆解规则。',
          current_volume_goal: '午夜校园中活过第一轮规则。',
          open_questions: ['广播是谁发出的', '湿漉漉学生为什么敲门'],
          payoff_queue: ['规则边界反制蛮力'],
        },
        characters: [
          { name: '李超', status: '力量觉醒但不懂规则', location: '宿舍楼大厅' },
          { name: '张智', status: '负责推理规则', location: '宿舍楼大厅' },
        ],
      },
    } as any)

    expect(model.productionLicense.status).toBe('batch_allowed')
    expect(model.todayCommandDeck.releaseRationale.mode).toBe('小批量连写')
    expect(model.todayCommandDeck.releaseRationale.allowedCount).toBe(3)
    expect(model.todayCommandDeck.releaseRationale.primaryReason).toContain('可按安全连写放行 3 章')
    expect(model.todayCommandDeck.releaseRationale.checks).toEqual(expect.arrayContaining(['长线材料可用', '交稿风险已清', '下一批任务书可执行']))
    expect(model.todayCommandDeck.releaseRationale.limits).toContain('只放行护栏确认的连续章节')
    expect(model.batchGuardrail.briefRecovery.evidence).toContain('样章任务书复检通过 2 项')
    expect(model.batchGuardrail.briefRecovery.evidence).toContain('第9、10章样章已重审')
    expect(model.batchGuardrail.recommendedAction.payload?.batch_preflight?.recovery_evidence).toEqual(expect.arrayContaining([
      '批次任务书完整',
      '样章任务书复检通过 2 项',
      '第9、10章样章已重审',
    ]))
    expect(model.batchGuardrail.preflight.inputSnapshot.recovery_evidence_production_gate).toMatchObject({
      status: 'ok',
      label: '恢复依据生产闸门',
      sources: [
        expect.objectContaining({
          source: 'single_chapter_governance_recheck',
          status: 'cleared',
          status_label: '生产阻断已解除',
        }),
        expect.objectContaining({
          source: 'safe_batch_recovery_recheck',
          status: 'cleared',
          status_label: '生产阻断已解除',
        }),
      ],
    })
    expect(model.batchGuardrail.recommendedAction.payload?.batch_preflight?.recovery_evidence_production_gate).toMatchObject({
      status: 'ok',
      source_count: 2,
    })
  })

  test('blocks safe batching at the director entry when recovery evidence sources still need recheck', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        futureRoute: [
          { chapterNo: 8, title: '试炼前夜', chapterTask: '主角拿到试炼资格', conflict: '执事设局阻拦', endingHook: '阵盘亮起第二道裂纹', mainlineProgress: '进入外门试炼核心局', riskTags: [] },
          { chapterNo: 9, title: '阵盘裂纹', chapterTask: '阵盘异常暴露主角潜力', conflict: '同门围堵试探底牌', endingHook: '内门执事点名关注', mainlineProgress: '让宗门高层第一次注意主角', riskTags: [] },
          { chapterNo: 10, title: '外门震动', chapterTask: '试炼结果引发宗门震动', conflict: '旧秩序压制新晋黑马', endingHook: '内门招揽提出苛刻条件', mainlineProgress: '打开内门势力线', riskTags: [] },
        ],
      },
      writing: {
        ...baseWriting,
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
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
      runRecords: [
        {
          id: 902,
          run_type: 'longform_production_repair',
          created_at: '2026-06-14T09:00:00Z',
          output_ref: {
            audit_summary: {
              status: 'closed',
              governance_recheck_memory: {
                status: 'closed',
                label: '治理复查已记录',
                summary: '恢复依据闭环 2/2，剧情线决策无未关闭项。',
                evidence: ['第42章对白交锋已补回样章节奏'],
                failed_evidence: [],
                watch_items: [],
                storyline_decision_task_count: 0,
                source_run_id: 902,
              },
              recovery_evidence_closure: {
                status: 'closed',
                total: 2,
                resolved: 2,
                tasks: [
                  {
                    chapter_no: 42,
                    task_index: 0,
                    task_status: 'open',
                    source: 'single_chapter_governance_recheck',
                    source_label: '单章治理复查',
                  },
                  {
                    chapter_no: 43,
                    task_index: 1,
                    task_status: 'needs_review',
                    source: 'safe_batch_recovery_recheck',
                    source_label: '批次恢复复查',
                    recovery_evidence_review: {
                      status: 'warn',
                      summary: '批次复盘仍有恢复依据未落地。',
                      failed_evidence: ['第43章读者回报仍未继承'],
                    },
                  },
                ],
              },
            },
          },
        },
      ],
      storyState: {
        last_updated_chapter: 7,
        global: {
          core_promise: '李超用超人蛮力碰撞规则怪谈，张智负责拆解规则。',
          current_volume_goal: '午夜校园中活过第一轮规则。',
        },
      },
    } as any)

    const recoveryGate = model.batchGuardrail.guardrails.find(item => item.label === '恢复依据生产闸门')

    expect(recoveryGate).toEqual(expect.objectContaining({
      status: 'block',
      detail: expect.stringContaining('单章治理复查：等待复检结论'),
    }))
    expect(recoveryGate?.detail).toContain('批次恢复复查：暂缓安全连写')
    expect(recoveryGate?.detail).toContain('第43章读者回报仍未继承')
    expect(model.batchGuardrail.status).toBe('blocked')
    expect(model.batchGuardrail.recommendedAction.key).toBe('review_governance_closure')
    expect(model.batchGuardrail.preflight.inputSnapshot.recovery_evidence_production_gate).toMatchObject({
      status: 'block',
      label: '恢复依据生产闸门',
      sources: [
        expect.objectContaining({
          source: 'single_chapter_governance_recheck',
          status: 'pending',
          status_label: '等待复检结论',
        }),
        expect.objectContaining({
          source: 'safe_batch_recovery_recheck',
          status: 'blocked',
          status_label: '暂缓安全连写',
          residual_evidence: ['第43章读者回报仍未继承'],
        }),
      ],
    })
    expect(model.batchGuardrail.recommendedAction.payload?.batch_preflight?.recovery_evidence_production_gate).toMatchObject({
      status: 'block',
      source_count: 2,
    })
    expect(model.todayCommandDeck.releaseRationale.checks.join('；')).toContain('恢复依据生产闸门')
    expect(model.productionLicense.status).toBe('blocked')
  })

  test('today command deck explains why production is downgraded to one chapter', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        futureRoute: [
          { chapterNo: 8, title: '试炼前夜', chapterTask: '主角拿到试炼资格', conflict: '执事设局阻拦', endingHook: '阵盘亮起第二道裂纹', mainlineProgress: '进入外门试炼核心局', riskTags: [] },
          { chapterNo: 9, title: '阵盘裂纹', chapterTask: '', conflict: '', endingHook: '内门执事点名关注', mainlineProgress: '', riskTags: ['缺逐章职责'] },
        ],
      },
      writing: {
        ...baseWriting,
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
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
    } as any)

    expect(model.productionLicense.status).toBe('single_chapter')
    expect(model.todayCommandDeck.releaseRationale.mode).toBe('单章生产')
    expect(model.todayCommandDeck.releaseRationale.allowedCount).toBe(1)
    expect(model.todayCommandDeck.releaseRationale.limits).toEqual(expect.arrayContaining([
      '暂不放行批量自动连写',
      '当前章交稿闭环完成后再评估下一批',
    ]))
    expect(model.todayCommandDeck.releaseRationale.primaryReason).toContain('先推进当前章')
  })

  test('builds a million word runway that explains the current writing course before safe batching', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        futureRoute: [
          { chapterNo: 8, title: '试炼前夜', chapterTask: '主角拿到试炼资格', conflict: '执事设局阻拦', endingHook: '阵盘亮起第二道裂纹', mainlineProgress: '主角从被动挨压转为主动入局' },
          { chapterNo: 9, title: '试炼开场', chapterTask: '主角进入外门试炼', conflict: '同门围堵抢阵旗', endingHook: '隐藏阵眼被误触', mainlineProgress: '试炼规则开始反噬反派' },
          { chapterNo: 10, title: '阵眼反杀', chapterTask: '主角公开证明阵法价值', conflict: '执事暗改规则', endingHook: '内门长老点名主角', mainlineProgress: '主角进入内门视野' },
        ],
      },
      writing: {
        ...baseWriting,
        nextChapter: {
          ...baseWriting.nextChapter,
          rawPayload: {
            readerPayoff: '用阵法反制执事设局，拿回试炼主动权',
            mainlineProgress: '主角从被动挨压转为主动入局',
          },
        },
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ scene_no: 1, title: '试炼资格争夺', conflict: '执事设局，主角反制' }],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认计划，进入初稿' },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认计划，进入初稿',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.millionWordRunway.status).toBe('ready')
    expect(model.millionWordRunway.bandLabel).toBe('第1个10万字')
    expect(model.millionWordRunway.safeModeLabel).toContain('小批量')
    expect(model.millionWordRunway.fourQuestions.map(item => item.key)).toEqual([
      'why_now',
      'page_turn',
      'mainline_move',
      'freshness',
    ])
    expect(model.millionWordRunway.fourQuestions.find(item => item.key === 'why_now')?.answer).toContain('主角拿到试炼资格')
    expect(model.millionWordRunway.fourQuestions.find(item => item.key === 'page_turn')?.answer).toContain('阵盘亮起第二道裂纹')
    expect(model.millionWordRunway.redLines.join('｜')).toContain('寒门少年以阵法反压宗门秩序')
    expect(model.millionWordRunway.readerFuel.join('｜')).toContain('用阵法反制执事设局')
  })

  test('blocks the million word runway when story state memory is stale', () => {
    const model = buildAutoCreationDirectorModel({
      planning: basePlanning,
      writing: {
        ...baseWriting,
        readiness: {
          checks: [],
          blockers: [],
          warnings: [{ key: 'story_state_stale', status: 'warn', label: '故事状态滞后', detail: '第8章未同步到长线记忆。' }],
        },
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.millionWordRunway.status).toBe('blocked')
    expect(model.millionWordRunway.safeModeLabel).toBe('禁止连写')
    expect(model.millionWordRunway.gates.find(item => item.key === 'canon_memory')?.status).toBe('block')
    expect(model.millionWordRunway.recommendedAction.key).toBe('update_canon')
    expect(model.dailyBattlePlan.currentStepKey).toBe('fuel_materials')
  })

  test('blocks chapter drafting when the current chapter no longer serves the core reader promise', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        mainline: {
          ...basePlanning.mainline,
          currentChapterServesVolume: false,
          nextTurn: '',
        },
      },
      writing: {
        ...baseWriting,
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认计划，进入初稿' },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认计划，进入初稿',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.chapterLaunchGate.status).toBe('blocked')
    expect(model.chapterLaunchGate.label).toBe('本章开写门禁未通过')
    expect(model.chapterLaunchGate.signals.find(signal => signal.key === 'mainline_service')?.status).toBe('block')
    expect(model.chapterLaunchGate.signals.find(signal => signal.key === 'reader_promise')?.detail).toContain('寒门少年以阵法反压宗门秩序')
    expect(model.status).toBe('needs_governance')
    expect(model.statusLabel).toBe('开写门禁')
    expect(model.mainAction.area).toBe('planning')
    expect(model.mainAction.key).toBe('update_rolling_plan')
    expect(model.confirmations).toContain('本章开写门禁未通过')
  })

  test('uses writing queue focus to repair current chapter plan before drafting', () => {
    const model = buildAutoCreationDirectorModel({
      planning: basePlanning,
      writing: {
        ...baseWriting,
        writingQueue: {
          visible: true,
          currentChapterNo: 8,
          readyCount: 1,
          blockedCount: 2,
          draftedCount: 1,
          planRepair: {
            visible: true,
            label: '补齐队列计划',
            chapterCount: 2,
            missingCount: 5,
            chapterNos: [8, 9],
            intent: {
              source: 'writing_queue_batch_plan_repair',
              chapter_nos: [8, 9],
            },
          },
          items: [
            {
              id: 8,
              chapterNo: 8,
              title: '试炼前夜',
              sourceLabel: '滚动规划',
              status: 'needs_plan',
              statusLabel: '待补计划',
              actionLabel: '补齐本章计划',
              actionHint: '缺本章目标、核心冲突',
              missingPlanFields: ['chapterGoal', 'conflict'],
              missingPlanLabels: ['本章目标', '核心冲突'],
              repairIntent: {
                source: 'writing_queue_plan_repair',
                chapter_no: 8,
              },
              goal: '',
              conflict: '',
              endingHook: '阵盘亮起第二道裂纹',
              wordCount: 0,
            },
          ],
        },
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.writingQueueFocus.visible).toBe(true)
    expect(model.writingQueueFocus.status).toBe('needs_plan')
    expect(model.writingQueueFocus.currentChapterNo).toBe(8)
    expect(model.writingQueueFocus.label).toBe('本章计划缺口')
    expect(model.writingQueueFocus.badges).toContain('待补 2')
    expect(model.writingQueueFocus.badges).toContain('待质检 1')
    expect(model.writingQueueFocus.action.area).toBe('planning')
    expect(model.writingQueueFocus.action.key).toBe('update_rolling_plan')
    expect(model.writingQueueFocus.action.label).toBe('补齐队列计划')
    expect(model.writingQueueFocus.action.modelCall).toBe(true)
    expect(model.writingQueueFocus.action.payload?.source).toBe('writing_queue_batch_plan_repair')
    expect(model.mainAction.key).toBe('update_rolling_plan')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'chapter_work')?.detail).toContain('本章计划缺口')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'chapter_work')?.action.key).toBe('update_rolling_plan')
  })

  test('uses writing queue focus to send ready chapters into draft generation', () => {
    const model = buildAutoCreationDirectorModel({
      planning: basePlanning,
      writing: {
        ...baseWriting,
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
        writingQueue: {
          visible: true,
          currentChapterNo: 8,
          readyCount: 3,
          blockedCount: 0,
          draftedCount: 0,
          planRepair: { visible: false, label: '', chapterCount: 0, missingCount: 0, chapterNos: [], intent: null },
          items: [
            {
              id: 8,
              chapterNo: 8,
              title: '试炼前夜',
              sourceLabel: '滚动规划',
              status: 'ready_to_draft',
              statusLabel: '可开写',
              actionLabel: '处理本章开写',
              actionHint: '任务书和场景卡已就绪',
              missingPlanFields: [],
              missingPlanLabels: [],
              repairIntent: null,
              goal: '主角拿到试炼资格',
              conflict: '执事设局阻拦',
              endingHook: '阵盘亮起第二道裂纹',
              wordCount: 0,
            },
          ],
        },
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.writingQueueFocus.status).toBe('ready_to_draft')
    expect(model.writingQueueFocus.label).toBe('本章开写就绪')
    expect(model.writingQueueFocus.badges).toContain('可写 3')
    expect(model.writingQueueFocus.action.key).toBe('confirm_plan_and_write_draft')
    expect(model.writingQueueFocus.action.area).toBe('writing')
    expect(model.mainAction.key).toBe('confirm_plan_and_write_draft')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'chapter_work')?.badges).toContain('可写 3')
  })

  test('builds a rolling script room from current chapter, future route, volume beats and compass', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        futureRoute: [
          {
            chapterNo: 8,
            title: '试炼前夜',
            chapterTask: '主角拿到试炼资格',
            conflict: '执事设局阻拦',
            endingHook: '阵盘亮起第二道裂纹',
            mainlineProgress: '进入外门试炼核心局',
            riskTags: [],
          },
          {
            chapterNo: 9,
            title: '阵盘裂纹',
            chapterTask: '阵盘异常暴露主角潜力',
            conflict: '同门围堵试探底牌',
            endingHook: '内门执事点名关注',
            mainlineProgress: '让宗门高层第一次注意主角',
            riskTags: [],
          },
          {
            chapterNo: 10,
            title: '外门震动',
            chapterTask: '试炼结果引发宗门震动',
            conflict: '旧秩序压制新晋黑马',
            endingHook: '内门招揽提出苛刻条件',
            mainlineProgress: '打开内门势力线',
            riskTags: [],
          },
        ],
      },
      writing: {
        ...baseWriting,
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '压迫升级', goal: '执事逼主角交阵盘' }],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.rollingScriptRoom.status).toBe('ready')
    expect(model.rollingScriptRoom.label).toBe('百章剧本就绪')
    expect(model.rollingScriptRoom.focusRangeLabel).toBe('第8-10章')
    expect(model.rollingScriptRoom.layers.map(layer => layer.key)).toEqual([
      'current_chapter',
      'next_10',
      'future_100',
      'current_volume',
      'book_compass',
    ])
    expect(model.rollingScriptRoom.layers.find(layer => layer.key === 'next_10')?.detail).toContain('未来10章 10/10')
    expect(model.rollingScriptRoom.layers.find(layer => layer.key === 'current_volume')?.detail).toContain('爆点预算 86')
    expect(model.rollingScriptRoom.layers.find(layer => layer.key === 'book_compass')?.detail).toContain('寒门少年以阵法反压宗门秩序')
    expect(model.rollingScriptRoom.nextChapters.map(chapter => chapter.chapterNo)).toEqual([8, 9, 10])
    expect(model.rollingScriptRoom.nextAction.key).toBe('confirm_plan_and_write_draft')
    expect(model.pipeline.find(step => step.key === 'rolling_script_room')?.status).toBe('done')
  })

  test('turns rolling script room gaps into longform repair tasks', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future10Coverage: { ready: false, planned: 4, required: 10, missingChapters: [12, 13], label: '4/10' },
          future100Coverage: { ready: false, planned: 18, required: 100, missingChapters: [30, 31, 32], label: '18/100' },
        },
        volumeBeatBudget: {
          ...basePlanning.volumeBeatBudget,
          status: 'needs_attention',
          label: '爆点预算不足 62',
          score: 62,
          summary: '当前卷小高潮不足。',
          nextActions: ['补齐第20章前的小高潮。'],
        },
      },
      writing: baseWriting,
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.rollingScriptRoom.status).toBe('blocked')
    expect(model.rollingScriptRoom.repairAction.key).toBe('create_script_room_repair')
    expect(model.rollingScriptRoom.repairAction.modelCall).toBe(false)
    expect(model.rollingScriptRoom.repairTasks.map(task => task.issue_type)).toEqual([
      'script_room_layer_gap',
      'script_room_layer_gap',
      'script_room_layer_gap',
    ])
    expect(model.rollingScriptRoom.repairTasks.map(task => task.layer_key)).toEqual([
      'next_10',
      'future_100',
      'current_volume',
    ])
    expect(model.rollingScriptRoom.repairTasks[0]?.action_key).toBe('update_rolling_plan')
    expect(model.rollingScriptRoom.repairTasks[1]?.action_key).toBe('future100_generate')
    expect(model.rollingScriptRoom.repairTasks[2]?.action).toContain('补齐第20章前的小高潮')
    expect(model.rollingScriptRoom.repairTasks[0]?.acceptance_criteria).toContain('剧本室对应层级恢复绿色或人工确认可继续生产')
  })

  test('daily battle plan sends the author to longform fuel before chapter production', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        first30Retention: {
          ...basePlanning.first30Retention,
          status: 'stale',
          score: 62,
          summary: '前30章内容已变化，需重新诊断。',
          actionKey: 'run_first30_retention',
        },
      },
      writing: baseWriting,
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.status).toBe('needs_governance')
    expect(model.dailyBattlePlan.currentStepKey).toBe('fuel_materials')
    expect(model.dailyBattlePlan.summary).toContain('先补长线材料')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'clear_risks')?.status).toBe('done')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'fuel_materials')?.status).toBe('active')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'fuel_materials')?.action.key).toBe('run_first30_retention')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'chapter_work')?.status).toBe('pending')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'batch_release')?.status).toBe('pending')
  })

  test('builds a safe continuous production guardrail when governance and chapter plan are ready', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        futureRoute: [
          {
            chapterNo: 8,
            title: '试炼前夜',
            chapterTask: '主角拿到试炼资格',
            conflict: '执事设局阻拦',
            endingHook: '阵盘亮起第二道裂纹',
            mainlineProgress: '进入外门试炼核心局',
            riskTags: [],
          },
          {
            chapterNo: 9,
            title: '阵盘裂纹',
            chapterTask: '阵盘异常暴露主角潜力',
            conflict: '同门围堵试探底牌',
            endingHook: '内门执事点名关注',
            mainlineProgress: '让宗门高层第一次注意主角',
            riskTags: [],
          },
          {
            chapterNo: 10,
            title: '外门震动',
            chapterTask: '试炼结果引发宗门震动',
            conflict: '旧秩序压制新晋黑马',
            endingHook: '内门招揽提出苛刻条件',
            mainlineProgress: '打开内门势力线',
            riskTags: [],
          },
        ],
      },
      writing: {
        ...baseWriting,
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
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
      runRecords: [
        {
          id: 94,
          run_type: 'longform_production_repair',
          created_at: '2026-06-14T08:00:00Z',
          output_ref: JSON.stringify({
            audit_summary: {
              status: 'closed',
              governance_recheck_memory: {
                status: 'closed',
                label: '治理复查已记录',
                summary: '恢复依据闭环 2/2，剧情线决策无未关闭项；今日生产可沿用上一轮复查证据。',
                evidence: ['第42章对白交锋已补回样章节奏', '章末读者回报已兑现'],
                failed_evidence: [],
                watch_items: ['下一批继续观察样章策略命中率'],
                storyline_decision_task_count: 0,
                source_run_id: 94,
              },
            },
          }),
        },
      ],
      storyState: {
        last_updated_chapter: 7,
        global: {
          core_promise: '李超用超人蛮力碰撞规则怪谈，张智负责拆解规则。',
          current_volume_goal: '午夜校园中活过第一轮规则。',
          open_questions: ['广播是谁发出的', '湿漉漉学生为什么敲门'],
          payoff_queue: ['规则边界反制蛮力'],
        },
        characters: [
          { name: '李超', status: '力量觉醒但不懂规则', location: '宿舍楼大厅' },
          { name: '张智', status: '负责推理规则', location: '宿舍楼大厅' },
        ],
      },
    })

    expect(model.batchGuardrail.status).toBe('ready')
    expect(model.batchGuardrail.safeChapterCount).toBe(3)
    expect(model.batchGuardrail.summary).toContain('小批量')
    expect(model.batchGuardrail.recommendedAction.area).toBe('ops')
    expect(model.batchGuardrail.recommendedAction.key).toBe('start_safe_batch_generation')
    expect(model.batchGuardrail.recommendedAction.label).toBe('开始安全连写')
    expect(model.batchGuardrail.recommendedAction.modelCall).toBe(true)
    expect(model.batchGuardrail.guardrails.map(item => item.label)).toContain('章节任务书/场景卡')
    expect(model.batchGuardrail.guardrails.map(item => item.label)).toContain('未来10章规划')
    expect(model.batchGuardrail.guardrails.find(item => item.label === '批次任务书')?.status).toBe('ok')
    expect(model.batchGuardrail.guardrails.map(item => item.label)).toContain('每章交稿回填')
    expect(model.batchGuardrail.nextBatchBrief.visible).toBe(true)
    expect(model.batchGuardrail.nextBatchBrief.chapterRangeLabel).toBe('第8-10章')
    expect(model.batchGuardrail.nextBatchBrief.batchGoal).toContain('进入内门视野')
    expect(model.batchGuardrail.nextBatchBrief.readerPayoffPlan).toContain('升级+打脸')
    expect(model.batchGuardrail.nextBatchBrief.chapters.map(item => item.chapterNo)).toEqual([8, 9, 10])
    expect(model.batchGuardrail.nextBatchBrief.chapters[2]?.endingHook).toBe('内门招揽提出苛刻条件')
    expect(model.batchGuardrail.nextBatchBrief.startChecklist.map(item => item.key)).toEqual([
      'core_promise',
      'story_drive',
      'reader_payoff',
      'innovation',
      'forbidden_boundary',
    ])
    expect(model.batchGuardrail.nextBatchBrief.startChecklist.every(item => item.status === 'ok')).toBe(true)
    expect(model.batchGuardrail.nextBatchBrief.startChecklist.find(item => item.key === 'core_promise')?.detail).toContain('寒门少年以阵法反压宗门秩序')
    expect(model.batchGuardrail.nextBatchBrief.startChecklist.find(item => item.key === 'reader_payoff')?.detail).toContain('升级+打脸')
    expect(model.batchGuardrail.nextBatchBrief.startChecklist.find(item => item.key === 'forbidden_boundary')?.detail).toContain('不得跳过单章质检')
    expect(model.batchGuardrail.preflight.visible).toBe(true)
    expect(model.batchGuardrail.preflight.status).toBe('ready')
    expect(model.batchGuardrail.preflight.title).toBe('安全连写预执行确认')
    expect(model.batchGuardrail.preflight.allowedChapterNos).toEqual([8, 9, 10])
    expect(model.batchGuardrail.preflight.blockedChapterNos).toEqual([])
    expect(model.batchGuardrail.preflight.modelPipeline).toEqual([
      '章节任务书',
      '正文初稿',
      '字数门禁',
      '商业主编改稿',
      '自检修订',
      '故事状态/剧情线回填',
    ])
    expect(model.batchGuardrail.preflight.inputSnapshot).toMatchObject({
      source: 'auto_creation_safe_batch_preflight',
      safe_chapter_count: 3,
      allowed_chapter_nos: [8, 9, 10],
      blocked_chapter_nos: [],
      chapter_range_label: '第8-10章',
      storyline_decision_closure: {
        status: 'ok',
        label: '剧情线决策已闭环',
        open_count: 0,
      },
    })
    expect(model.batchGuardrail.recommendedAction.payload?.batch_preflight?.storyline_decision_closure).toMatchObject({
      status: 'ok',
      label: '剧情线决策已闭环',
    })
    expect(model.batchGuardrail.preflight.inputSnapshot.longform_memory_anchor).toMatchObject({
      last_updated_chapter: 7,
      core_promise: expect.stringContaining('李超用超人蛮力'),
      current_volume_goal: expect.stringContaining('午夜校园'),
    })
    expect(model.batchGuardrail.preflight.inputSnapshot.longform_memory_anchor.character_states.join('｜')).toContain('李超')
    expect(model.batchGuardrail.preflight.inputSnapshot.longform_memory_anchor.open_questions).toContain('广播是谁发出的')
    expect(model.batchGuardrail.preflight.inputSnapshot.longform_memory_anchor.payoff_debts).toContain('规则边界反制蛮力')
    expect(model.batchGuardrail.preflight.inputSnapshot.governance_recheck_memory).toMatchObject({
      status: 'closed',
      summary: expect.stringContaining('恢复依据闭环 2/2'),
      evidence: expect.arrayContaining(['第42章对白交锋已补回样章节奏']),
      watch_items: expect.arrayContaining(['下一批继续观察样章策略命中率']),
    })
    expect(model.batchGuardrail.recommendedAction.payload?.batch_preflight?.governance_recheck_memory).toMatchObject({
      source_run_id: 94,
      status: 'closed',
    })
    expect(model.batchGuardrail.briefRepair.visible).toBe(false)
    expect(model.batchGuardrail.briefRecovery.visible).toBe(true)
    expect(model.batchGuardrail.briefRecovery.title).toBe('已恢复多章安全连写')
    expect(model.batchGuardrail.briefRecovery.restoredChapterCount).toBe(3)
    expect(model.batchGuardrail.briefRecovery.summary).toContain('第8-10章')
    expect(model.batchGuardrail.briefRecovery.evidence).toContain('批次任务书完整')
    expect(model.batchGuardrail.briefRecovery.action.key).toBe('start_safe_batch_generation')
    expect(model.pipeline.find(step => step.key === 'batch_guardrail')?.status).toBe('active')
    expect(model.productionLicense.status).toBe('batch_allowed')
    expect(model.productionLicense.modeLabel).toBe('小批量连写')
    expect(model.productionLicense.summary).toContain('安全连写')
    expect(model.productionLicense.safeChapterCount).toBe(3)
    expect(model.productionLicense.nextAction.key).toBe('start_safe_batch_generation')
  })

  test('downgrades safe batching when the next batch still selects risky style samples', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        futureRoute: [
          {
            chapterNo: 8,
            title: '试炼前夜',
            chapterTask: '主角拿到试炼资格',
            conflict: '执事设局阻拦',
            endingHook: '阵盘亮起第二道裂纹',
            mainlineProgress: '进入外门试炼核心局',
          },
          {
            chapterNo: 9,
            title: '阵盘裂纹',
            chapterTask: '阵盘异常暴露主角潜力',
            conflict: '同门围堵试探底牌',
            endingHook: '内门执事点名关注',
            mainlineProgress: '让宗门高层第一次注意主角',
            style_sample_strategy: {
              samples: [
                { sample_key: '旧高压反打样章', selection_reason: '历史低命中但仍被任务书选中。' },
              ],
            },
          },
          {
            chapterNo: 10,
            title: '外门震动',
            chapterTask: '试炼结果引发宗门震动',
            conflict: '旧秩序压制新晋黑马',
            endingHook: '内门招揽提出苛刻条件',
            mainlineProgress: '打开内门势力线',
            style_sample_strategy: {
              samples: [
                { sample_key: '稳定规则反打样章', selection_reason: '表现稳定。' },
              ],
            },
          },
        ],
      },
      writing: {
        ...baseWriting,
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
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
      styleSampleEffectiveness: {
        samples: [
          {
            sample_key: '旧高压反打样章',
            usage_count: 5,
            hit_rate: 40,
            missed_count: 6,
            copy_risk_count: 1,
            risk_label: '需复盘',
          },
          {
            sample_key: '稳定规则反打样章',
            usage_count: 6,
            hit_rate: 100,
            missed_count: 0,
            copy_risk_count: 0,
            risk_label: '表现稳定',
          },
        ],
      },
    } as any)

    const styleSignal = model.batchGuardrail.guardrails.find(item => item.label === '风格样章预检')
    expect(model.batchGuardrail.status).toBe('caution')
    expect(model.batchGuardrail.safeChapterCount).toBe(1)
    expect(styleSignal?.status).toBe('warn')
    expect(styleSignal?.detail).toContain('旧高压反打样章')
    expect(styleSignal?.detail).toContain('第9章')
    expect(model.batchGuardrail.recommendedAction.key).toBe('create_style_sample_batch_repair')
    expect(model.batchGuardrail.recommendedAction.label).toBe('生成样章任务书修复')
    expect(model.batchGuardrail.preflight.status).toBe('caution')
    expect(model.batchGuardrail.preflight.allowedChapterNos).toEqual([8])
    expect(model.batchGuardrail.preflight.warnings.join('；')).toContain('风格样章预检')
    expect(model.batchGuardrail.preflight.inputSnapshot.style_sample_batch_preflight).toMatchObject({
      status: 'warn',
      risky_sample_keys: ['旧高压反打样章'],
      affected_chapter_nos: [9],
      recommended_repair_action: {
        action: 'replace',
        label: '换样章并重审任务书',
        requires_task_book_reconfirm: true,
      },
    })
    expect(model.batchGuardrail.recommendedAction.payload?.repair_tasks?.[0]).toMatchObject({
      issue_type: 'style_sample_task_book_rebuild',
      chapter_no: 9,
      sample_key: '旧高压反打样章',
      action: '换样章并重审任务书',
    })
  })

  test('closes style sample task-book repairs only after the next batch avoids risky samples', () => {
    const repairItems = [
      {
        run: { id: 91 },
        taskIndex: 0,
        task: {
          issue_type: 'style_sample_task_book_rebuild',
          task_status: 'needs_review',
          chapter_no: 9,
          sample_key: '旧高压反打样章',
        },
      },
      {
        run: { id: 91 },
        taskIndex: 1,
        task: {
          issue_type: 'style_sample_task_book_rebuild',
          task_status: 'needs_review',
          chapter_no: 10,
          sample_key: '旧对白交锋样章',
        },
      },
    ]

    const partialPlan = buildStyleSampleTaskBookRecheckPlan({
      items: repairItems,
      styleSampleBatchPreflight: {
        status: 'warn',
        risk_count: 1,
        selected_samples: [
          { chapter_no: 9, sample_key: '旧高压反打样章' },
        ],
        affected_chapter_nos: [9],
      },
    })

    expect(partialPlan.status).toBe('partial')
    expect(partialPlan.resolvedItems.map((item: any) => item.taskIndex)).toEqual([1])
    expect(partialPlan.blockedItems.map((item: any) => item.taskIndex)).toEqual([0])
    expect(partialPlan.summary).toContain('通过 1')
    expect(partialPlan.summary).toContain('仍需重审 1')

    const cleanPlan = buildStyleSampleTaskBookRecheckPlan({
      items: repairItems,
      styleSampleBatchPreflight: {
        status: 'ok',
        risk_count: 0,
        selected_samples: [],
        affected_chapter_nos: [],
      },
    })

    expect(cleanPlan.status).toBe('all_clear')
    expect(cleanPlan.resolvedItems.map((item: any) => item.taskIndex)).toEqual([0, 1])
    expect(cleanPlan.blockedItems).toHaveLength(0)
    expect(cleanPlan.summary).toContain('通过 2')
  })

  test('blocks safe batching while storyline decision tasks are still open', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        futureRoute: [
          {
            chapterNo: 8,
            title: '试炼前夜',
            chapterTask: '主角拿到试炼资格',
            conflict: '执事设局阻拦',
            endingHook: '阵盘亮起第二道裂纹',
            mainlineProgress: '进入外门试炼核心局',
            riskTags: [],
          },
          {
            chapterNo: 9,
            title: '阵盘裂纹',
            chapterTask: '阵盘异常暴露主角潜力',
            conflict: '同门围堵试探底牌',
            endingHook: '内门执事点名关注',
            mainlineProgress: '让宗门高层第一次注意主角',
            riskTags: [],
          },
          {
            chapterNo: 10,
            title: '外门震动',
            chapterTask: '试炼结果引发宗门震动',
            conflict: '旧秩序压制新晋黑马',
            endingHook: '内门招揽提出苛刻条件',
            mainlineProgress: '打开内门势力线',
            riskTags: [],
          },
        ],
      },
      writing: {
        ...baseWriting,
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
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
      storyState: {
        last_updated_chapter: 7,
        global: {
          core_promise: '李超用超人蛮力碰撞规则怪谈，张智负责拆解规则。',
          current_volume_goal: '午夜校园中活过第一轮规则。',
        },
      },
      runRecords: [
        {
          id: 730,
          run_type: 'longform_production_repair',
          created_at: '2026-06-04T02:00:00.000Z',
          status: 'ready',
          output_ref: JSON.stringify({
            source: 'storyline_diff_decision',
            tasks: [
              {
                source: 'storyline_diff_decision',
                task_type: 'repair_quality',
                issue_type: 'storyline_diff_revise_prose',
                task_status: 'needs_review',
                chapter_no: 8,
                title: '第8章剧情线漏推需要回修正文',
              },
            ],
          }),
        },
      ],
    } as any)

    expect(model.batchGuardrail.status).toBe('ready')
    expect(model.productionLicense.status).toBe('blocked')
    expect(model.productionLicense.summary).toContain('剧情线决策')
    expect(model.productionLicense.nextAction.key).toBe('review_governance_closure')
    expect(model.productionLicense.nextAction.payload?.storylineDecisionTaskCount).toBe(1)
    expect(model.todayCommandDeck.releaseRationale.limits).toContain('剧情线决策未闭环')
    expect(model.todayCommandDeck.qualityGates.find(item => item.key === 'serial_safety')?.detail).toContain('剧情线决策')
  })

  test('injects staged delivery-risk obligations into safe batch preflight and action payload', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        futureRoute: [
          {
            chapterNo: 8,
            title: '试炼前夜',
            chapterTask: '主角拿到试炼资格',
            conflict: '执事设局阻拦',
            endingHook: '阵盘亮起第二道裂纹',
            mainlineProgress: '进入外门试炼核心局',
          },
          {
            chapterNo: 9,
            title: '阵盘裂纹',
            chapterTask: '阵盘异常暴露主角潜力',
            conflict: '同门围堵试探底牌',
            endingHook: '内门执事点名关注',
            mainlineProgress: '让宗门高层第一次注意主角',
          },
          {
            chapterNo: 10,
            title: '外门震动',
            chapterTask: '试炼结果引发宗门震动',
            conflict: '旧秩序压制新晋黑马',
            endingHook: '内门招揽提出苛刻条件',
            mainlineProgress: '打开内门势力线',
          },
        ],
      },
      writing: {
        ...baseWriting,
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [
            { title: '压迫升级', goal: '执事逼主角交阵盘' },
            { title: '反向设局', goal: '主角用阵法拿回主动权' },
          ],
          episodePlan: {
            deliveryRiskCarryOver: {
              sourceChapterNo: 7,
              totalCount: 3,
              label: '待修复 3',
              priorityLabel: '优先修章末翻页',
              items: ['修吸引力：吸引力缺口 2', '补创新：创新缺口 1'],
              requiredActions: ['前300字接住门外学生压迫', '中段补规则反制创新', '章末重做翻页问题'],
              openingActions: ['开篇先补异常压迫'],
              middleActions: ['中段补规则反制创新'],
              endingActions: ['章末重做翻页问题'],
            },
          },
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.batchGuardrail.status).toBe('ready')
    expect(model.batchGuardrail.preflight.inputSnapshot.delivery_risk_carry_over).toMatchObject({
      source: 'chapter_delivery_risk_carry_over',
      source_chapter_no: 7,
      apply_to_chapter_no: 8,
      label: '待修复 3',
      priority_label: '优先修章末翻页',
      items: ['修吸引力：吸引力缺口 2', '补创新：创新缺口 1'],
      required_actions: ['前300字接住门外学生压迫', '中段补规则反制创新', '章末重做翻页问题'],
      opening_actions: ['开篇先补异常压迫', '前300字接住门外学生压迫'],
      middle_actions: ['中段补规则反制创新'],
      ending_actions: ['章末重做翻页问题', '优先修章末翻页'],
    })
    expect(model.batchGuardrail.recommendedAction.payload?.batch_preflight?.delivery_risk_carry_over?.opening_actions).toContain('开篇先补异常压迫')
    expect(model.batchGuardrail.recommendedAction.payload?.next_batch_brief?.chapterRangeLabel).toBe('第8-10章')
    expect(model.productionLicense.nextAction.payload?.batch_preflight?.delivery_risk_carry_over?.ending_actions).toContain('章末重做翻页问题')
  })

  test('injects chapter handoff contract into safe batch preflight and action payload', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        futureRoute: [
          {
            chapterNo: 8,
            title: '试炼前夜',
            chapterTask: '主角拿到试炼资格',
            conflict: '执事设局阻拦',
            endingHook: '阵盘亮起第二道裂纹',
            mainlineProgress: '进入外门试炼核心局',
          },
          {
            chapterNo: 9,
            title: '阵盘裂纹',
            chapterTask: '阵盘异常暴露主角潜力',
            conflict: '同门围堵试探底牌',
            endingHook: '内门执事点名关注',
            mainlineProgress: '让宗门高层第一次注意主角',
          },
          {
            chapterNo: 10,
            title: '外门震动',
            chapterTask: '试炼结果引发宗门震动',
            conflict: '旧秩序压制新晋黑马',
            endingHook: '内门招揽提出苛刻条件',
            mainlineProgress: '打开内门势力线',
          },
        ],
      },
      writing: {
        ...baseWriting,
        nextChapter: {
          ...baseWriting.nextChapter,
          rawPayload: {
            pre_draft_brief: {
              previous_handoff: '第7章《执事加码》最后一幕：阵盘亮起第二道裂纹，执事当场改口要主角交出阵盘。',
              reader_expectation_debt: {
                must_carry: [
                  { key: 'crack_pressure', text: '阵盘第二道裂纹必须在开篇造成可见压力' },
                ],
                keep_alive: [
                  { key: 'who_changed_rule', text: '是谁在背后改试炼规则' },
                ],
                overdue: [
                  { key: 'elder_hint', text: '内门长老为何提前关注主角' },
                ],
              },
              reader_expectation_ledger: {
                must_deliver: [
                  { key: 'fight_back', text: '主角必须用阵法反制执事试探' },
                ],
              },
            },
          },
        },
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [
            { title: '裂纹压迫', goal: '阵盘裂纹引发执事逼迫' },
            { title: '反向设局', goal: '主角用阵法拿回主动权' },
          ],
          episodePlan: {
            previousHandoff: '第7章《执事加码》最后一幕：阵盘亮起第二道裂纹，执事当场改口要主角交出阵盘。',
          },
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.batchGuardrail.status).toBe('ready')
    const preflightContract = JSON.parse(JSON.stringify(model.batchGuardrail.preflight.inputSnapshot.chapter_handoff_contract || {}))
    const actionContract = JSON.parse(JSON.stringify(model.batchGuardrail.recommendedAction.payload?.batch_preflight?.chapter_handoff_contract || {}))
    const licenseContract = JSON.parse(JSON.stringify(model.productionLicense.nextAction.payload?.batch_preflight?.chapter_handoff_contract || {}))
    expect(preflightContract).toMatchObject({
      source: 'safe_batch_chapter_handoff_contract',
      from_chapter_no: 7,
      apply_to_chapter_no: 8,
      previous_handoff: expect.stringContaining('阵盘亮起第二道裂纹'),
      opening_obligations: expect.arrayContaining(['阵盘第二道裂纹必须在开篇造成可见压力']),
      keep_alive: expect.arrayContaining(['是谁在背后改试炼规则']),
      overdue: expect.arrayContaining(['内门长老为何提前关注主角']),
      must_deliver: expect.arrayContaining(['主角必须用阵法反制执事试探']),
    })
    expect(actionContract).toMatchObject({
      previous_handoff: expect.stringContaining('执事当场改口'),
    })
    expect(licenseContract).toMatchObject({
      opening_obligations: expect.arrayContaining(['阵盘第二道裂纹必须在开篇造成可见压力']),
    })
  })

  test('limits safe batching to consecutive ready writing queue chapters', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        futureRoute: [
          {
            chapterNo: 8,
            title: '试炼前夜',
            chapterTask: '主角拿到试炼资格',
            conflict: '执事设局阻拦',
            endingHook: '阵盘亮起第二道裂纹',
            mainlineProgress: '进入外门试炼核心局',
          },
          {
            chapterNo: 9,
            title: '阵盘裂纹',
            chapterTask: '阵盘异常暴露主角潜力',
            conflict: '同门围堵试探底牌',
            endingHook: '内门执事点名关注',
            mainlineProgress: '让宗门高层第一次注意主角',
          },
          {
            chapterNo: 10,
            title: '外门震动',
            chapterTask: '试炼结果引发宗门震动',
            conflict: '旧秩序压制新晋黑马',
            endingHook: '内门招揽提出苛刻条件',
            mainlineProgress: '打开内门势力线',
          },
        ],
      },
      writing: {
        ...baseWriting,
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '压迫升级', goal: '执事逼主角交阵盘' }],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
        writingQueue: {
          visible: true,
          currentChapterNo: 8,
          readyCount: 2,
          blockedCount: 1,
          draftedCount: 0,
          planRepair: {
            visible: true,
            label: '补齐队列计划',
            chapterCount: 1,
            missingCount: 2,
            chapterNos: [9],
            intent: { source: 'writing_queue_batch_plan_repair', chapter_nos: [9] },
          },
          items: [
            { id: 8, chapterNo: 8, title: '试炼前夜', sourceLabel: '滚动规划', status: 'ready_to_draft', statusLabel: '可开写', actionLabel: '开写', actionHint: '', missingPlanFields: [], missingPlanLabels: [], repairIntent: null, goal: '拿到资格', conflict: '执事阻拦', endingHook: '阵盘裂纹', wordCount: 0 },
            { id: 9, chapterNo: 9, title: '阵盘裂纹', sourceLabel: '滚动规划', status: 'needs_plan', statusLabel: '缺计划', actionLabel: '补计划', actionHint: '', missingPlanFields: ['conflict'], missingPlanLabels: ['核心冲突'], repairIntent: { source: 'writing_queue_plan_repair', chapter_no: 9 }, goal: '阵盘异常', conflict: '', endingHook: '内门关注', wordCount: 0 },
            { id: 10, chapterNo: 10, title: '外门震动', sourceLabel: '滚动规划', status: 'ready_to_draft', statusLabel: '可开写', actionLabel: '开写', actionHint: '', missingPlanFields: [], missingPlanLabels: [], repairIntent: null, goal: '宗门震动', conflict: '旧秩序压制', endingHook: '苛刻条件', wordCount: 0 },
          ],
        },
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.batchGuardrail.status).toBe('caution')
    expect(model.batchGuardrail.safeChapterCount).toBe(1)
    expect(model.batchGuardrail.guardrails.find(item => item.label === '写作队列放行')?.status).toBe('warn')
    expect(model.batchGuardrail.guardrails.find(item => item.label === '写作队列放行')?.detail).toContain('连续可写 1 章')
    expect(model.batchGuardrail.releaseWindow.allowedChapters.map(chapter => chapter.chapterNo)).toEqual([8])
    expect(model.batchGuardrail.releaseWindow.blockedChapters.map(chapter => chapter.chapterNo)).toEqual([9])
    expect(model.batchGuardrail.releaseWindow.blockedChapters[0]?.reason).toContain('缺计划')
    expect(model.batchGuardrail.releaseWindow.summary).toContain('第8章')
    expect(model.batchGuardrail.releaseWindow.summary).toContain('第9章')
    expect(model.batchGuardrail.preflight.visible).toBe(true)
    expect(model.batchGuardrail.preflight.status).toBe('caution')
    expect(model.batchGuardrail.preflight.allowedChapterNos).toEqual([8])
    expect(model.batchGuardrail.preflight.blockedChapterNos).toEqual([9])
    expect(model.batchGuardrail.preflight.warnings.join('；')).toContain('第9章')
    expect(model.batchGuardrail.preflight.inputSnapshot).toMatchObject({
      source: 'auto_creation_safe_batch_preflight',
      safe_chapter_count: 1,
      allowed_chapter_nos: [8],
      blocked_chapter_nos: [9],
      chapter_range_label: '第8章',
    })
    expect(model.batchGuardrail.nextBatchBrief.chapterRangeLabel).toBe('第8章')
    expect(model.batchGuardrail.recommendedAction.key).toBe('update_rolling_plan')
    expect(model.batchGuardrail.recommendedAction.payload?.source).toBe('writing_queue_batch_plan_repair')
  })

  test('downgrades safe batching when serial release inventory is below the buffer line', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        serialReleaseDesk: {
          status: 'needs_buffer',
          score: 60,
          label: '存稿不足',
          summary: '当前可发布 1 章，约 0 天，低于 3 天安全线。',
          dailyTargetChapters: 2,
          minBufferDays: 3,
          lastPublishedChapter: 7,
          publishableChapters: 1,
          bufferDays: 0,
          primaryAction: {
            key: 'enter_chapter_writing',
            label: '补存稿',
            reason: '当前可发布 1 章，约 0 天，低于最低 3 天存稿。',
          },
          pipeline: [],
          releaseWindow: [
            { chapterNo: 8, title: '试炼前夜', wordCount: 3100, status: 'publishable', riskTags: [] },
            { chapterNo: 9, title: '阵盘裂纹', wordCount: 0, status: 'drafting', riskTags: [] },
          ],
          riskChapters: [],
          nextActions: ['至少再完成 5 章，恢复 3 天安全垫。'],
        },
        futureRoute: [
          { chapterNo: 8, title: '试炼前夜', chapterTask: '主角拿到试炼资格', conflict: '执事设局阻拦', endingHook: '阵盘亮起第二道裂纹', mainlineProgress: '主角从被动挨压转为主动入局' },
          { chapterNo: 9, title: '阵盘裂纹', chapterTask: '阵盘异常暴露主角潜力', conflict: '同门围堵试探底牌', endingHook: '内门执事点名关注', mainlineProgress: '宗门高层第一次注意主角' },
          { chapterNo: 10, title: '外门震动', chapterTask: '试炼结果引发宗门震动', conflict: '旧秩序压制新晋黑马', endingHook: '内门招揽提出苛刻条件', mainlineProgress: '打开内门势力线' },
        ],
      },
      writing: {
        ...baseWriting,
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '资格争夺', goal: '主角拿到试炼资格' }],
          reasons: [],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.batchGuardrail.status).toBe('caution')
    expect(model.batchGuardrail.safeChapterCount).toBe(1)
    expect(model.batchGuardrail.guardrails.find(item => item.label === '连载库存')?.status).toBe('warn')
    expect(model.batchGuardrail.guardrails.find(item => item.label === '连载库存')?.detail).toContain('低于 3 天安全线')
    expect(model.productionLicense.status).toBe('single_chapter')
    expect(model.productionLicense.modeLabel).toBe('单章生产')
    expect(model.todayCommandDeck.qualityGates.find(item => item.key === 'serial_safety')?.status).toBe('warn')
    expect(model.todayCommandDeck.qualityGates.find(item => item.key === 'serial_safety')?.detail).toContain('低于 3 天安全线')
  })

  test('blocks safe batching when the serial release window contains chapters needing revision', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        serialReleaseDesk: {
          status: 'blocked',
          score: 48,
          label: '发布阻塞',
          summary: '发布窗口有 1 章存在风险，暂不建议直接发布。',
          dailyTargetChapters: 2,
          minBufferDays: 3,
          lastPublishedChapter: 7,
          publishableChapters: 2,
          bufferDays: 1,
          primaryAction: {
            key: 'open_quality_revision',
            label: '修复发布窗口',
            reason: '发布窗口内第 8 章存在质检风险，先修订再发。',
          },
          pipeline: [],
          releaseWindow: [
            { chapterNo: 8, title: '试炼前夜', wordCount: 3100, status: 'needs_revision', riskTags: ['读者拉力不足'] },
            { chapterNo: 9, title: '阵盘裂纹', wordCount: 3200, status: 'publishable', riskTags: [] },
          ],
          riskChapters: [
            { chapterNo: 8, title: '试炼前夜', riskTags: ['读者拉力不足'] },
          ],
          nextActions: ['先处理发布窗口内的质检风险，再恢复发稿节奏。'],
        },
        futureRoute: [
          { chapterNo: 8, title: '试炼前夜', chapterTask: '主角拿到试炼资格', conflict: '执事设局阻拦', endingHook: '阵盘亮起第二道裂纹', mainlineProgress: '主角从被动挨压转为主动入局' },
          { chapterNo: 9, title: '阵盘裂纹', chapterTask: '阵盘异常暴露主角潜力', conflict: '同门围堵试探底牌', endingHook: '内门执事点名关注', mainlineProgress: '宗门高层第一次注意主角' },
          { chapterNo: 10, title: '外门震动', chapterTask: '试炼结果引发宗门震动', conflict: '旧秩序压制新晋黑马', endingHook: '内门招揽提出苛刻条件', mainlineProgress: '打开内门势力线' },
        ],
      },
      writing: {
        ...baseWriting,
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '资格争夺', goal: '主角拿到试炼资格' }],
          reasons: [],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.batchGuardrail.status).toBe('blocked')
    expect(model.batchGuardrail.safeChapterCount).toBe(0)
    expect(model.batchGuardrail.guardrails.find(item => item.label === '连载库存')?.status).toBe('block')
    expect(model.batchGuardrail.guardrails.find(item => item.label === '连载库存')?.detail).toContain('发布窗口有 1 章存在风险')
    expect(model.batchGuardrail.recommendedAction.key).toBe('open_quality_revision')
    expect(model.productionLicense.status).toBe('blocked')
    expect(model.productionLicense.nextAction.key).toBe('open_quality_revision')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'batch_release')?.status).toBe('blocked')
  })

  test('downgrades safe batching when the next batch brief is too vague for multi-chapter production', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        futureRoute: [
          { chapterNo: 8, title: '试炼前夜' },
          { chapterNo: 9, title: '阵盘裂纹' },
          { chapterNo: 10, title: '外门震动' },
        ],
      },
      writing: {
        ...baseWriting,
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
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.batchGuardrail.status).toBe('caution')
    expect(model.batchGuardrail.safeChapterCount).toBe(1)
    expect(model.batchGuardrail.recommendedAction.key).toBe('update_rolling_plan')
    expect(model.batchGuardrail.recommendedAction.label).toBe('补齐批次任务书')
    expect(model.batchGuardrail.recommendedAction.modelCall).toBe(true)
    expect(model.batchGuardrail.guardrails.find(item => item.label === '批次任务书')?.status).toBe('warn')
    expect(model.batchGuardrail.guardrails.find(item => item.label === '批次任务书')?.detail).toContain('逐章职责')
    expect(model.batchGuardrail.nextBatchBrief.chapterRangeLabel).toBe('第8章')
    expect(model.batchGuardrail.nextBatchBrief.chapters.map(item => item.chapterNo)).toEqual([8])
    expect(model.batchGuardrail.summary).toContain('下一批任务书')
    expect(model.batchGuardrail.briefRepair.visible).toBe(true)
    expect(model.batchGuardrail.briefRepair.status).toBe('warn')
    expect(model.batchGuardrail.briefRepair.title).toBe('补齐下一批任务书')
    expect(model.batchGuardrail.briefRepair.action.label).toBe('补齐批次任务书')
    expect(model.batchGuardrail.briefRepair.action.payload?.source).toBe('batch_brief_repair')
    expect(model.batchGuardrail.briefRepair.action.payload?.missing_items).toContain('缺逐章职责：第9章、第10章')
    expect(model.batchGuardrail.briefRepair.action.payload?.next_batch_brief?.chapterRangeLabel).toBe('第8-10章')
    expect(model.batchGuardrail.briefRepair.missingItems).toEqual([
      '缺逐章职责：第9章、第10章',
      '缺冲突落点：第9章、第10章',
      '缺章末钩子：第9章、第10章',
      '缺主线推进：第9章、第10章',
    ])
    expect(model.batchGuardrail.briefRecovery.visible).toBe(false)
  })

  test('downgrades safe batching when recent 10 chapters show fatigue risk', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        futureRoute: [
          {
            chapterNo: 8,
            title: '试炼前夜',
            chapterTask: '主角拿到试炼资格',
            conflict: '执事设局阻拦',
            endingHook: '阵盘亮起第二道裂纹',
            mainlineProgress: '进入外门试炼核心局',
            riskTags: [],
          },
          {
            chapterNo: 9,
            title: '阵盘裂纹',
            chapterTask: '阵盘异常暴露主角潜力',
            conflict: '同门围堵试探底牌',
            endingHook: '内门执事点名关注',
            mainlineProgress: '让宗门高层第一次注意主角',
            riskTags: [],
          },
          {
            chapterNo: 10,
            title: '外门震动',
            chapterTask: '试炼结果引发宗门震动',
            conflict: '旧秩序压制新晋黑马',
            endingHook: '内门招揽提出苛刻条件',
            mainlineProgress: '打开内门势力线',
            riskTags: [],
          },
        ],
        recentFatigueRadar: {
          ...basePlanning.recentFatigueRadar,
          status: 'needs_attention',
          score: 61,
          label: '疲劳风险 61',
          summary: '近10章存在 3 类同质化风险：冲突变化、回报变化、钩子变化。',
          actionKey: 'update_rolling_plan',
          signals: [
            { key: 'conflict_variety', label: '冲突变化', status: 'warn', score: 58, count: 7, detail: '近10章「执事压迫」出现 7 次，冲突来源变化不足。', actionKey: 'update_rolling_plan' },
            { key: 'payoff_variety', label: '回报变化', status: 'warn', score: 64, count: 6, detail: '近10章「打脸」出现 6 次，回报形态变化不足。', actionKey: 'update_rolling_plan' },
            { key: 'hook_variety', label: '钩子变化', status: 'warn', score: 62, count: 6, detail: '近10章「试炼将至」出现 6 次，章末问题变化不足。', actionKey: 'update_rolling_plan' },
            { key: 'scene_freshness', label: '场面新鲜度', status: 'ok', score: 82, count: 0, detail: '场面有轮换。', actionKey: 'enter_chapter_writing' },
          ],
          nextActions: ['下一批章节要更换压迫来源、回报形态、章末问题或可视化场面，避免十章连续同质化。'],
        },
      },
      writing: {
        ...baseWriting,
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
        },
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.batchGuardrail.status).toBe('caution')
    expect(model.batchGuardrail.safeChapterCount).toBe(1)
    expect(model.batchGuardrail.recommendedAction.key).toBe('update_rolling_plan')
    expect(model.batchGuardrail.guardrails.find(item => item.label === '近10章疲劳')?.status).toBe('warn')
    expect(model.batchGuardrail.guardrails.find(item => item.label === '近10章疲劳')?.detail).toContain('同质化')
    expect(model.batchGuardrail.summary).toContain('近10章疲劳')
    expect(model.pipeline.find(step => step.key === 'batch_guardrail')?.status).toBe('warning')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'batch_release')?.status).toBe('pending')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'batch_release')?.badges).toContain('安全 1章')
  })

  test('surfaces IP scene coverage gaps in safe batching fatigue guardrail', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        futureRoute: [
          {
            chapterNo: 8,
            title: '试炼前夜',
            chapterTask: '主角拿到试炼资格',
            conflict: '执事设局阻拦',
            endingHook: '阵盘亮起第二道裂纹',
            mainlineProgress: '进入外门试炼核心局',
            riskTags: [],
          },
          {
            chapterNo: 9,
            title: '阵盘裂纹',
            chapterTask: '阵盘异常暴露主角潜力',
            conflict: '同门围堵试探底牌',
            endingHook: '内门执事点名关注',
            mainlineProgress: '让宗门高层第一次注意主角',
            riskTags: [],
          },
          {
            chapterNo: 10,
            title: '外门震动',
            chapterTask: '试炼结果引发宗门震动',
            conflict: '旧秩序压制新晋黑马',
            endingHook: '内门招揽提出苛刻条件',
            mainlineProgress: '打开内门势力线',
            riskTags: [],
          },
        ],
        recentFatigueRadar: {
          ...basePlanning.recentFatigueRadar,
          status: 'needs_attention',
          score: 70,
          label: '疲劳风险 70',
          summary: '近10章存在 1 类同质化风险：场面新鲜度。',
          actionKey: 'update_rolling_plan',
          signals: [
            { key: 'conflict_variety', label: '冲突变化', status: 'ok', score: 86, count: 0, detail: '冲突来源轮换正常。', actionKey: 'enter_chapter_writing' },
            { key: 'payoff_variety', label: '回报变化', status: 'ok', score: 84, count: 0, detail: '回报形态轮换正常。', actionKey: 'enter_chapter_writing' },
            { key: 'hook_variety', label: '钩子变化', status: 'ok', score: 83, count: 0, detail: '章末问题轮换正常。', actionKey: 'enter_chapter_writing' },
            {
              key: 'scene_freshness',
              label: '场面新鲜度',
              status: 'warn',
              score: 60,
              count: 9,
              detail: 'IP场面覆盖 1/10，强场面空窗偏长。已沉淀：玻璃门内外对峙',
              actionKey: 'update_rolling_plan',
            },
          ],
          nextActions: ['下一批章节要补标志性场面。'],
        },
      },
      writing: {
        ...baseWriting,
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
        },
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    const fatigueGuardrail = model.batchGuardrail.guardrails.find(item => item.label === '近10章疲劳')

    expect(model.batchGuardrail.status).toBe('caution')
    expect(model.batchGuardrail.safeChapterCount).toBe(1)
    expect(model.batchGuardrail.recommendedAction.key).toBe('update_rolling_plan')
    expect(model.batchGuardrail.recommendedAction.payload?.recent_fatigue_radar).toBeTruthy()
    expect(fatigueGuardrail?.status).toBe('warn')
    expect(fatigueGuardrail?.detail).toContain('IP场面覆盖 1/10')
    expect(fatigueGuardrail?.detail).toContain('玻璃门内外对峙')
    expect(model.batchGuardrail.recommendedAction.description).toContain('IP场面覆盖 1/10')
    expect(model.batchGuardrail.summary).toContain('IP场面覆盖 1/10')
  })

  test('downgrades safe batching when story pressure ladder is weak', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        futureRoute: [
          {
            chapterNo: 8,
            title: '试炼前夜',
            chapterTask: '主角拿到试炼资格',
            conflict: '执事设局阻拦',
            endingHook: '阵盘亮起第二道裂纹',
            mainlineProgress: '进入外门试炼核心局',
            riskTags: [],
          },
          {
            chapterNo: 9,
            title: '阵盘裂纹',
            chapterTask: '阵盘异常暴露主角潜力',
            conflict: '执事继续阻拦',
            endingHook: '执事再次加码',
            mainlineProgress: '外门压迫线继续',
            riskTags: [],
          },
          {
            chapterNo: 10,
            title: '外门震动',
            chapterTask: '试炼结果引发宗门震动',
            conflict: '执事仍旧阻拦',
            endingHook: '执事继续施压',
            mainlineProgress: '外门压迫线继续',
            riskTags: [],
          },
        ],
        storyPressureLadder: {
          ...basePlanning.storyPressureLadder,
          status: 'needs_attention',
          score: 62,
          label: '压力待升 62',
          summary: '未来章节存在 2 项故事压力风险：压力源、赌注升级。',
          actionKey: 'update_rolling_plan',
          pressureSources: [{ label: '执事阻拦', count: 3, chapters: [8, 9, 10], riskLevel: 'warn' }],
          signals: [
            { key: 'pressure_source', label: '压力源', status: 'warn', score: 62, count: 3, detail: '未来3章「执事阻拦」出现 3 次，压力源过于集中。', actionKey: 'update_rolling_plan' },
            { key: 'conflict_escalation', label: '冲突升级', status: 'ok', score: 82, count: 0, detail: '未来章节能看到压力加码或冲突升级。', actionKey: 'enter_chapter_writing' },
            { key: 'stakes_growth', label: '赌注升级', status: 'warn', score: 58, count: 2, detail: '未来章节缺少可感知赌注，读者可能觉得主角只是顺路过关。', actionKey: 'update_rolling_plan' },
            { key: 'reversal_pressure', label: '反转逼迫', status: 'ok', score: 82, count: 0, detail: '未来章节有反转或逼迫。', actionKey: 'enter_chapter_writing' },
          ],
          nextActions: ['下一批章节要明确压力源、升级赌注和反转逼迫，保证故事持续往前拱。'],
        },
      },
      writing: {
        ...baseWriting,
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
        },
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.batchGuardrail.status).toBe('caution')
    expect(model.batchGuardrail.safeChapterCount).toBe(1)
    expect(model.batchGuardrail.recommendedAction.key).toBe('update_rolling_plan')
    expect(model.batchGuardrail.recommendedAction.payload?.source).toBe('story_pressure_repair')
    expect(model.batchGuardrail.guardrails.find(item => item.label === '故事压力阶梯')?.status).toBe('warn')
    expect(model.batchGuardrail.guardrails.find(item => item.label === '故事压力阶梯')?.detail).toContain('压力风险')
    expect(model.batchGuardrail.summary).toContain('故事压力')
    expect(model.batchGuardrail.preflight.warnings.join('；')).toContain('故事压力阶梯')
  })

  test('downgrades safe batching when the current story unit is incomplete', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        storyUnitWorkshop: {
          ...basePlanning.storyUnitWorkshop,
          status: 'needs_attention',
          score: 66,
          label: '单元待补 66',
          summary: '当前剧情单元缺少完整事件包：本剧情单元仍缺：小高潮/回报、出单元钩子。',
          actionKey: 'update_rolling_plan',
          currentUnit: {
            ...basePlanning.storyUnitWorkshop.currentUnit,
            status: 'needs_attention',
            score: 66,
            summary: '本剧情单元仍缺：小高潮/回报、出单元钩子。',
            signals: [
              { key: 'entry_hook', label: '入口钩子', status: 'ok', score: 88, count: 1, detail: '第8章有入口钩子。', actionKey: 'enter_chapter_writing' },
              { key: 'pressure_escalation', label: '压力升级', status: 'ok', score: 88, count: 2, detail: '本单元有压力升级。', actionKey: 'enter_chapter_writing' },
              { key: 'mini_climax_payoff', label: '小高潮/回报', status: 'warn', score: 62, count: 1, detail: '本单元缺少小高潮或读者回报。', actionKey: 'update_rolling_plan' },
              { key: 'setup_and_storyline', label: '伏笔/剧情线', status: 'ok', score: 88, count: 1, detail: '本单元有剧情线调度。', actionKey: 'enter_chapter_writing' },
              { key: 'exit_hook', label: '出单元钩子', status: 'warn', score: 62, count: 1, detail: '单元最后一章缺少出单元钩子。', actionKey: 'update_rolling_plan' },
            ],
          },
          nextActions: ['先补齐当前剧情单元的入口钩子、压力升级、小高潮回报、伏笔/剧情线和出单元钩子，再扩大批量连写。'],
        },
      },
      writing: {
        ...baseWriting,
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '试炼前夜', goal: '以试炼资格引爆外门矛盾' }],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.batchGuardrail.status).toBe('caution')
    expect(model.batchGuardrail.safeChapterCount).toBe(1)
    expect(model.batchGuardrail.recommendedAction.key).toBe('update_rolling_plan')
    expect(model.batchGuardrail.recommendedAction.payload?.source).toBe('story_unit_repair')
    expect(model.batchGuardrail.guardrails.find(item => item.label === '剧情单元')?.status).toBe('warn')
    expect(model.batchGuardrail.guardrails.find(item => item.label === '剧情单元')?.detail).toContain('小高潮')
    expect(model.batchGuardrail.summary).toContain('剧情单元')
    expect(model.batchGuardrail.preflight.warnings.join('；')).toContain('剧情单元')
  })

  test('downgrades safe batching when million-word capacity is too shallow for an epic target', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          writtenWords: 48000,
          targetWords: 10000000,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        storylineBoard: {
          ...basePlanning.storylineBoard,
          total: 3,
          summary: '只有主线和两条支线，十万字后容易耗尽冲突。',
        },
        volumeBeatBudget: {
          ...basePlanning.volumeBeatBudget,
          plannedChapterCount: 22,
          totalChapters: 40,
          score: 86,
          status: 'ready',
        },
      },
      writing: {
        ...baseWriting,
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '试炼前夜', goal: '以试炼资格引爆外门矛盾' }],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.longformCapacity.status).toBe('caution')
    expect(model.longformCapacity.targetBandLabel).toBe('1000万字级')
    expect(model.longformCapacity.signals.find(signal => signal.key === 'storyline_pool')?.status).toBe('warn')
    expect(model.longformCapacity.fuelQueue.map(item => item.label)).toEqual(['补剧情线池', '延长当前卷跑道'])
    expect(model.longformCapacity.fuelQueue[0]?.actionKey).toBe('open_story_assets')
    expect(model.longformCapacity.fuelQueue[0]?.modelCall).toBe(false)
    expect(model.batchGuardrail.status).toBe('caution')
    expect(model.batchGuardrail.safeChapterCount).toBe(1)
    expect(model.batchGuardrail.guardrails.find(item => item.label === '百万字产能')?.status).toBe('warn')
    expect(model.pipeline.find(step => step.key === 'longform_capacity')?.status).toBe('warning')
    expect(model.metrics.longformCapacityScore).toBeLessThan(80)
  })

  test('blocks continuous production when longform canon state is stale', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
      },
      writing: {
        ...baseWriting,
        readiness: {
          blockers: [],
          warnings: [
            { key: 'story_state_stale', status: 'warning', label: '故事状态可能滞后', detail: '建议同步最近已写章节的状态机。', actionKey: 'update_canon' },
          ],
          checks: [],
        },
        readinessChecks: [
          { key: 'story_state_stale', status: 'warning', label: '故事状态可能滞后', detail: '建议同步最近已写章节的状态机。', actionKey: 'update_canon' },
        ],
        primaryActionKey: 'update_canon',
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '同步故事状态',
          primaryActionKey: 'update_canon',
        },
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '试炼前夜', goal: '以试炼资格引爆外门矛盾' }],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
      },
      activeTasks: [],
      selectedModelId: 12,
    } as any)

    expect(model.status).toBe('needs_governance')
    expect(model.statusLabel).toBe('长线记忆待同步')
    expect(model.mainAction.key).toBe('update_canon')
    expect(model.batchGuardrail.status).toBe('blocked')
    expect(model.batchGuardrail.safeChapterCount).toBe(0)
    expect(model.batchGuardrail.guardrails.find(item => item.label === '长线记忆')?.status).toBe('block')
    expect(model.batchGuardrail.guardrails.find(item => item.label === '长线记忆')?.detail).toContain('故事状态可能滞后')
    expect(model.dailyBattlePlan.currentStepKey).toBe('fuel_materials')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'fuel_materials')?.status).toBe('active')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'fuel_materials')?.action.key).toBe('update_canon')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'chapter_work')?.status).toBe('pending')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'batch_release')?.status).toBe('blocked')
  })

  test('downgrades continuous production when longform memory summary is unavailable', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
      },
      writing: {
        ...baseWriting,
        readiness: {
          blockers: [],
          warnings: [
            { key: 'memory_unavailable', status: 'warning', label: '记忆摘要不可用', detail: '缺少可引用的记忆事实。', actionKey: 'fix_continuity' },
          ],
          checks: [],
        },
        readinessChecks: [
          { key: 'memory_unavailable', status: 'warning', label: '记忆摘要不可用', detail: '缺少可引用的记忆事实。', actionKey: 'fix_continuity' },
        ],
        primaryActionKey: 'write_draft',
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '试炼前夜', goal: '以试炼资格引爆外门矛盾' }],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
      },
      activeTasks: [],
      selectedModelId: 12,
    } as any)

    expect(model.batchGuardrail.status).toBe('caution')
    expect(model.batchGuardrail.safeChapterCount).toBe(1)
    expect(model.batchGuardrail.recommendedAction.key).toBe('fix_continuity')
    expect(model.batchGuardrail.guardrails.find(item => item.label === '长线记忆')?.status).toBe('warn')
    expect(model.batchGuardrail.guardrails.find(item => item.label === '长线记忆')?.detail).toContain('记忆摘要不可用')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'batch_release')?.badges).toContain('安全 1章')
  })

  test('blocks continuous production while the current chapter still needs delivery work', () => {
    const model = buildAutoCreationDirectorModel({
      planning: basePlanning,
      writing: {
        ...baseWriting,
        nextChapter: { ...baseWriting.nextChapter, wordCount: 3200, hasProse: true },
        chapterAcceptanceDesk: {
          ...baseWriting.chapterAcceptanceDesk,
          visible: true,
          acceptanceStatus: 'needs_quality_check',
          statusLabel: '需复检',
          acceptanceReasons: ['本章已有正文，但还没有当前章节的质量复检记录。'],
          recommendedAcceptanceAction: { key: 'refresh_current_quality', label: '复检当前版本' },
        },
        topStatus: { ...baseWriting.topStatus, nextActionLabel: '复检当前版本', primaryActionKey: 'refresh_current_quality' },
        primaryActionKey: 'refresh_current_quality',
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.batchGuardrail.status).toBe('blocked')
    expect(model.batchGuardrail.safeChapterCount).toBe(0)
    expect(model.batchGuardrail.recommendedAction.key).toBe('refresh_current_quality')
    expect(model.batchGuardrail.guardrails.find(item => item.label === '当前章交稿')?.status).toBe('block')
  })

  test('uses chapter handoff as the final gate before releasing the next batch', () => {
    const model = buildAutoCreationDirectorModel({
      planning: basePlanning,
      writing: {
        ...baseWriting,
        nextChapter: { ...baseWriting.nextChapter, chapterNo: 8, wordCount: 3200, hasProse: true },
        chapterAcceptanceDesk: {
          ...baseWriting.chapterAcceptanceDesk,
          visible: true,
          acceptanceStatus: 'ready_to_accept',
          statusLabel: '可验收',
          acceptanceReasons: ['质量复检通过，故事状态已同步，可以进入下一章。'],
          storyStateSynced: true,
          recommendedAcceptanceAction: { key: 'accept_chapter_and_continue', label: '验收并进入下一章' },
        },
        chapterHandoffDesk: {
          visible: true,
          status: 'ready',
          label: '可接下一章',
          fromChapterNo: 8,
          toChapterNo: 9,
          previousEnding: '阵盘亮起第二道裂纹',
          expectationCarryOver: ['执事背后的供奉是谁'],
          nextOpeningObligations: ['试炼前夜必须先回应裂纹异变'],
          deliveryRiskCarryOver: {
            totalCount: 3,
            label: '待修复 3',
            priorityLabel: '优先修章末翻页',
            items: ['修吸引力：吸引力缺口 2', '补创新：创新缺口 1'],
            openingActions: ['开篇先补异常压迫'],
            middleActions: ['中段补规则反制创新'],
            endingActions: ['章末重做翻页问题'],
          },
          storyStateSynced: true,
          storylineStatusLabel: '剧情线 OK',
          actionKey: 'accept_chapter_and_continue',
          actionLabel: '进入下一章开写',
        },
        topStatus: { ...baseWriting.topStatus, nextActionLabel: '验收并进入下一章', primaryActionKey: 'accept_chapter_and_continue' },
        primaryActionKey: 'accept_chapter_and_continue',
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.batchGuardrail.status).toBe('blocked')
    expect(model.batchGuardrail.safeChapterCount).toBe(0)
    expect(model.batchGuardrail.recommendedAction.key).toBe('accept_chapter_and_continue')
    const handoffSignal = model.batchGuardrail.guardrails.find(item => item.label === '章节交接')
    expect(handoffSignal?.status).toBe('block')
    expect(handoffSignal?.detail).toContain('第8章到第9章')
    expect(handoffSignal?.detail).toContain('阵盘亮起第二道裂纹')
    expect(handoffSignal?.detail).toContain('交稿风险：待修复 3')
    expect(handoffSignal?.detail).toContain('优先修章末翻页')
    expect(handoffSignal?.detail).toContain('开篇修复：开篇先补异常压迫')
    expect(handoffSignal?.detail).toContain('中段推进：中段补规则反制创新')
    expect(handoffSignal?.detail).toContain('章末追读：章末重做翻页问题')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'chapter_work')?.detail).toContain('可接下一章')
    expect(model.productionLicense.status).toBe('blocked')
    expect(model.productionLicense.nextAction.key).toBe('accept_chapter_and_continue')
  })

  test('shows chapter handoff as the active pipeline step before safe batching', () => {
    const model = buildAutoCreationDirectorModel({
      planning: basePlanning,
      writing: {
        ...baseWriting,
        nextChapter: { ...baseWriting.nextChapter, chapterNo: 8, wordCount: 3200, hasProse: true },
        chapterAcceptanceDesk: {
          ...baseWriting.chapterAcceptanceDesk,
          visible: true,
          acceptanceStatus: 'ready_to_accept',
          statusLabel: '可验收',
          acceptanceReasons: ['质量复检通过，故事状态已同步，可以进入下一章。'],
          storyStateSynced: true,
          recommendedAcceptanceAction: { key: 'accept_chapter_and_continue', label: '验收并进入下一章' },
        },
        chapterHandoffDesk: {
          visible: true,
          status: 'ready',
          label: '可接下一章',
          fromChapterNo: 8,
          toChapterNo: 9,
          previousEnding: '阵盘亮起第二道裂纹',
          expectationCarryOver: ['执事背后的供奉是谁'],
          nextOpeningObligations: ['试炼前夜必须先回应裂纹异变'],
          deliveryRiskCarryOver: {
            totalCount: 3,
            label: '待修复 3',
            priorityLabel: '优先修章末翻页',
            items: ['修吸引力：吸引力缺口 2', '补创新：创新缺口 1'],
            openingActions: ['开篇先补异常压迫'],
            middleActions: ['中段补规则反制创新'],
            endingActions: ['章末重做翻页问题'],
          },
          storyStateSynced: true,
          storylineStatusLabel: '剧情线 OK',
          actionKey: 'accept_chapter_and_continue',
          actionLabel: '进入下一章开写',
        },
        topStatus: { ...baseWriting.topStatus, nextActionLabel: '验收并进入下一章', primaryActionKey: 'accept_chapter_and_continue' },
        primaryActionKey: 'accept_chapter_and_continue',
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    const handoffStep = model.pipeline.find(step => step.key === 'chapter_handoff')

    expect(handoffStep?.label).toBe('章节交接')
    expect(handoffStep?.status).toBe('active')
    expect(handoffStep?.detail).toContain('第8章到第9章')
    expect(handoffStep?.detail).toContain('阵盘亮起第二道裂纹')
    expect(handoffStep?.detail).toContain('试炼前夜必须先回应裂纹异变')
    expect(handoffStep?.detail).toContain('交稿风险：待修复 3')
    expect(handoffStep?.detail).toContain('补创新：创新缺口 1')
    expect(handoffStep?.detail).toContain('开篇修复：开篇先补异常压迫')
    expect(handoffStep?.detail).toContain('中段推进：中段补规则反制创新')
    expect(handoffStep?.detail).toContain('章末追读：章末重做翻页问题')
    expect(model.pipeline.map(step => step.key)).toEqual([
      'longform_planning',
      'creation_contract',
      'rolling_script_room',
      'longform_capacity',
      'volume_beat_budget',
      'longform_rhythm',
      'story_assets',
      'retention_curve',
      'chapter_planning',
      'chapter_execution',
      'quality_gate',
      'canon_sync',
      'chapter_handoff',
      'batch_guardrail',
      'async_tasks',
    ])
  })

  test('downgrades continuous production when long-range chapter reserves are thin', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: false, planned: 18, required: 100, missingChapters: [], label: '18/100' },
        },
      },
      writing: {
        ...baseWriting,
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '压迫升级', goal: '执事逼主角交阵盘' }],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.batchGuardrail.status).toBe('caution')
    expect(model.batchGuardrail.safeChapterCount).toBe(1)
    expect(model.batchGuardrail.recommendedAction.key).toBe('future100_generate')
    expect(model.batchGuardrail.guardrails.find(item => item.label === '未来100章储备')?.status).toBe('warn')
  })

  test('summarizes the latest safe batch generation as a review queue', () => {
    const model = buildAutoCreationDirectorModel({
      planning: basePlanning,
      writing: baseWriting,
      activeTasks: [],
      selectedModelId: 12,
      runRecords: [
        {
          id: 8,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-01T00:00:00.000Z',
          input_ref: JSON.stringify({ source: 'manual_batch', total: 12 }),
          output_ref: JSON.stringify({ total: 12, success: 12, failed: 0, chapters: [] }),
        },
        {
          id: 9,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-02T00:00:00.000Z',
          status: 'warn',
          input_ref: JSON.stringify({ source: 'auto_creation_safe_batch', safety_limit: 3, available_total: 22 }),
          output_ref: JSON.stringify({
            total: 3,
            success: 2,
            failed: 1,
            chapters: [
              { id: 8, chapter_no: 8, title: '试炼前夜', status: 'success', score: 82, revised: true, word_count: 3180 },
              { id: 9, chapter_no: 9, title: '阵盘裂纹', status: 'failed', error: '模型未返回正文' },
              { id: 10, chapter_no: 10, title: '外门震动', status: 'success', score: 86, revised: false, word_count: 3021 },
            ],
            errors: ['第 9 章《阵盘裂纹》：模型未返回正文'],
          }),
        },
      ],
    })

    expect(model.batchReviewQueue.visible).toBe(true)
    expect(model.batchReviewQueue.status).toBe('warn')
    expect(model.batchReviewQueue.label).toBe('安全连写复盘')
    expect(model.batchReviewQueue.total).toBe(3)
    expect(model.batchReviewQueue.success).toBe(2)
    expect(model.batchReviewQueue.failed).toBe(1)
    expect(model.batchReviewQueue.safeLimit).toBe(3)
    expect(model.batchReviewQueue.nextAction.key).toBe('open_task_center')
    expect(model.batchReviewQueue.completionDashboard.visible).toBe(true)
    expect(model.batchReviewQueue.completionDashboard.status).toBe('needs_repair')
    expect(model.batchReviewQueue.completionDashboard.nextAction.key).toBe('open_task_center')
    expect(model.batchReviewQueue.handoff.status).toBe('failed')
    expect(model.batchReviewQueue.handoff.label).toBe('先处理失败章节')
    expect(model.batchReviewQueue.handoff.action.key).toBe('open_task_center')
    expect(model.batchReviewQueue.handoff.targetChapterNos).toEqual([9])
    expect(model.batchReviewQueue.completionDashboard.metrics.map(metric => metric.label)).toEqual([
      '生成完成',
      '交稿完成',
      '质检健康',
      '计划兑现',
    ])
    expect(model.batchReviewQueue.items.map(item => item.chapterNo)).toEqual([8, 9, 10])
    expect(model.batchReviewQueue.items.find(item => item.status === 'failed')?.error).toContain('模型未返回正文')
  })

  test('prioritizes failed safe batch review before opening another batch', () => {
    const model = buildAutoCreationDirectorModel({
      planning: basePlanning,
      writing: baseWriting,
      activeTasks: [],
      selectedModelId: 12,
      runRecords: [
        {
          id: 9,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-02T00:00:00.000Z',
          status: 'warn',
          input_ref: JSON.stringify({ source: 'auto_creation_safe_batch', safety_limit: 3 }),
          output_ref: JSON.stringify({
            total: 3,
            success: 2,
            failed: 1,
            chapters: [{ chapter_no: 9, title: '阵盘裂纹', status: 'failed', error: '模型未返回正文' }],
          }),
        },
      ],
    })

    expect(model.status).toBe('needs_acceptance')
    expect(model.statusLabel).toBe('批次待复盘')
    expect(model.mainAction.key).toBe('open_task_center')
    expect(model.mainAction.label).toBe('查看失败任务')
    expect(model.confirmations).toContain('安全连写批次需要复盘')
  })

  test('routes successful safe batch review into quality revision before the next batch', () => {
    const model = buildAutoCreationDirectorModel({
      planning: basePlanning,
      writing: baseWriting,
      activeTasks: [],
      selectedModelId: 12,
      runRecords: [
        {
          id: 10,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-03T00:00:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({ source: 'auto_creation_safe_batch', safety_limit: 3 }),
          output_ref: JSON.stringify({
            total: 3,
            success: 3,
            failed: 0,
            chapters: [
              { chapter_no: 8, title: '试炼前夜', status: 'success', score: 82, word_count: 3180 },
              { chapter_no: 9, title: '阵盘裂纹', status: 'success', score: 85, word_count: 3090 },
              { chapter_no: 10, title: '外门震动', status: 'success', score: 86, word_count: 3021 },
            ],
          }),
        },
      ],
    })

    expect(model.status).toBe('needs_acceptance')
    expect(model.statusLabel).toBe('批次待验收')
    expect(model.mainAction.key).toBe('open_quality_revision')
    expect(model.mainAction.label).toBe('进入质检修订')
    expect(model.batchReviewQueue.handoff.status).toBe('deliver_chapters')
    expect(model.batchReviewQueue.handoff.label).toBe('逐章交稿')
    expect(model.batchReviewQueue.handoff.targetChapterNos).toEqual([8, 9, 10])
    expect(model.batchReviewQueue.handoff.action.key).toBe('open_quality_revision')
    expect(model.confirmations).toContain('安全连写批次需要逐章验收')
  })

  test('releases safe batch review after every generated chapter is delivered', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        futureRoute: [
          { chapterNo: 11, title: '内门来人', chapterTask: '内门势力抛出招揽条件', conflict: '招揽背后附带夺阵盘的暗线', endingHook: '内门令牌落在桌上', mainlineProgress: '主角进入内门视野' },
          { chapterNo: 12, title: '令牌代价', chapterTask: '主角试探令牌真实代价', conflict: '旧执事借规矩继续施压', endingHook: '令牌背面浮出血字', mainlineProgress: '宗门规矩开始反噬旧秩序' },
          { chapterNo: 13, title: '阵盘回响', chapterTask: '阵盘回应内门试探', conflict: '阵盘力量暴露与隐藏身份冲突', endingHook: '暗处长老认出阵纹', mainlineProgress: '阵法天赋进入高层视线' },
        ],
      },
      writing: {
        ...baseWriting,
        nextChapter: { ...baseWriting.nextChapter, id: 11, chapterNo: 11, title: '内门来人' },
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [
            { title: '余波清算', goal: '试炼结果引发宗门震动' },
            { title: '内门招揽', goal: '新势力提出条件' },
          ],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 10 },
      chapters: [
        { id: 8, chapter_no: 8, title: '试炼前夜', chapter_text: '正文'.repeat(1600) },
        { id: 9, chapter_no: 9, title: '阵盘裂纹', chapter_text: '正文'.repeat(1550) },
        { id: 10, chapter_no: 10, title: '外门震动', chapter_text: '正文'.repeat(1510) },
      ],
      reviews: [
        { id: 101, chapter_id: 8, review_type: 'prose_quality', created_at: '2026-06-03T01:00:00.000Z', payload: JSON.stringify({ score: 82, passed: true }) },
        { id: 102, chapter_id: 9, review_type: 'prose_quality', created_at: '2026-06-03T01:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 103, chapter_id: 10, review_type: 'prose_quality', created_at: '2026-06-03T01:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
      ],
      runRecords: [
        {
          id: 10,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-03T00:00:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({ source: 'auto_creation_safe_batch', safety_limit: 3 }),
          output_ref: JSON.stringify({
            total: 3,
            success: 3,
            failed: 0,
            chapters: [
              { id: 8, chapter_no: 8, title: '试炼前夜', status: 'success', score: 82, word_count: 3180 },
              { id: 9, chapter_no: 9, title: '阵盘裂纹', status: 'success', score: 85, word_count: 3090 },
              { id: 10, chapter_no: 10, title: '外门震动', status: 'success', score: 86, word_count: 3021 },
            ],
          }),
        },
      ],
    } as any)

    expect(model.batchReviewQueue.status).toBe('done')
    expect(model.batchReviewQueue.delivered).toBe(3)
    expect(model.batchReviewQueue.handoff.status).toBe('continue_batch')
    expect(model.batchReviewQueue.handoff.label).toBe('放行下一批')
    expect(model.batchReviewQueue.handoff.action.key).toBe('start_safe_batch_generation')
    expect(model.batchReviewQueue.handoff.summary).toContain('下一批')
    expect(model.status).toBe('ready')
    expect(model.confirmations).not.toContain('安全连写批次需要逐章验收')
    expect(model.batchReviewQueue.nextAction.key).toBe('start_safe_batch_generation')
  })

  test('holds delivered safe batch when million word runway risks remain', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        futureRoute: [
          { chapterNo: 11, title: '内门来人', chapterTask: '内门势力抛出招揽条件', conflict: '招揽背后附带夺阵盘的暗线', endingHook: '内门令牌落在桌上', mainlineProgress: '主角进入内门视野' },
          { chapterNo: 12, title: '令牌代价', chapterTask: '主角试探令牌真实代价', conflict: '旧执事借规矩继续施压', endingHook: '令牌背面浮出血字', mainlineProgress: '宗门规矩开始反噬旧秩序' },
          { chapterNo: 13, title: '阵盘回响', chapterTask: '阵盘回应内门试探', conflict: '阵盘力量暴露与隐藏身份冲突', endingHook: '暗处长老认出阵纹', mainlineProgress: '阵法天赋进入高层视线' },
        ],
      },
      writing: {
        ...baseWriting,
        nextChapter: { ...baseWriting.nextChapter, id: 11, chapterNo: 11, title: '内门来人' },
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '内门招揽', goal: '新势力提出条件' }],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 10 },
      chapters: [
        { id: 8, chapter_no: 8, title: '试炼前夜', chapter_text: '正文'.repeat(1600) },
        { id: 9, chapter_no: 9, title: '阵盘裂纹', chapter_text: '正文'.repeat(1550) },
        { id: 10, chapter_no: 10, title: '外门震动', chapter_text: '正文'.repeat(1510) },
      ],
      reviews: [
        { id: 101, chapter_id: 8, review_type: 'prose_quality', created_at: '2026-06-03T01:00:00.000Z', payload: JSON.stringify({ score: 82, passed: true }) },
        { id: 102, chapter_id: 9, review_type: 'prose_quality', created_at: '2026-06-03T01:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 103, chapter_id: 10, review_type: 'prose_quality', created_at: '2026-06-03T01:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
        {
          id: 104,
          chapter_id: 9,
          review_type: 'runway_sync',
          created_at: '2026-06-03T01:03:00.000Z',
          payload: JSON.stringify({
            chapter_id: 9,
            chapter_no: 9,
            runway_sync: {
              status: 'warn',
              label: '航线风险 2',
              risk_count: 2,
              four_question_missed: [{ label: '主线推进了什么', text: '主角进入内门视野' }],
              reader_fuel_missed: [{ text: '阵盘裂纹反制爽点' }],
              redline_touched: [],
            },
          }),
        },
      ],
      runRecords: [
        {
          id: 10,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-03T00:00:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({ source: 'auto_creation_safe_batch', safety_limit: 3 }),
          output_ref: JSON.stringify({
            total: 3,
            success: 3,
            failed: 0,
            chapters: [
              { id: 8, chapter_no: 8, title: '试炼前夜', status: 'success', score: 82, word_count: 3180 },
              { id: 9, chapter_no: 9, title: '阵盘裂纹', status: 'success', score: 85, word_count: 3090 },
              { id: 10, chapter_no: 10, title: '外门震动', status: 'success', score: 86, word_count: 3021 },
            ],
          }),
        },
      ],
    } as any)

    expect(model.batchReviewQueue.status).toBe('risk')
    expect(model.batchReviewQueue.nextAction.key).toBe('create_safe_batch_risk_repair')
    expect(model.batchReviewQueue.riskRadar.runwayRiskCount).toBe(2)
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'runway')?.status).toBe('warn')
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'runway')?.detail).toContain('航线风险 2')
    expect(model.batchReviewQueue.riskRadar.repairTasks.map(task => task.issue_type)).toContain('runway_sync_risk')
    expect(model.batchReviewQueue.handoff.status).toBe('repair_risks')
    expect(model.batchReviewQueue.handoff.riskLabels).toContain('航线风险')
    expect(model.batchReviewQueue.completionDashboard.status).toBe('needs_repair')
    expect(model.status).toBe('needs_acceptance')
  })

  test('routes completed safe batch into next queue planning when the next batch is not ready', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        futureRoute: [
          {
            chapterNo: 11,
            title: '内门来人',
            chapterTask: '',
            conflict: '',
            endingHook: '内门令牌落在桌上',
            mainlineProgress: '',
          },
        ],
      },
      writing: {
        ...baseWriting,
        nextChapter: { ...baseWriting.nextChapter, id: 11, chapterNo: 11, title: '内门来人' },
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'needs_scene_plan',
          statusLabel: '需补计划',
          scenePlanStatus: 'missing',
          sceneCards: [],
          recommendedPlannerAction: { key: 'build_scene_plan', label: '生成场景卡' },
        },
        writingQueue: {
          visible: true,
          currentChapterNo: 11,
          readyCount: 0,
          blockedCount: 1,
          draftedCount: 0,
          planRepair: {
            visible: true,
            label: '补齐队列计划',
            chapterCount: 1,
            missingCount: 3,
            chapterNos: [11],
            intent: { source: 'writing_queue_batch_plan_repair', chapter_nos: [11] },
          },
          items: [
            { id: 11, chapterNo: 11, title: '内门来人', sourceLabel: '滚动规划', status: 'needs_plan', statusLabel: '缺计划', actionLabel: '补计划', actionHint: '缺本章目标、核心冲突、主线推进', missingPlanFields: ['chapterGoal', 'conflict', 'mainlineProgress'], missingPlanLabels: ['本章目标', '核心冲突', '主线推进'], repairIntent: { source: 'writing_queue_plan_repair', chapter_no: 11 }, goal: '', conflict: '', endingHook: '内门令牌落在桌上', wordCount: 0 },
          ],
        },
      },
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 10 },
      chapters: [
        { id: 8, chapter_no: 8, title: '试炼前夜', chapter_text: '正文'.repeat(1600) },
        { id: 9, chapter_no: 9, title: '阵盘裂纹', chapter_text: '正文'.repeat(1550) },
        { id: 10, chapter_no: 10, title: '外门震动', chapter_text: '正文'.repeat(1510) },
      ],
      reviews: [
        { id: 101, chapter_id: 8, review_type: 'prose_quality', created_at: '2026-06-03T01:00:00.000Z', payload: JSON.stringify({ score: 82, passed: true }) },
        { id: 102, chapter_id: 9, review_type: 'prose_quality', created_at: '2026-06-03T01:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 103, chapter_id: 10, review_type: 'prose_quality', created_at: '2026-06-03T01:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
      ],
      runRecords: [
        {
          id: 10,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-03T00:00:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({ source: 'auto_creation_safe_batch', safety_limit: 3 }),
          output_ref: JSON.stringify({
            total: 3,
            success: 3,
            failed: 0,
            chapters: [
              { id: 8, chapter_no: 8, title: '试炼前夜', status: 'success', score: 82, word_count: 3180 },
              { id: 9, chapter_no: 9, title: '阵盘裂纹', status: 'success', score: 85, word_count: 3090 },
              { id: 10, chapter_no: 10, title: '外门震动', status: 'success', score: 86, word_count: 3021 },
            ],
          }),
        },
      ],
    } as any)

    expect(model.batchReviewQueue.status).toBe('done')
    expect(model.batchGuardrail.status).toBe('blocked')
    expect(model.batchReviewQueue.handoff.status).toBe('prepare_next')
    expect(model.batchReviewQueue.handoff.label).toBe('补下一批计划')
    expect(model.batchReviewQueue.handoff.action.key).toBe('update_rolling_plan')
    expect(model.batchReviewQueue.handoff.targetChapterNos).toEqual([11])
    expect(model.batchReviewQueue.handoff.summary).toContain('下一批')
  })

  test('blocks safe batching while unresolved high-risk delivery annotations remain open', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        futureRoute: [
          { chapterNo: 11, title: '内门来人', chapterTask: '内门势力抛出招揽条件', conflict: '招揽背后附带夺阵盘的暗线', endingHook: '内门令牌落在桌上', mainlineProgress: '主角进入内门视野' },
          { chapterNo: 12, title: '令牌代价', chapterTask: '主角试探令牌真实代价', conflict: '旧执事借规矩继续施压', endingHook: '令牌背面浮出血字', mainlineProgress: '宗门规矩开始反噬旧秩序' },
          { chapterNo: 13, title: '阵盘回响', chapterTask: '阵盘回应内门试探', conflict: '阵盘力量暴露与隐藏身份冲突', endingHook: '暗处长老认出阵纹', mainlineProgress: '阵法天赋进入高层视线' },
        ],
      },
      writing: {
        ...baseWriting,
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [
            { title: '内门压迫', goal: '以新规逼主角交出阵盘' },
            { title: '反向立威', goal: '主角用规则漏洞反制执事' },
          ],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
      reviews: [
        {
          id: 201,
          chapter_id: 7,
          review_type: 'chapter_core_drift',
          created_at: '2026-06-04T01:00:00.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            core_drift: { status: 'warn', drift_risks: ['主角长期欲望被支线盖住'] },
          }),
        },
        {
          id: 202,
          chapter_id: 7,
          review_type: 'reader_retention_sync',
          created_at: '2026-06-04T01:01:00.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            reader_retention_sync: { status: 'warn', missed_count: 1, missed: ['章末追读问题不清晰'] },
          }),
        },
        {
          id: 203,
          chapter_id: 8,
          review_type: 'storyline_sync',
          created_at: '2026-06-04T01:02:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            storyline_sync: { status: 'warn', forbidden_touched: ['提前触碰幕后主使'] },
          }),
        },
        {
          id: 204,
          chapter_id: 8,
          review_type: 'signature_scene_sync',
          created_at: '2026-06-04T01:03:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            signature_scene_sync: { status: 'warn', missed_count: 1, missed: ['任务书要求的公开反转场面没有写成可视化冲突'] },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.totalOpen).toBe(4)
    expect(model.deliveryRiskGate.highOpen).toBe(3)
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toEqual(['核心', '追读', '剧情线', '强场面'])
    expect(model.deliveryRiskGate.topRisks).toContain('强场面第8章：任务书要求的公开反转场面没有写成可视化冲突')
    expect(model.status).toBe('needs_governance')
    expect(model.statusLabel).toBe('交稿风险待处理')
    expect(model.mainAction.key).toBe('create_delivery_risk_repair')
    expect(model.mainAction.label).toBe('生成风险修复任务')
    expect(model.confirmations).toContain('未清交稿风险会阻止安全连写')
    expect(model.batchGuardrail.status).toBe('blocked')
    expect(model.batchGuardrail.safeChapterCount).toBe(0)
    expect(model.batchGuardrail.guardrails.find(item => item.label === '未清交稿风险')?.status).toBe('block')
    expect(model.batchGuardrail.recommendedAction.key).toBe('create_delivery_risk_repair')
    expect(model.pipeline.find(step => step.key === 'batch_guardrail')?.status).toBe('blocked')
    expect(model.dailyBattlePlan.currentStepKey).toBe('clear_risks')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'clear_risks')?.status).toBe('active')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'clear_risks')?.action.key).toBe('create_delivery_risk_repair')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'chapter_work')?.status).toBe('pending')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'batch_release')?.status).toBe('blocked')
  })

  test('routes single-chapter governance recheck misses into recovery evidence repair tasks', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        futureRoute: [
          { chapterNo: 8, title: '试炼前夜', role: '当前章', coreHook: '阵盘裂纹被执事看见', status: 'ready' },
          { chapterNo: 9, title: '钟声复验', role: '下一章', coreHook: '用修后证据反制执事', status: 'ready' },
        ],
      } as any,
      writing: {
        ...baseWriting,
        chapterAcceptanceDesk: {
          ...baseWriting.chapterAcceptanceDesk,
          deliveryRiskQueue: {
            totalCount: 2,
            label: '待修复 2',
            priorityLabel: '优先验恢复依据',
            items: ['验恢复依据：恢复依据缺口 2'],
          },
        },
      } as any,
      selectedModelId: 12,
      reviews: [
        {
          id: 305,
          chapter_id: 8,
          review_type: 'governance_recheck_sync',
          created_at: '2026-06-04T01:05:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            governance_recheck_sync: {
              status: 'warn',
              label: '恢复依据缺口 2',
              missed_count: 2,
              failed_evidence: ['第42章对白交锋已补回样章节奏'],
              watch_items: ['下一章继续观察样章策略命中率'],
              summary: '单章交稿没有继承治理复查记忆。',
            },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.totalOpen).toBe(2)
    expect(model.deliveryRiskGate.highOpen).toBe(2)
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('恢复依据')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('恢复依据第8章：第42章对白交锋已补回样章节奏')
    expect(model.mainAction.key).toBe('create_delivery_risk_repair')
    expect(model.serialCockpit.riskQueue.find(item => item.key === 'delivery_risks')?.detail).toBe('优先验恢复依据')
  })

  test('ignores delivery annotations that have been resolved or cleared by convergence', () => {
    const resolvedCoreKey = 'chapter_core_drift:201:7:7:core_drift:核心偏移 1'
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        futureRoute: [
          {
            chapterNo: 8,
            title: '试炼前夜',
            chapterTask: '主角拿到试炼资格',
            conflict: '执事设局阻拦',
            endingHook: '阵盘亮起第二道裂纹',
            mainlineProgress: '进入外门试炼核心局',
            riskTags: [],
          },
          {
            chapterNo: 9,
            title: '阵盘裂纹',
            chapterTask: '阵盘异常暴露主角潜力',
            conflict: '同门围堵试探底牌',
            endingHook: '内门执事点名关注',
            mainlineProgress: '让宗门高层第一次注意主角',
            riskTags: [],
          },
          {
            chapterNo: 10,
            title: '外门震动',
            chapterTask: '试炼结果引发宗门震动',
            conflict: '旧秩序压制新晋黑马',
            endingHook: '内门招揽提出苛刻条件',
            mainlineProgress: '打开内门势力线',
            riskTags: [],
          },
        ],
      },
      writing: {
        ...baseWriting,
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
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
      reviews: [
        {
          id: 201,
          chapter_id: 7,
          review_type: 'chapter_core_drift',
          created_at: '2026-06-04T01:00:00.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            core_drift: { status: 'warn', drift_risks: ['主角长期欲望被支线盖住'] },
          }),
        },
        {
          id: 301,
          review_type: 'review_annotation_status',
          created_at: '2026-06-04T01:10:00.000Z',
          payload: JSON.stringify({
            annotation_key: resolvedCoreKey,
            status: 'resolved',
            resolved_at: '2026-06-04T01:10:00.000Z',
          }),
        },
        {
          id: 202,
          chapter_id: 8,
          review_type: 'storyline_sync',
          created_at: '2026-06-04T01:02:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            storyline_sync: { status: 'warn', forbidden_touched: ['提前触碰幕后主使'] },
          }),
        },
        {
          id: 302,
          chapter_id: 8,
          review_type: 'delivery_risk_convergence',
          created_at: '2026-06-04T01:12:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            delivery_risk_convergence: { status: 'cleared', after_count: 0, label: '风险已清零' },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('ok')
    expect(model.deliveryRiskGate.totalOpen).toBe(0)
    expect(model.batchGuardrail.status).toBe('ready')
    expect(model.batchGuardrail.safeChapterCount).toBe(3)
    expect(model.batchGuardrail.recommendedAction.key).toBe('start_safe_batch_generation')
  })

  test('delivery risk gate explains convergence-cleared risks without repair tasks', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        futureRoute: [
          {
            chapterNo: 8,
            title: '试炼前夜',
            chapterTask: '主角拿到试炼资格',
            conflict: '执事设局阻拦',
            endingHook: '阵盘亮起第二道裂纹',
            mainlineProgress: '进入外门试炼核心局',
            riskTags: [],
          },
          {
            chapterNo: 9,
            title: '阵盘裂纹',
            chapterTask: '阵盘异常暴露主角潜力',
            conflict: '同门围堵试探底牌',
            endingHook: '内门执事点名关注',
            mainlineProgress: '让宗门高层第一次注意主角',
            riskTags: [],
          },
          {
            chapterNo: 10,
            title: '外门震动',
            chapterTask: '试炼结果引发宗门震动',
            conflict: '旧秩序压制新晋黑马',
            endingHook: '内门招揽提出苛刻条件',
            mainlineProgress: '打开内门势力线',
            riskTags: [],
          },
        ],
      },
      writing: {
        ...baseWriting,
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
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
      reviews: [
        {
          id: 201,
          chapter_id: 7,
          review_type: 'chapter_core_drift',
          created_at: '2026-06-04T01:00:00.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            core_drift: { status: 'warn', drift_risks: ['主角长期欲望被支线盖住'] },
          }),
        },
        {
          id: 302,
          chapter_id: 7,
          review_type: 'delivery_risk_convergence',
          created_at: '2026-06-04T01:12:00.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            delivery_risk_convergence: {
              status: 'cleared',
              label: '风险已清零',
              before_count: 1,
              after_count: 0,
              after: { total_count: 0, items: [] },
            },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('ok')
    expect(model.deliveryRiskGate.totalOpen).toBe(0)
    expect(model.deliveryRiskGate.recentlyResolved).toEqual([
      expect.objectContaining({
        label: '复检收敛已清',
        count: 1,
        chapterNos: [7],
        issueTypes: ['delivery_risk_convergence'],
      }),
    ])
    expect(model.deliveryRiskGate.recentlyResolved[0]?.detail).toContain('第7章')
    expect(model.deliveryRiskGate.recentlyResolved[0]?.detail).toContain('风险已清零')
    expect(model.deliveryRiskGate.recentlyResolved[0]?.detail).toContain('风险清零')
    expect(model.batchGuardrail.status).toBe('ready')
  })

  test('delivery risk gate uses the latest review for the same chapter and risk type', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        futureRoute: [
          {
            chapterNo: 8,
            title: '试炼前夜',
            chapterTask: '主角拿到试炼资格',
            conflict: '执事设局阻拦',
            endingHook: '阵盘亮起第二道裂纹',
            mainlineProgress: '进入外门试炼核心局',
            riskTags: [],
          },
          {
            chapterNo: 9,
            title: '阵盘裂纹',
            chapterTask: '阵盘异常暴露主角潜力',
            conflict: '同门围堵试探底牌',
            endingHook: '内门执事点名关注',
            mainlineProgress: '让宗门高层第一次注意主角',
            riskTags: [],
          },
          {
            chapterNo: 10,
            title: '外门震动',
            chapterTask: '试炼结果引发宗门震动',
            conflict: '旧秩序压制新晋黑马',
            endingHook: '内门招揽提出苛刻条件',
            mainlineProgress: '打开内门势力线',
            riskTags: [],
          },
        ],
      },
      writing: {
        ...baseWriting,
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
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
      reviews: [
        {
          id: 401,
          chapter_id: 7,
          review_type: 'chapter_core_drift',
          created_at: '2026-06-04T01:00:00.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            core_drift: { status: 'warn', drift_risks: ['主角长期欲望被支线盖住'] },
          }),
        },
        {
          id: 402,
          chapter_id: 7,
          review_type: 'chapter_core_drift',
          created_at: '2026-06-04T01:20:00.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            core_drift: { status: 'ok', drift_risks: [], risks: [], summary: '核心已回正' },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('ok')
    expect(model.deliveryRiskGate.totalOpen).toBe(0)
    expect(model.batchGuardrail.status).toBe('ready')
    expect(model.batchGuardrail.recommendedAction.key).toBe('start_safe_batch_generation')
  })

  test('delivery risk gate blocks safe batching for runway and volume beat risks', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        futureRoute: [
          {
            chapterNo: 8,
            title: '试炼前夜',
            chapterTask: '主角拿到试炼资格',
            conflict: '执事设局阻拦',
            endingHook: '阵盘亮起第二道裂纹',
            mainlineProgress: '进入外门试炼核心局',
            riskTags: [],
          },
          {
            chapterNo: 9,
            title: '阵盘裂纹',
            chapterTask: '阵盘异常暴露主角潜力',
            conflict: '同门围堵试探底牌',
            endingHook: '内门执事点名关注',
            mainlineProgress: '让宗门高层第一次注意主角',
            riskTags: [],
          },
          {
            chapterNo: 10,
            title: '外门震动',
            chapterTask: '试炼结果引发宗门震动',
            conflict: '旧秩序压制新晋黑马',
            endingHook: '内门招揽提出苛刻条件',
            mainlineProgress: '打开内门势力线',
            riskTags: [],
          },
        ],
      },
      writing: {
        ...baseWriting,
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
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
      reviews: [
        {
          id: 501,
          chapter_id: 7,
          review_type: 'runway_sync',
          created_at: '2026-06-04T01:00:00.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            runway_sync: {
              status: 'warn',
              risk_count: 2,
              label: '航线风险 2',
              four_question_missed: ['本章没有回答主角下一步方向'],
              redline_touched: ['临时支线压过阵法秩序主线'],
            },
          }),
        },
        {
          id: 502,
          chapter_id: 7,
          review_type: 'volume_beat_sync',
          created_at: '2026-06-04T01:01:00.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            volume_beat_sync: {
              status: 'warn',
              missed_count: 1,
              missed: ['卷级小高潮没有形成可见回报'],
            },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toEqual(expect.arrayContaining(['航线', '爆点']))
    expect(model.deliveryRiskGate.topRisks).toContain('航线第7章：本章没有回答主角下一步方向；临时支线压过阵法秩序主线')
    expect(model.batchGuardrail.status).toBe('blocked')
    expect(model.batchGuardrail.recommendedAction.key).toBe('create_delivery_risk_repair')
  })

  test('delivery risk gate releases volume beat risk when annotation repair uses beat alias', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        futureRoute: [
          {
            chapterNo: 8,
            title: '试炼前夜',
            chapterTask: '主角拿到试炼资格',
            conflict: '执事设局阻拦',
            endingHook: '阵盘亮起第二道裂纹',
            mainlineProgress: '进入外门试炼核心局',
            riskTags: [],
          },
          {
            chapterNo: 9,
            title: '阵盘裂纹',
            chapterTask: '阵盘异常暴露主角潜力',
            conflict: '同门围堵试探底牌',
            endingHook: '内门执事点名关注',
            mainlineProgress: '让宗门高层第一次注意主角',
            riskTags: [],
          },
          {
            chapterNo: 10,
            title: '外门震动',
            chapterTask: '试炼结果引发宗门震动',
            conflict: '旧秩序压制新晋黑马',
            endingHook: '内门招揽提出苛刻条件',
            mainlineProgress: '打开内门势力线',
            riskTags: [],
          },
        ],
      },
      writing: {
        ...baseWriting,
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
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
      chapters: [
        { id: 7, chapter_no: 7, title: '旧规反噬', chapter_text: '正文'.repeat(1500) },
      ],
      reviews: [
        {
          id: 502,
          chapter_id: 7,
          review_type: 'volume_beat_sync',
          created_at: '2026-06-04T01:01:00.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            volume_beat_sync: {
              status: 'warn',
              missed_count: 1,
              missed: ['卷级小高潮没有形成可见回报'],
            },
          }),
        },
        {
          id: 602,
          chapter_id: 7,
          review_type: 'prose_quality',
          created_at: '2026-06-04T02:10:00.000Z',
          payload: JSON.stringify({ score: 84, passed: true }),
        },
      ],
      runRecords: [
        {
          id: 701,
          run_type: 'longform_production_repair',
          created_at: '2026-06-04T02:00:00.000Z',
          status: 'completed',
          output_ref: JSON.stringify({
            tasks: [
              {
                source: 'review_annotation_risk',
                task_type: 'repair_quality',
                issue_type: 'volume_beat_missed',
                task_status: 'resolved',
                chapter_id: 7,
                chapter_no: 7,
              },
            ],
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('ok')
    expect(model.deliveryRiskGate.totalOpen).toBe(0)
    expect(model.batchGuardrail.status).toBe('ready')
    expect(model.batchGuardrail.recommendedAction.key).toBe('start_safe_batch_generation')
  })

  test('delivery risk gate explains why repaired risks no longer block safe batching', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        futureRoute: [
          {
            chapterNo: 8,
            title: '试炼前夜',
            chapterTask: '主角拿到试炼资格',
            conflict: '执事设局阻拦',
            endingHook: '阵盘亮起第二道裂纹',
            mainlineProgress: '进入外门试炼核心局',
            riskTags: [],
          },
          {
            chapterNo: 9,
            title: '阵盘裂纹',
            chapterTask: '阵盘异常暴露主角潜力',
            conflict: '同门围堵试探底牌',
            endingHook: '内门执事点名关注',
            mainlineProgress: '让宗门高层第一次注意主角',
            riskTags: [],
          },
          {
            chapterNo: 10,
            title: '外门震动',
            chapterTask: '试炼结果引发宗门震动',
            conflict: '旧秩序压制新晋黑马',
            endingHook: '内门招揽提出苛刻条件',
            mainlineProgress: '打开内门势力线',
            riskTags: [],
          },
        ],
      },
      writing: {
        ...baseWriting,
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
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
      chapters: [
        { id: 7, chapter_no: 7, title: '旧规反噬', chapter_text: '正文'.repeat(1500) },
      ],
      reviews: [
        {
          id: 502,
          chapter_id: 7,
          review_type: 'volume_beat_sync',
          created_at: '2026-06-04T01:01:00.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            volume_beat_sync: {
              status: 'warn',
              missed_count: 1,
              missed: ['卷级小高潮没有形成可见回报'],
            },
          }),
        },
        {
          id: 602,
          chapter_id: 7,
          review_type: 'prose_quality',
          created_at: '2026-06-04T02:10:00.000Z',
          payload: JSON.stringify({ score: 84, passed: true }),
        },
      ],
      runRecords: [
        {
          id: 701,
          run_type: 'longform_production_repair',
          created_at: '2026-06-04T02:00:00.000Z',
          status: 'completed',
          output_ref: JSON.stringify({
            tasks: [
              {
                source: 'review_annotation_risk',
                task_type: 'repair_quality',
                issue_type: 'volume_beat_missed',
                task_status: 'resolved',
                chapter_id: 7,
                chapter_no: 7,
              },
            ],
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('ok')
    expect((model.deliveryRiskGate as any).recentlyResolved).toEqual([
      expect.objectContaining({
        label: '任务修复已清',
        count: 1,
        chapterNos: [7],
        issueTypes: ['volume_beat_missed'],
      }),
    ])
    expect((model.deliveryRiskGate as any).recentlyResolved[0].detail).toContain('第7章')
    expect((model.deliveryRiskGate as any).recentlyResolved[0].detail).toContain('爆点')
    expect((model.deliveryRiskGate as any).recentlyResolved[0].detail).toContain('复检通过')
  })

  test('delivery risk gate blocks safe batching for unresolved reader expectation debt', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        futureRoute: [
          {
            chapterNo: 8,
            title: '试炼前夜',
            chapterTask: '主角拿到试炼资格',
            conflict: '执事设局阻拦',
            endingHook: '阵盘亮起第二道裂纹',
            mainlineProgress: '进入外门试炼核心局',
            riskTags: [],
          },
          {
            chapterNo: 9,
            title: '阵盘裂纹',
            chapterTask: '阵盘异常暴露主角潜力',
            conflict: '同门围堵试探底牌',
            endingHook: '内门执事点名关注',
            mainlineProgress: '让宗门高层第一次注意主角',
            riskTags: [],
          },
          {
            chapterNo: 10,
            title: '外门震动',
            chapterTask: '试炼结果引发宗门震动',
            conflict: '旧秩序压制新晋黑马',
            endingHook: '内门招揽提出苛刻条件',
            mainlineProgress: '打开内门势力线',
            riskTags: [],
          },
        ],
      },
      writing: {
        ...baseWriting,
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
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
      reviews: [
        {
          id: 601,
          chapter_id: 7,
          review_type: 'reader_expectation_sync',
          created_at: '2026-06-04T01:00:00.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            reader_expectation_sync: {
              status: 'warn',
              missed_count: 2,
              label: '期待欠账 2',
              missed: ['没有回应阵盘第二道裂纹', '没有承接执事背后供奉悬念'],
            },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('期待')
    expect(model.deliveryRiskGate.topRisks).toContain('期待第7章：没有回应阵盘第二道裂纹；没有承接执事背后供奉悬念')
    expect(model.batchGuardrail.status).toBe('blocked')
    expect(model.batchGuardrail.recommendedAction.key).toBe('create_delivery_risk_repair')
  })

  test('delivery risk gate releases opening handoff and readability subtype repairs after recheck', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        futureRoute: [
          {
            chapterNo: 9,
            title: '阵盘裂纹',
            chapterTask: '阵盘异常暴露主角潜力',
            conflict: '同门围堵试探底牌',
            endingHook: '内门执事点名关注',
            mainlineProgress: '让宗门高层第一次注意主角',
            riskTags: [],
          },
          {
            chapterNo: 10,
            title: '外门震动',
            chapterTask: '试炼结果引发宗门震动',
            conflict: '旧秩序压制新晋黑马',
            endingHook: '内门招揽提出苛刻条件',
            mainlineProgress: '打开内门势力线',
            riskTags: [],
          },
          {
            chapterNo: 11,
            title: '内门来人',
            chapterTask: '内门势力抛出招揽条件',
            conflict: '招揽背后附带夺阵盘的暗线',
            endingHook: '内门令牌落在桌上',
            mainlineProgress: '主角进入内门视野',
            riskTags: [],
          },
        ],
      },
      writing: {
        ...baseWriting,
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [
            { title: '承接裂纹', goal: '开篇接住上一章阵盘裂纹危机' },
            { title: '内门施压', goal: '把招揽条件变成现场压迫' },
          ],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
      chapters: [
        { id: 8, chapter_no: 8, title: '试炼前夜', chapter_text: '正文'.repeat(1500) },
      ],
      reviews: [
        {
          id: 801,
          chapter_id: 8,
          review_type: 'reader_expectation_sync',
          created_at: '2026-06-04T01:00:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            reader_expectation_sync: {
              status: 'warn',
              missed_count: 1,
              missed: [
                {
                  key: 'opening_handoff',
                  label: '上一章承接',
                  match_scope: 'opening',
                  text: '阵盘第二道裂纹必须在开篇造成可见压力。',
                },
              ],
            },
          }),
        },
        {
          id: 802,
          chapter_id: 8,
          review_type: 'readability_review',
          created_at: '2026-06-04T01:01:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            readability_review: {
              status: 'warn',
              readability_score: 84,
              opening_hook_score: 52,
              meme_sense: { intensity: '轻度', immersion_risks: [] },
            },
          }),
        },
        {
          id: 803,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-04T02:10:00.000Z',
          payload: JSON.stringify({ score: 85, passed: true }),
        },
      ],
      runRecords: [
        {
          id: 901,
          run_type: 'longform_production_repair',
          created_at: '2026-06-04T02:00:00.000Z',
          status: 'completed',
          output_ref: JSON.stringify({
            tasks: [
              {
                source: 'review_annotation_risk',
                task_type: 'repair_quality',
                issue_type: 'opening_handoff_debt',
                task_status: 'resolved',
                chapter_id: 8,
                chapter_no: 8,
              },
              {
                source: 'review_annotation_risk',
                task_type: 'repair_quality',
                issue_type: 'opening_pull_risk',
                task_status: 'resolved',
                chapter_id: 8,
                chapter_no: 8,
              },
            ],
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('ok')
    expect(model.deliveryRiskGate.totalOpen).toBe(0)
    expect(model.batchGuardrail.status).toBe('ready')
    expect(model.batchGuardrail.recommendedAction.key).toBe('start_safe_batch_generation')
  })

  test('holds delivered safe batch when quality radar finds core, payoff, or storyline risks', () => {
    const deliveredBatchInput = {
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        futureRoute: [
          { chapterNo: 11, title: '内门来人', chapterTask: '内门势力抛出招揽条件', conflict: '招揽背后附带夺阵盘的暗线', endingHook: '内门令牌落在桌上', mainlineProgress: '主角进入内门视野' },
          { chapterNo: 12, title: '令牌代价', chapterTask: '主角试探令牌真实代价', conflict: '旧执事借规矩继续施压', endingHook: '令牌背面浮出血字', mainlineProgress: '宗门规矩开始反噬旧秩序' },
          { chapterNo: 13, title: '阵盘回响', chapterTask: '阵盘回应内门试探', conflict: '阵盘力量暴露与隐藏身份冲突', endingHook: '暗处长老认出阵纹', mainlineProgress: '阵法天赋进入高层视线' },
        ],
      },
      writing: {
        ...baseWriting,
        nextChapter: { ...baseWriting.nextChapter, id: 11, chapterNo: 11, title: '内门来人' },
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [
            { title: '余波清算', goal: '试炼结果引发宗门震动' },
            { title: '内门招揽', goal: '新势力提出条件' },
          ],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 10 },
      chapters: [
        { id: 8, chapter_no: 8, title: '试炼前夜', chapter_text: '正文'.repeat(1600) },
        { id: 9, chapter_no: 9, title: '阵盘裂纹', chapter_text: '正文'.repeat(1550) },
        { id: 10, chapter_no: 10, title: '外门震动', chapter_text: '正文'.repeat(1510) },
      ],
      reviews: [
        { id: 101, chapter_id: 8, review_type: 'prose_quality', created_at: '2026-06-03T01:00:00.000Z', payload: JSON.stringify({ score: 82, passed: true }) },
        { id: 102, chapter_id: 9, review_type: 'prose_quality', created_at: '2026-06-03T01:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 103, chapter_id: 10, review_type: 'prose_quality', created_at: '2026-06-03T01:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
        { id: 201, chapter_id: 9, review_type: 'chapter_core_drift', created_at: '2026-06-03T01:03:00.000Z', payload: JSON.stringify({ core_drift: { status: 'warn', score: 70, drift_risks: ['主线推进不足'] } }) },
        { id: 202, chapter_id: 10, review_type: 'reader_payoff_sync', created_at: '2026-06-03T01:04:00.000Z', payload: JSON.stringify({ reader_payoff_sync: { status: 'warn', debt_count: 2, missed: ['阵盘反噬回报', '内门压力'] } }) },
        { id: 203, chapter_id: 10, review_type: 'storyline_sync', created_at: '2026-06-03T01:05:00.000Z', payload: JSON.stringify({ storyline_sync: { status: 'warn', missed: ['内门线推进'], forbidden_touched: ['幕后主使'] } }) },
      ],
      runRecords: [
        {
          id: 10,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-03T00:00:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({ source: 'auto_creation_safe_batch', safety_limit: 3 }),
          output_ref: JSON.stringify({
            total: 3,
            success: 3,
            failed: 0,
            chapters: [
              { id: 8, chapter_no: 8, title: '试炼前夜', status: 'success', score: 82, word_count: 3180 },
              { id: 9, chapter_no: 9, title: '阵盘裂纹', status: 'success', score: 85, word_count: 3090 },
              { id: 10, chapter_no: 10, title: '外门震动', status: 'success', score: 86, word_count: 3021 },
            ],
          }),
        },
      ],
    } as any
    const model = buildAutoCreationDirectorModel(deliveredBatchInput)

    expect(model.batchReviewQueue.status).toBe('risk')
    expect(model.batchReviewQueue.riskRadar.status).toBe('warn')
    expect(model.batchReviewQueue.riskRadar.coreRiskCount).toBe(1)
    expect(model.batchReviewQueue.riskRadar.payoffDebtCount).toBe(2)
    expect(model.batchReviewQueue.riskRadar.storylineRiskCount).toBe(2)
    expect(model.batchReviewQueue.riskRadar.repairTasks.map((task: any) => task.issue_type)).toEqual([
      'core_drift',
      'reader_payoff_debt',
      'storyline_sync_risk',
    ])
    expect(model.status).toBe('needs_acceptance')
    expect(model.statusLabel).toBe('批次有风险')
    expect(model.mainAction.key).toBe('create_safe_batch_risk_repair')
    expect(model.mainAction.modelCall).toBe(false)
    expect(model.confirmations).toContain('安全连写批次存在质量风险')
    expect(model.batchReviewQueue.completionDashboard.status).toBe('needs_repair')
    expect(model.batchReviewQueue.completionDashboard.score).toBeLessThan(80)
    expect(model.batchReviewQueue.completionDashboard.summary).toContain('先修复')
    expect(model.batchReviewQueue.completionDashboard.nextAction.key).toBe('create_safe_batch_risk_repair')
    expect(model.batchReviewQueue.handoff.status).toBe('repair_risks')
    expect(model.batchReviewQueue.handoff.label).toBe('修复批次风险')
    expect(model.batchReviewQueue.handoff.action.key).toBe('create_safe_batch_risk_repair')
    expect(model.batchReviewQueue.handoff.riskLabels).toEqual(expect.arrayContaining(['核心偏移', '回报欠账', '剧情线']))
    expect(model.batchReviewQueue.completionDashboard.metrics.find(metric => metric.key === 'quality')?.status).toBe('warn')
    expect(model.batchReviewQueue.completionDashboard.metrics.find(metric => metric.key === 'plan')?.status).toBe('warn')
  })

  test('holds delivered safe batch when chapter handoff contract is missed in the opening', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
      },
      writing: {
        ...baseWriting,
        nextChapter: { ...baseWriting.nextChapter, id: 11, chapterNo: 11, title: '内门来人' },
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '内门招揽', goal: '新势力提出条件' }],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 10 },
      chapters: [
        { id: 8, chapter_no: 8, title: '试炼前夜', chapter_text: '正文'.repeat(1600) },
        { id: 9, chapter_no: 9, title: '阵盘裂纹', chapter_text: '正文'.repeat(1550) },
        { id: 10, chapter_no: 10, title: '外门震动', chapter_text: '正文'.repeat(1510) },
      ],
      reviews: [
        { id: 101, chapter_id: 8, review_type: 'prose_quality', created_at: '2026-06-03T01:00:00.000Z', payload: JSON.stringify({ score: 84, passed: true }) },
        { id: 102, chapter_id: 9, review_type: 'prose_quality', created_at: '2026-06-03T01:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 103, chapter_id: 10, review_type: 'prose_quality', created_at: '2026-06-03T01:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
        {
          id: 301,
          chapter_id: 10,
          review_type: 'reader_expectation_sync',
          created_at: '2026-06-03T01:03:00.000Z',
          payload: JSON.stringify({
            reader_expectation_sync: {
              status: 'warn',
              missed_count: 1,
              missed: [
                {
                  key: 'opening_handoff',
                  label: '上一章承接',
                  match_scope: 'opening',
                  text: '阵盘第二道裂纹必须在开篇造成可见压力。',
                },
              ],
              keep_alive: ['是谁在背后改试炼规则'],
            },
          }),
        },
      ],
      runRecords: [
        {
          id: 10,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-03T00:00:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({
            source: 'auto_creation_safe_batch',
            safety_limit: 3,
            chapter_handoff_contract: {
              previous_chapter_no: 9,
              current_chapter_no: 10,
              opening_must_land: '阵盘第二道裂纹必须在开篇造成可见压力。',
              keep_alive: ['是谁在背后改试炼规则'],
            },
          }),
          output_ref: JSON.stringify({
            total: 3,
            success: 3,
            failed: 0,
            chapters: [
              { id: 8, chapter_no: 8, title: '试炼前夜', status: 'success', score: 84, word_count: 3180 },
              { id: 9, chapter_no: 9, title: '阵盘裂纹', status: 'success', score: 85, word_count: 3090 },
              { id: 10, chapter_no: 10, title: '外门震动', status: 'success', score: 86, word_count: 3021 },
            ],
          }),
        },
      ],
    } as any)

    expect(model.batchReviewQueue.status).toBe('risk')
    expect(model.batchReviewQueue.riskRadar.status).toBe('warn')
    expect((model.batchReviewQueue.riskRadar as any).handoffRiskCount).toBe(1)
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'handoff')?.label).toBe('章节交接')
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'handoff')?.detail).toContain('上一章承接')
    expect(model.batchReviewQueue.riskRadar.repairTasks.map((task: any) => task.issue_type)).toContain('chapter_handoff_missed')
    const handoffTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'chapter_handoff_missed')
    expect(handoffTask?.chapter_handoff_review?.missed.map((item: any) => item.label)).toContain('上一章承接')
    expect(model.batchReviewQueue.handoff.riskLabels).toContain('章节交接')
  })

  test('holds delivered safe batch when generated chapters miss the next batch brief', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
      },
      writing: {
        ...baseWriting,
        nextChapter: { ...baseWriting.nextChapter, id: 11, chapterNo: 11, title: '内门来人' },
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '内门招揽', goal: '新势力提出条件' }],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 10 },
      chapters: [
        { id: 8, chapter_no: 8, title: '试炼前夜', chapter_text: '正文'.repeat(1600) },
        { id: 9, chapter_no: 9, title: '阵盘裂纹', chapter_text: '正文'.repeat(1550) },
        { id: 10, chapter_no: 10, title: '外门震动', chapter_text: '正文'.repeat(1510) },
      ],
      reviews: [
        { id: 101, chapter_id: 8, review_type: 'prose_quality', created_at: '2026-06-03T01:00:00.000Z', payload: JSON.stringify({ score: 84, passed: true }) },
        { id: 102, chapter_id: 9, review_type: 'prose_quality', created_at: '2026-06-03T01:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 103, chapter_id: 10, review_type: 'prose_quality', created_at: '2026-06-03T01:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
        { id: 202, chapter_id: 9, review_type: 'reader_payoff_sync', created_at: '2026-06-03T01:04:00.000Z', payload: JSON.stringify({ reader_payoff_sync: { status: 'warn', debt_count: 1, missed: ['阵盘反噬回报'] } }) },
        { id: 203, chapter_id: 10, review_type: 'storyline_sync', created_at: '2026-06-03T01:05:00.000Z', payload: JSON.stringify({ storyline_sync: { status: 'warn', missed: ['进入内门视野'] } }) },
      ],
      runRecords: [
        {
          id: 10,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-03T00:00:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({
            source: 'auto_creation_safe_batch',
            safety_limit: 3,
            next_batch_brief: {
              chapterRangeLabel: '第8-10章',
              batchGoal: '三章内进入内门视野。',
              readerPayoffPlan: '升级、打脸、规则反制逐章交付。',
              mainlineFocus: '外门危机 -> 内门招揽',
              forbiddenBoundary: '第10章前不得揭露规则源头。',
              chapters: [
                { chapterNo: 8, title: '试炼前夜', chapterTask: '试炼压迫落地。' },
                { chapterNo: 9, title: '阵盘裂纹', chapterTask: '兑现阵盘反噬回报。' },
                { chapterNo: 10, title: '外门震动', chapterTask: '推进到内门视野。' },
              ],
            },
          }),
          output_ref: JSON.stringify({
            total: 3,
            success: 3,
            failed: 0,
            chapters: [
              { id: 8, chapter_no: 8, title: '试炼前夜', status: 'success', score: 84, word_count: 3180 },
              { id: 9, chapter_no: 9, title: '阵盘裂纹', status: 'success', score: 85, word_count: 3090 },
              { id: 10, chapter_no: 10, title: '外门震动', status: 'success', score: 86, word_count: 3021 },
            ],
          }),
        },
      ],
    } as any)

    expect(model.batchReviewQueue.status).toBe('risk')
    expect(model.batchReviewQueue.riskRadar.batchPlanRiskCount).toBe(2)
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'batch_plan')?.detail).toContain('连载计划')
    expect(model.batchReviewQueue.riskRadar.repairTasks.map((task: any) => task.issue_type)).toContain('batch_brief_mismatch')
    const batchTasks = model.batchReviewQueue.riskRadar.repairTasks.filter((task: any) => task.issue_type === 'batch_brief_mismatch')
    const chapter9Task = batchTasks.find((task: any) => Number(task.chapter_no) === 9)
    const chapter10Task = batchTasks.find((task: any) => Number(task.chapter_no) === 10)
    expect(chapter9Task?.batch_plan_context?.batch_goal).toContain('三章内进入内门视野')
    expect(chapter9Task?.batch_plan_context?.reader_payoff_plan).toContain('升级')
    expect(chapter9Task?.batch_plan_context?.chapter_plan?.chapter_task).toContain('阵盘反噬回报')
    expect(chapter9Task?.batch_plan_review?.planned).toContain('本章职责：兑现阵盘反噬回报。')
    expect(chapter9Task?.batch_plan_review?.missed).toContain('阵盘反噬回报')
    expect(chapter9Task?.batch_plan_review?.actual_risks.join('；')).toContain('回报欠账：阵盘反噬回报')
    expect(chapter10Task?.batch_plan_review?.missed).toContain('进入内门视野')
    expect(chapter10Task?.batch_plan_review?.actual_risks.join('；')).toContain('剧情线漏推：进入内门视野')
    expect(model.mainAction.key).toBe('create_safe_batch_risk_repair')
  })

  test('scores delivered safe batch against the batch start checklist', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
      },
      writing: {
        ...baseWriting,
        nextChapter: { ...baseWriting.nextChapter, id: 11, chapterNo: 11, title: '内门来人' },
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '内门招揽', goal: '新势力提出条件' }],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 10 },
      chapters: [
        { id: 8, chapter_no: 8, title: '试炼前夜', chapter_text: '正文'.repeat(1600) },
        { id: 9, chapter_no: 9, title: '阵盘裂纹', chapter_text: '正文'.repeat(1550) },
        { id: 10, chapter_no: 10, title: '外门震动', chapter_text: '正文'.repeat(1510) },
      ],
      reviews: [
        { id: 101, chapter_id: 8, review_type: 'prose_quality', created_at: '2026-06-03T01:00:00.000Z', payload: JSON.stringify({ score: 84, passed: true }) },
        { id: 102, chapter_id: 9, review_type: 'prose_quality', created_at: '2026-06-03T01:01:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
        { id: 103, chapter_id: 10, review_type: 'prose_quality', created_at: '2026-06-03T01:02:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 201, chapter_id: 8, review_type: 'chapter_core_drift', created_at: '2026-06-03T01:03:00.000Z', payload: JSON.stringify({ chapter_core_drift: { status: 'warn', drift_risks: ['寒门逆袭承诺没有被试炼结果兑现'] } }) },
        { id: 202, chapter_id: 9, review_type: 'story_drive_sync', created_at: '2026-06-03T01:04:00.000Z', payload: JSON.stringify({ story_drive_sync: { status: 'warn', missed_count: 1, missed: ['主角没有主动选择代价'] } }) },
        { id: 203, chapter_id: 9, review_type: 'reader_payoff_sync', created_at: '2026-06-03T01:05:00.000Z', payload: JSON.stringify({ reader_payoff_sync: { status: 'warn', debt_count: 1, missed: ['升级+打脸回报不足'] } }) },
        { id: 204, chapter_id: 10, review_type: 'innovation_sync', created_at: '2026-06-03T01:06:00.000Z', payload: JSON.stringify({ innovation_sync: { status: 'warn', missed_count: 1, missed: ['阵法反压宗门秩序的记忆点不够'] } }) },
        { id: 205, chapter_id: 10, review_type: 'storyline_sync', created_at: '2026-06-03T01:07:00.000Z', payload: JSON.stringify({ storyline_sync: { status: 'warn', forbidden_touched: ['第10章前提前揭露规则源头'] } }) },
      ],
      runRecords: [
        {
          id: 10,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-03T00:00:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({
            source: 'auto_creation_safe_batch',
            safety_limit: 3,
            next_batch_brief: {
              chapterRangeLabel: '第8-10章',
              batchGoal: '三章内进入内门视野。',
              readerPayoffPlan: '升级、打脸、规则反制逐章交付。',
              mainlineFocus: '外门危机 -> 内门招揽',
              forbiddenBoundary: '第10章前不得揭露规则源头。',
              startChecklist: [
                { key: 'core_promise', label: '核心承诺', status: 'ok', detail: '寒门少年以阵法反压宗门秩序。' },
                { key: 'story_drive', label: '故事驱动力', status: 'ok', detail: '主角必须主动承担试炼代价。' },
                { key: 'reader_payoff', label: '读者回报', status: 'ok', detail: '升级+打脸回报必须逐章可见。' },
                { key: 'innovation', label: '创新/IP记忆点', status: 'ok', detail: '阵法反压宗门秩序要形成可复述场面。' },
                { key: 'forbidden_boundary', label: '禁写边界', status: 'ok', detail: '第10章前不得揭露规则源头。' },
              ],
              chapters: [
                { chapterNo: 8, title: '试炼前夜', chapterTask: '试炼压迫落地。' },
                { chapterNo: 9, title: '阵盘裂纹', chapterTask: '兑现阵盘反噬回报。' },
                { chapterNo: 10, title: '外门震动', chapterTask: '推进到内门视野。' },
              ],
            },
          }),
          output_ref: JSON.stringify({
            total: 3,
            success: 3,
            failed: 0,
            chapters: [
              { id: 8, chapter_no: 8, title: '试炼前夜', status: 'success', score: 84, word_count: 3180 },
              { id: 9, chapter_no: 9, title: '阵盘裂纹', status: 'success', score: 86, word_count: 3090 },
              { id: 10, chapter_no: 10, title: '外门震动', status: 'success', score: 85, word_count: 3021 },
            ],
          }),
        },
      ],
    } as any)

    expect(model.batchReviewQueue.status).toBe('risk')
    expect(model.batchReviewQueue.riskRadar.checklistExecution.visible).toBe(true)
    expect(model.batchReviewQueue.riskRadar.checklistExecution.status).toBe('warn')
    expect(model.batchReviewQueue.riskRadar.checklistExecution.score).toBeLessThan(70)
    expect(model.batchReviewQueue.riskRadar.checklistExecution.items.map(item => item.key)).toEqual([
      'core_promise',
      'story_drive',
      'reader_payoff',
      'innovation',
      'forbidden_boundary',
    ])
    expect(model.batchReviewQueue.riskRadar.checklistExecution.items.every(item => item.status === 'warn')).toBe(true)
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'batch_checklist')?.detail).toContain('开工清单')
    expect(model.batchReviewQueue.riskRadar.batchChecklistRiskCount).toBe(5)
    expect(model.batchReviewQueue.riskRadar.repairTasks.map((task: any) => task.issue_type)).toContain('batch_checklist_mismatch')
    const checklistTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'batch_checklist_mismatch')
    expect(checklistTask?.batch_checklist_execution?.missed.map((item: any) => item.label)).toEqual([
      '核心承诺',
      '故事驱动力',
      '读者回报',
      '创新/IP记忆点',
      '禁写边界',
    ])
    expect(model.batchReviewQueue.handoff.riskLabels).toContain('开工清单')
    expect(model.batchReviewQueue.completionDashboard.metrics.find(metric => metric.key === 'checklist')?.status).toBe('warn')
  })

  test('holds delivered safe batch when serial rhythm repeats across the generated batch', () => {
    const repeatedText = '执事逼主角交出阵盘，主角用阵盘反噬打脸，章末黑影盯上阵盘。'
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
      },
      writing: {
        ...baseWriting,
        nextChapter: { ...baseWriting.nextChapter, id: 11, chapterNo: 11, title: '内门来人' },
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '内门招揽', goal: '新势力提出条件' }],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 10 },
      chapters: [
        { id: 8, chapter_no: 8, title: '试炼前夜', chapter_text: repeatedText.repeat(80), conflict: '执事逼主角交出阵盘', raw_payload: { payoff: '阵盘反噬打脸', ending_hook: '黑影盯上阵盘' } },
        { id: 9, chapter_no: 9, title: '阵盘裂纹', chapter_text: repeatedText.repeat(80), conflict: '执事逼主角交出阵盘', raw_payload: { payoff: '阵盘反噬打脸', ending_hook: '黑影盯上阵盘' } },
        { id: 10, chapter_no: 10, title: '外门震动', chapter_text: repeatedText.repeat(80), conflict: '执事逼主角交出阵盘', raw_payload: { payoff: '阵盘反噬打脸', ending_hook: '黑影盯上阵盘' } },
      ],
      reviews: [
        { id: 101, chapter_id: 8, review_type: 'prose_quality', created_at: '2026-06-03T01:00:00.000Z', payload: JSON.stringify({ score: 84, passed: true }) },
        { id: 102, chapter_id: 9, review_type: 'prose_quality', created_at: '2026-06-03T01:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 103, chapter_id: 10, review_type: 'prose_quality', created_at: '2026-06-03T01:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
      ],
      runRecords: [
        {
          id: 10,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-03T00:00:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({
            source: 'auto_creation_safe_batch',
            safety_limit: 3,
            next_batch_brief: {
              chapterRangeLabel: '第8-10章',
              batchGoal: '三章内制造外门压迫并推到内门视野。',
              readerPayoffPlan: '逐章给出不同形态的规则反制回报。',
              mainlineFocus: '外门危机 -> 内门招揽',
              chapters: [
                { chapterNo: 8, title: '试炼前夜', chapterTask: '执事逼交阵盘。', conflict: '执事逼主角交出阵盘', endingHook: '黑影盯上阵盘' },
                { chapterNo: 9, title: '阵盘裂纹', chapterTask: '执事逼交阵盘。', conflict: '执事逼主角交出阵盘', endingHook: '黑影盯上阵盘' },
                { chapterNo: 10, title: '外门震动', chapterTask: '执事逼交阵盘。', conflict: '执事逼主角交出阵盘', endingHook: '黑影盯上阵盘' },
              ],
            },
          }),
          output_ref: JSON.stringify({
            total: 3,
            success: 3,
            failed: 0,
            chapters: [
              { id: 8, chapter_no: 8, title: '试炼前夜', status: 'success', score: 84, word_count: 3180 },
              { id: 9, chapter_no: 9, title: '阵盘裂纹', status: 'success', score: 85, word_count: 3090 },
              { id: 10, chapter_no: 10, title: '外门震动', status: 'success', score: 86, word_count: 3021 },
            ],
          }),
        },
      ],
    } as any)

    expect(model.batchReviewQueue.status).toBe('risk')
    expect(model.batchReviewQueue.riskRadar.status).toBe('warn')
    expect(model.batchReviewQueue.riskRadar.serialRhythmRiskCount).toBeGreaterThanOrEqual(2)
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'serial_rhythm')?.detail).toContain('冲突')
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'serial_rhythm')?.detail).toContain('章末')
    expect(model.batchReviewQueue.riskRadar.repairTasks.map((task: any) => task.issue_type)).toContain('serial_rhythm_fatigue')
    const rhythmTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'serial_rhythm_fatigue')
    expect(rhythmTask?.serial_rhythm_review?.risks.join('；')).toContain('执事逼主角交出阵盘')
    expect(rhythmTask?.action).toContain('轮换')
    expect(model.batchReviewQueue.handoff.riskLabels).toContain('连载节奏')
    expect(model.mainAction.key).toBe('create_safe_batch_risk_repair')
  })

  test('holds delivered safe batch when newly discovered assets exceed the batch growth budget', () => {
    const discovered = [
      { entity_type: 'character', name: '周执事' },
      { entity_type: 'character', name: '灰袍少年' },
      { entity_type: 'item', name: '裂纹阵盘' },
      { entity_type: 'item', name: '黑铁令' },
      { entity_type: 'ability', name: '夜阵感知' },
      { entity_type: 'faction', name: '外门戒律堂' },
      { entity_type: 'location', name: '夜钟台' },
      { entity_type: 'foreshadowing', name: '黑影观阵' },
    ]
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
      },
      writing: {
        ...baseWriting,
        nextChapter: { ...baseWriting.nextChapter, id: 11, chapterNo: 11, title: '内门来人' },
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '内门招揽', goal: '新势力提出条件' }],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 10 },
      chapters: [
        { id: 8, chapter_no: 8, title: '试炼前夜', chapter_text: '压迫与试炼'.repeat(500), conflict: '执事设局阻拦', raw_payload: { payoff: '拿到试炼资格', ending_hook: '夜钟第一次响起' } },
        { id: 9, chapter_no: 9, title: '阵盘裂纹', chapter_text: '阵盘与反噬'.repeat(500), conflict: '阵盘暴露风险', raw_payload: { payoff: '反制阵盘陷阱', ending_hook: '裂纹浮出新阵纹' } },
        { id: 10, chapter_no: 10, title: '外门震动', chapter_text: '宗门震动'.repeat(500), conflict: '外门众人抢功', raw_payload: { payoff: '内门长老注意主角', ending_hook: '内门令牌落下' } },
      ],
      reviews: [
        { id: 101, chapter_id: 8, review_type: 'prose_quality', created_at: '2026-06-03T01:00:00.000Z', payload: JSON.stringify({ score: 84, passed: true }) },
        { id: 102, chapter_id: 9, review_type: 'prose_quality', created_at: '2026-06-03T01:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 103, chapter_id: 10, review_type: 'prose_quality', created_at: '2026-06-03T01:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
        { id: 301, chapter_id: 8, review_type: 'asset_intake', created_at: '2026-06-03T01:03:00.000Z', payload: JSON.stringify({ chapter_id: 8, chapter_no: 8, discovered_assets: discovered.slice(0, 3), applied_asset_names: [] }) },
        { id: 302, chapter_id: 9, review_type: 'asset_intake', created_at: '2026-06-03T01:04:00.000Z', payload: JSON.stringify({ chapter_id: 9, chapter_no: 9, discovered_assets: discovered.slice(3, 6), applied_asset_names: [] }) },
        { id: 303, chapter_id: 10, review_type: 'asset_intake', created_at: '2026-06-03T01:05:00.000Z', payload: JSON.stringify({ chapter_id: 10, chapter_no: 10, discovered_assets: discovered.slice(6), applied_asset_names: [] }) },
      ],
      runRecords: [
        {
          id: 10,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-03T00:00:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({ source: 'auto_creation_safe_batch', safety_limit: 3 }),
          output_ref: JSON.stringify({
            total: 3,
            success: 3,
            failed: 0,
            chapters: [
              { id: 8, chapter_no: 8, title: '试炼前夜', status: 'success', score: 84, word_count: 3180 },
              { id: 9, chapter_no: 9, title: '阵盘裂纹', status: 'success', score: 85, word_count: 3090 },
              { id: 10, chapter_no: 10, title: '外门震动', status: 'success', score: 86, word_count: 3021 },
            ],
          }),
        },
      ],
    } as any)

    expect(model.batchReviewQueue.status).toBe('risk')
    expect(model.batchReviewQueue.riskRadar.assetGrowthRiskCount).toBeGreaterThan(0)
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'asset_growth')?.detail).toContain('新资产')
    expect(model.batchReviewQueue.riskRadar.repairTasks.map((task: any) => task.issue_type)).toContain('asset_growth_over_budget')
    const assetTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'asset_growth_over_budget')
    expect(assetTask?.task_type).toBe('repair_assets')
    expect(assetTask?.asset_growth_review?.pending_assets.map((asset: any) => asset.name)).toContain('裂纹阵盘')
    expect(assetTask?.action).toContain('确认入库、改名、合并已有或标记一次性过场')
    expect(model.batchReviewQueue.handoff.riskLabels).toContain('新资产')
  })

  test('holds delivered safe batch when volume segment objectives are missed', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          currentStage: '试炼收束',
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        mainline: {
          ...basePlanning.mainline,
          currentVolumeGoal: '进入内门视野',
          currentStageConflict: '外门试炼必须结算身份变化',
        },
        volumeSegmentGate: {
          status: 'needs_attention',
          score: 66,
          label: '卷段待修 66',
          summary: '当前卷段的身份变化和内门视野还没有完成阶段验收。',
          currentSegmentLabel: '第1-50章',
          actionKey: 'open_quality_revision',
          chapterProgress: { written: 20, total: 50, percent: 40 },
          signals: [
            { key: 'volume_goal', label: '阶段目标', status: 'ok', score: 88, count: 0, detail: '当前卷目标：进入内门视野', actionKey: 'enter_chapter_writing' },
            { key: 'climax_payoff', label: '高潮/回报', status: 'warn', score: 62, count: 2, detail: '阶段身份变化和内门令牌入场未结算。', actionKey: 'open_quality_revision' },
          ],
          nextActions: ['补齐外门试炼收束、身份变化和内门令牌入场，再开启下一批。'],
        },
      },
      writing: {
        ...baseWriting,
        nextChapter: { ...baseWriting.nextChapter, id: 21, chapterNo: 21, title: '内门来人' },
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '内门招揽', goal: '新势力提出条件' }],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 20 },
      chapters: [
        { id: 18, chapter_no: 18, title: '试炼终局', chapter_text: '试炼冲突'.repeat(500), raw_payload: { mainline_progress: '击退外门刁难' } },
        { id: 19, chapter_no: 19, title: '旧账翻涌', chapter_text: '旧账翻涌'.repeat(500), raw_payload: { mainline_progress: '执事暂退' } },
        { id: 20, chapter_no: 20, title: '钟声之后', chapter_text: '钟声之后'.repeat(500), raw_payload: { mainline_progress: '试炼余波未定' } },
      ],
      reviews: [
        { id: 101, chapter_id: 18, review_type: 'prose_quality', created_at: '2026-06-03T01:00:00.000Z', payload: JSON.stringify({ score: 84, passed: true }) },
        { id: 102, chapter_id: 19, review_type: 'prose_quality', created_at: '2026-06-03T01:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 103, chapter_id: 20, review_type: 'prose_quality', created_at: '2026-06-03T01:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
        {
          id: 401,
          chapter_id: 20,
          review_type: 'volume_beat_sync',
          created_at: '2026-06-03T01:05:00.000Z',
          payload: JSON.stringify({
            volume_beat_sync: {
              status: 'warn',
              label: '卷段漏兑现 2',
              missed_count: 2,
              missed: [
                { label: '内门令牌入场', text: '第20章应让内门令牌或同等身份入口落地。' },
                { label: '身份变化结算', text: '外门试炼收束时主角身份没有发生可见变化。' },
              ],
            },
          }),
        },
      ],
      runRecords: [
        {
          id: 10,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-03T00:00:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({ source: 'auto_creation_safe_batch', safety_limit: 3 }),
          output_ref: JSON.stringify({
            total: 3,
            success: 3,
            failed: 0,
            chapters: [
              { id: 18, chapter_no: 18, title: '试炼终局', status: 'success', score: 84, word_count: 3180 },
              { id: 19, chapter_no: 19, title: '旧账翻涌', status: 'success', score: 85, word_count: 3090 },
              { id: 20, chapter_no: 20, title: '钟声之后', status: 'success', score: 86, word_count: 3021 },
            ],
          }),
        },
      ],
    } as any)

    expect(model.batchReviewQueue.status).toBe('risk')
    expect(model.batchReviewQueue.riskRadar.volumeSegmentRiskCount).toBe(2)
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'volume_segment')?.detail).toContain('阶段验收')
    expect(model.batchReviewQueue.riskRadar.repairTasks.map((task: any) => task.issue_type)).toContain('volume_segment_missed')
    const volumeTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'volume_segment_missed')
    expect(volumeTask?.volume_segment_review?.planned.join('；')).toContain('进入内门视野')
    expect(volumeTask?.volume_segment_review?.missed.map((item: any) => item.label)).toContain('内门令牌入场')
    expect(model.batchReviewQueue.handoff.riskLabels).toContain('卷级阶段')
    expect(model.mainAction.key).toBe('create_safe_batch_risk_repair')
  })

  test('holds delivered safe batch when story drive and character arcs are missed', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
      },
      writing: {
        ...baseWriting,
        nextChapter: { ...baseWriting.nextChapter, id: 18, chapterNo: 18, title: '内门来人' },
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '内门招揽', goal: '新势力提出条件' }],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 17 },
      chapters: [
        { id: 15, chapter_no: 15, title: '内门影子', chapter_text: '内门影子'.repeat(500) },
        { id: 16, chapter_no: 16, title: '执事逼问', chapter_text: '执事逼问'.repeat(500) },
        { id: 17, chapter_no: 17, title: '阵纹余波', chapter_text: '阵纹余波'.repeat(500) },
      ],
      reviews: [
        { id: 101, chapter_id: 15, review_type: 'prose_quality', created_at: '2026-06-03T01:00:00.000Z', payload: JSON.stringify({ score: 84, passed: true }) },
        { id: 102, chapter_id: 16, review_type: 'prose_quality', created_at: '2026-06-03T01:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 103, chapter_id: 17, review_type: 'prose_quality', created_at: '2026-06-03T01:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
        {
          id: 401,
          chapter_id: 16,
          review_type: 'story_drive_sync',
          created_at: '2026-06-03T01:03:00.000Z',
          payload: JSON.stringify({
            story_drive_sync: {
              status: 'warn',
              label: '故事力缺口 2',
              score: 61,
              missed_count: 2,
              missed: [
                { label: '主角主动选择', text: '本章冲突由执事推动，主角没有主动做选择。' },
                { label: '选择代价', text: '主角反制没有付出资源、关系或危险代价。' },
              ],
            },
          }),
        },
        {
          id: 402,
          chapter_id: 17,
          review_type: 'character_arc_sync',
          created_at: '2026-06-03T01:04:00.000Z',
          payload: JSON.stringify({
            character_arc_sync: {
              status: 'warn',
              label: '人物弧光缺口 2',
              score: 58,
              missed_count: 2,
              missed: [
                { label: '缺陷受压', text: '主角怕暴露阵盘的缺陷没有被逼到选择边缘。' },
                { label: '关系变化', text: '林晓与主角的信任关系没有因本章事件改变。' },
              ],
            },
          }),
        },
      ],
      runRecords: [
        {
          id: 10,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-03T00:00:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({ source: 'auto_creation_safe_batch', safety_limit: 3 }),
          output_ref: JSON.stringify({
            total: 3,
            success: 3,
            failed: 0,
            chapters: [
              { id: 15, chapter_no: 15, title: '内门影子', status: 'success', score: 84, word_count: 3180 },
              { id: 16, chapter_no: 16, title: '执事逼问', status: 'success', score: 85, word_count: 3090 },
              { id: 17, chapter_no: 17, title: '阵纹余波', status: 'success', score: 86, word_count: 3021 },
            ],
          }),
        },
      ],
    } as any)

    expect(model.batchReviewQueue.status).toBe('risk')
    expect((model.batchReviewQueue.riskRadar as any).storyDriveRiskCount).toBe(2)
    expect((model.batchReviewQueue.riskRadar as any).characterArcRiskCount).toBe(2)
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'story_drive')?.detail).toContain('故事驱动力缺口')
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'character_arc')?.detail).toContain('人物弧光缺口')
    expect(model.batchReviewQueue.riskRadar.repairTasks.map((task: any) => task.issue_type)).toEqual(expect.arrayContaining([
      'story_drive_gap',
      'character_arc_gap',
    ]))
    const storyTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'story_drive_gap')
    const characterTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'character_arc_gap')
    expect(storyTask?.story_drive_sync?.missed.map((item: any) => item.label)).toContain('主角主动选择')
    expect(characterTask?.character_arc_sync?.missed.map((item: any) => item.label)).toContain('关系变化')
    expect(model.batchReviewQueue.handoff.riskLabels).toEqual(expect.arrayContaining(['故事力', '人物弧光']))
    expect(model.batchReviewQueue.completionDashboard.score).toBeLessThan(90)
  })

  test('holds delivered safe batch when style sample execution drifts or copies source phrases', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
      },
      writing: {
        ...baseWriting,
        nextChapter: { ...baseWriting.nextChapter, id: 18, chapterNo: 18, title: '内门来人' },
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '内门招揽', goal: '新势力提出条件' }],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 17 },
      chapters: [
        { id: 15, chapter_no: 15, title: '内门影子', chapter_text: '内门影子'.repeat(500) },
        { id: 16, chapter_no: 16, title: '执事逼问', chapter_text: '执事逼问'.repeat(500) },
        { id: 17, chapter_no: 17, title: '阵纹余波', chapter_text: '阵纹余波'.repeat(500) },
      ],
      reviews: [
        { id: 101, chapter_id: 15, review_type: 'prose_quality', created_at: '2026-06-03T01:00:00.000Z', payload: JSON.stringify({ score: 84, passed: true }) },
        { id: 102, chapter_id: 16, review_type: 'prose_quality', created_at: '2026-06-03T01:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 103, chapter_id: 17, review_type: 'prose_quality', created_at: '2026-06-03T01:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
        {
          id: 501,
          chapter_id: 16,
          review_type: 'style_sample_sync',
          created_at: '2026-06-03T01:03:00.000Z',
          payload: JSON.stringify({
            style_sample_sync: {
              status: 'warn',
              label: '风格缺口 3',
              score: 61,
              missed_count: 2,
              copy_risk_count: 1,
              missed: [
                { label: '对白比例', text: '本章大段旁白解释过多，缺少角色互怼推进。' },
                { label: '叙述节奏', text: '没有学到样章的短段落压迫和反转节奏。' },
              ],
              copied_phrases: ['天塌下来有高个子顶着'],
            },
          }),
        },
      ],
      runRecords: [
        {
          id: 10,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-03T00:00:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({ source: 'auto_creation_safe_batch', safety_limit: 3 }),
          output_ref: JSON.stringify({
            total: 3,
            success: 3,
            failed: 0,
            chapters: [
              { id: 15, chapter_no: 15, title: '内门影子', status: 'success', score: 84, word_count: 3180 },
              { id: 16, chapter_no: 16, title: '执事逼问', status: 'success', score: 85, word_count: 3090 },
              { id: 17, chapter_no: 17, title: '阵纹余波', status: 'success', score: 86, word_count: 3021 },
            ],
          }),
        },
      ],
    } as any)

    expect(model.batchReviewQueue.status).toBe('risk')
    expect((model.batchReviewQueue.riskRadar as any).styleSampleRiskCount).toBe(3)
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'style_sample')?.detail).toContain('风格')
    expect(model.batchReviewQueue.riskRadar.repairTasks.map((task: any) => task.issue_type)).toContain('style_sample_gap')
    const styleTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'style_sample_gap')
    expect(styleTask?.style_sample_sync?.missed.map((item: any) => item.label)).toContain('对白比例')
    expect(styleTask?.style_sample_sync?.copied_phrases).toContain('天塌下来有高个子顶着')
    expect(model.batchReviewQueue.handoff.riskLabels).toContain('风格')
    expect(model.batchReviewQueue.completionDashboard.score).toBeLessThan(90)
  })

  test('turns failed recovery evidence into a batch repair task', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
      },
      writing: {
        ...baseWriting,
        nextChapter: { ...baseWriting.nextChapter, id: 44, chapterNo: 44, title: '证据复盘后续' },
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '证据复盘', goal: '确认上一批恢复依据是否兑现' }],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 43 },
      chapters: [
        { id: 41, chapter_no: 41, title: '证据复盘一', chapter_text: '证据复盘一'.repeat(500) },
        { id: 42, chapter_no: 42, title: '证据复盘二', chapter_text: '证据复盘二'.repeat(500) },
        { id: 43, chapter_no: 43, title: '证据复盘三', chapter_text: '证据复盘三'.repeat(500) },
      ],
      reviews: [
        { id: 4101, chapter_id: 41, review_type: 'prose_quality', created_at: '2026-06-03T01:00:00.000Z', payload: JSON.stringify({ score: 84, passed: true }) },
        { id: 4102, chapter_id: 42, review_type: 'prose_quality', created_at: '2026-06-03T01:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 4103, chapter_id: 43, review_type: 'prose_quality', created_at: '2026-06-03T01:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
        {
          id: 4104,
          chapter_id: 42,
          review_type: 'style_sample_sync',
          created_at: '2026-06-03T01:03:00.000Z',
          payload: JSON.stringify({
            style_sample_sync: {
              status: 'warn',
              label: '风格缺口 2',
              missed_count: 2,
              missed: [
                { label: '对白比例', text: '样章重审后仍没有把对白交锋写成推进。' },
                { label: '叙述节奏', text: '样章重审后仍缺短段落压迫节奏。' },
              ],
              copied_phrases: [],
            },
          }),
        },
      ],
      runRecords: [
        {
          id: 410,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-03T00:00:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({
            source: 'auto_creation_safe_batch',
            safety_limit: 3,
            batch_preflight: {
              recovery_evidence: [
                '样章任务书复检通过 1 项',
                '第42章样章已重审',
              ],
            },
          }),
          output_ref: JSON.stringify({
            total: 3,
            success: 3,
            failed: 0,
            chapters: [
              { id: 41, chapter_no: 41, title: '证据复盘一', status: 'success', score: 84, word_count: 3180 },
              { id: 42, chapter_no: 42, title: '证据复盘二', status: 'success', score: 85, word_count: 3090 },
              { id: 43, chapter_no: 43, title: '证据复盘三', status: 'success', score: 86, word_count: 3021 },
            ],
          }),
        },
      ],
    } as any)

    expect(model.batchReviewQueue.status).toBe('risk')
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'recovery_evidence')?.detail).toContain('样章任务书复检通过 1 项')
    expect(model.batchReviewQueue.riskRadar.repairTasks.map((task: any) => task.issue_type)).toContain('recovery_evidence_mismatch')
    const recoveryTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'recovery_evidence_mismatch')
    expect(recoveryTask?.recovery_evidence_review?.failed_evidence).toContain('样章任务书复检通过 1 项')
    expect(recoveryTask?.recovery_evidence_review?.failed_evidence).toContain('第42章样章已重审')
    expect(recoveryTask?.recovery_evidence_review?.failed_items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        evidence: '样章任务书复检通过 1 项',
        source: 'recovery_evidence',
        source_label: '恢复放行依据',
        source_action_label: '按批次修订',
      }),
      expect.objectContaining({
        evidence: '第42章样章已重审',
        source: 'recovery_evidence',
        source_label: '恢复放行依据',
        source_action_label: '按批次修订',
      }),
    ]))
    expect(model.batchReviewQueue.handoff.riskLabels).toContain('恢复依据')
  })

  test('turns missed governance recheck memory into a batch repair task', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
      },
      writing: {
        ...baseWriting,
        nextChapter: { ...baseWriting.nextChapter, id: 44, chapterNo: 44, title: '治理复查后续' },
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '治理复查', goal: '确认治理复查记忆是否进入下一批验收' }],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 43 },
      chapters: [
        { id: 41, chapter_no: 41, title: '治理复查一', chapter_text: '治理复查一'.repeat(500) },
        { id: 42, chapter_no: 42, title: '治理复查二', chapter_text: '治理复查二'.repeat(500) },
        { id: 43, chapter_no: 43, title: '治理复查三', chapter_text: '治理复查三'.repeat(500) },
      ],
      reviews: [
        { id: 4201, chapter_id: 41, review_type: 'prose_quality', created_at: '2026-06-04T01:00:00.000Z', payload: JSON.stringify({ score: 84, passed: true }) },
        { id: 4202, chapter_id: 42, review_type: 'prose_quality', created_at: '2026-06-04T01:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 4203, chapter_id: 43, review_type: 'prose_quality', created_at: '2026-06-04T01:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
        {
          id: 4204,
          chapter_id: 42,
          review_type: 'style_sample_sync',
          created_at: '2026-06-04T01:03:00.000Z',
          payload: JSON.stringify({
            style_sample_sync: {
              status: 'warn',
              label: '风格缺口 2',
              missed_count: 2,
              missed: [
                { label: '对白交锋', text: '治理复查记忆要求的对白交锋仍没有写成推进。' },
                { label: '样章节奏', text: '下一批观察项要求的样章策略命中率仍未达标。' },
              ],
              copied_phrases: [],
            },
          }),
        },
      ],
      runRecords: [
        {
          id: 420,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-04T00:00:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({
            source: 'auto_creation_safe_batch',
            safety_limit: 3,
            batch_preflight: {
              governance_recheck_memory: {
                status: 'closed',
                label: '治理复查已记录',
                evidence: [
                  '第42章对白交锋已补回样章节奏',
                ],
                watch_items: [
                  '下一批继续观察样章策略命中率',
                ],
                storyline_decision_task_count: 0,
              },
            },
          }),
          output_ref: JSON.stringify({
            total: 3,
            success: 3,
            failed: 0,
            chapters: [
              { id: 41, chapter_no: 41, title: '治理复查一', status: 'success', score: 84, word_count: 3180 },
              { id: 42, chapter_no: 42, title: '治理复查二', status: 'success', score: 85, word_count: 3090 },
              { id: 43, chapter_no: 43, title: '治理复查三', status: 'success', score: 86, word_count: 3021 },
            ],
          }),
        },
      ],
    } as any)

    const recoverySignal = model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'recovery_evidence')
    const recoveryTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'recovery_evidence_mismatch')

    expect(model.batchReviewQueue.status).toBe('risk')
    expect(recoverySignal?.detail).toContain('第42章对白交锋已补回样章节奏')
    expect(recoverySignal?.detail).toContain('下一批继续观察样章策略命中率')
    expect(recoveryTask?.recovery_evidence_review?.failed_evidence).toContain('第42章对白交锋已补回样章节奏')
    expect(recoveryTask?.recovery_evidence_review?.failed_evidence).toContain('下一批继续观察样章策略命中率')
    expect(recoveryTask?.recovery_evidence_review?.failed_items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        evidence: '第42章对白交锋已补回样章节奏',
        source: 'governance_recheck_memory',
        source_label: '治理复查记忆',
        source_detail: '治理复查记忆 · 修后证据',
        source_action_label: '治理复查台',
      }),
      expect.objectContaining({
        evidence: '下一批继续观察样章策略命中率',
        source: 'governance_recheck_memory',
        source_label: '治理复查记忆',
        source_detail: '治理复查记忆 · 观察项',
        source_action_label: '治理复查台',
      }),
    ]))
    expect(model.batchReviewQueue.handoff.riskLabels).toContain('恢复依据')
  })

  test('turns cleared recovery evidence production gate sources into batch repair tasks when the batch stops inheriting them', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
      },
      writing: {
        ...baseWriting,
        nextChapter: { ...baseWriting.nextChapter, id: 44, chapterNo: 44, title: '闸门复盘后续' },
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '闸门复盘', goal: '确认入口闸门解除来源是否被本批继承' }],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 43 },
      chapters: [
        { id: 41, chapter_no: 41, title: '闸门复盘一', chapter_text: '闸门复盘一'.repeat(500) },
        { id: 42, chapter_no: 42, title: '闸门复盘二', chapter_text: '闸门复盘二'.repeat(500) },
        { id: 43, chapter_no: 43, title: '闸门复盘三', chapter_text: '闸门复盘三'.repeat(500) },
      ],
      reviews: [
        { id: 4301, chapter_id: 41, review_type: 'prose_quality', created_at: '2026-06-05T01:00:00.000Z', payload: JSON.stringify({ score: 84, passed: true }) },
        { id: 4302, chapter_id: 42, review_type: 'prose_quality', created_at: '2026-06-05T01:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 4303, chapter_id: 43, review_type: 'prose_quality', created_at: '2026-06-05T01:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
        {
          id: 4304,
          chapter_id: 42,
          review_type: 'style_sample_sync',
          created_at: '2026-06-05T01:03:00.000Z',
          payload: JSON.stringify({
            style_sample_sync: {
              status: 'warn',
              label: '风格缺口 2',
              missed_count: 2,
              missed: [
                { label: '对白交锋', text: '入口闸门解除后，本批仍没有继承单章治理复查的对白交锋证据。' },
                { label: '样章节奏', text: '入口闸门解除后，本批仍没有继承批次恢复复查的样章节奏证据。' },
              ],
              copied_phrases: [],
            },
          }),
        },
      ],
      runRecords: [
        {
          id: 430,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-05T00:00:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({
            source: 'auto_creation_safe_batch',
            safety_limit: 3,
            batch_preflight: {
              recovery_evidence_production_gate: {
                status: 'ok',
                label: '恢复依据生产闸门',
                source_count: 2,
                sources: [
                  {
                    source: 'single_chapter_governance_recheck',
                    label: '单章治理复查',
                    status: 'cleared',
                    status_label: '生产阻断已解除',
                    residual_evidence: [],
                    task_count: 1,
                  },
                  {
                    source: 'safe_batch_recovery_recheck',
                    label: '批次恢复复查',
                    status: 'cleared',
                    status_label: '生产阻断已解除',
                    residual_evidence: [],
                    task_count: 1,
                  },
                ],
              },
            },
          }),
          output_ref: JSON.stringify({
            total: 3,
            success: 3,
            failed: 0,
            chapters: [
              { id: 41, chapter_no: 41, title: '闸门复盘一', status: 'success', score: 84, word_count: 3180 },
              { id: 42, chapter_no: 42, title: '闸门复盘二', status: 'success', score: 85, word_count: 3090 },
              { id: 43, chapter_no: 43, title: '闸门复盘三', status: 'success', score: 86, word_count: 3021 },
            ],
          }),
        },
      ],
    } as any)

    const recoverySignal = model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'recovery_evidence')
    const recoveryTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'recovery_evidence_mismatch')

    expect(model.batchReviewQueue.status).toBe('risk')
    expect(recoverySignal?.detail).toContain('单章治理复查：生产阻断已解除')
    expect(recoverySignal?.detail).toContain('批次恢复复查：生产阻断已解除')
    expect(recoveryTask?.recovery_evidence_review?.failed_evidence).toContain('单章治理复查：生产阻断已解除')
    expect(recoveryTask?.recovery_evidence_review?.failed_evidence).toContain('批次恢复复查：生产阻断已解除')
    expect(recoveryTask?.recovery_evidence_review?.failed_items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        evidence: '单章治理复查：生产阻断已解除',
        source: 'recovery_evidence_production_gate',
        source_label: '入口生产闸门',
        source_detail: '单章治理复查 · 生产阻断已解除',
        source_action_label: '复检单章',
      }),
      expect.objectContaining({
        evidence: '批次恢复复查：生产阻断已解除',
        source: 'recovery_evidence_production_gate',
        source_label: '入口生产闸门',
        source_detail: '批次恢复复查 · 生产阻断已解除',
        source_action_label: '复盘批次',
      }),
    ]))
    expect(model.batchReviewQueue.handoff.riskLabels).toContain('恢复依据')
  })

  test('shows recovery evidence closure in completion dashboard after repair recheck resolves it', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
      },
      writing: {
        ...baseWriting,
        nextChapter: { ...baseWriting.nextChapter, id: 44, chapterNo: 44, title: '证据复盘后续' },
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '证据复盘', goal: '确认上一批恢复依据是否兑现' }],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 43 },
      chapters: [
        { id: 41, chapter_no: 41, title: '证据复盘一', chapter_text: '证据复盘一'.repeat(500) },
        { id: 42, chapter_no: 42, title: '证据复盘二', chapter_text: '证据复盘二'.repeat(500) },
        { id: 43, chapter_no: 43, title: '证据复盘三', chapter_text: '证据复盘三'.repeat(500) },
      ],
      reviews: [
        { id: 4101, chapter_id: 41, review_type: 'prose_quality', created_at: '2026-06-03T01:00:00.000Z', payload: JSON.stringify({ score: 84, passed: true }) },
        { id: 4102, chapter_id: 42, review_type: 'prose_quality', created_at: '2026-06-03T01:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 4103, chapter_id: 43, review_type: 'prose_quality', created_at: '2026-06-03T01:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
        {
          id: 4104,
          chapter_id: 42,
          review_type: 'style_sample_sync',
          created_at: '2026-06-03T01:03:00.000Z',
          payload: JSON.stringify({
            style_sample_sync: {
              status: 'warn',
              label: '风格缺口 2',
              missed_count: 2,
              missed: [
                { label: '对白比例', text: '样章重审后仍没有把对白交锋写成推进。' },
                { label: '叙述节奏', text: '样章重审后仍缺短段落压迫节奏。' },
              ],
              copied_phrases: [],
            },
          }),
        },
        { id: 4105, chapter_id: 41, review_type: 'prose_quality', created_at: '2026-06-03T02:10:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 4106, chapter_id: 42, review_type: 'prose_quality', created_at: '2026-06-03T02:11:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
      ],
      runRecords: [
        {
          id: 410,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-03T00:00:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({
            source: 'auto_creation_safe_batch',
            safety_limit: 3,
            batch_preflight: {
              recovery_evidence: [
                '样章任务书复检通过 1 项',
                '第42章样章已重审',
              ],
            },
          }),
          output_ref: JSON.stringify({
            total: 3,
            success: 3,
            failed: 0,
            chapters: [
              { id: 41, chapter_no: 41, title: '证据复盘一', status: 'success', score: 84, word_count: 3180 },
              { id: 42, chapter_no: 42, title: '证据复盘二', status: 'success', score: 85, word_count: 3090 },
              { id: 43, chapter_no: 43, title: '证据复盘三', status: 'success', score: 86, word_count: 3021 },
            ],
          }),
        },
        {
          id: 411,
          run_type: 'longform_production_repair',
          created_at: '2026-06-03T02:00:00.000Z',
          status: 'completed',
          input_ref: JSON.stringify({ source: 'auto_creation_safe_batch_risk', batch_created_at: '2026-06-03T00:00:00.000Z' }),
          output_ref: JSON.stringify({
            tasks: [
              { task_type: 'repair_quality', issue_type: 'recovery_evidence_mismatch', task_status: 'resolved', chapter_id: 41, chapter_no: 41 },
              { task_type: 'repair_quality', issue_type: 'style_sample_gap', task_status: 'resolved', chapter_id: 42, chapter_no: 42 },
            ],
          }),
        },
      ],
    } as any)

    const recoverySignal = model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'recovery_evidence')
    const recoveryMetric = model.batchReviewQueue.completionDashboard.metrics.find(metric => metric.key === 'recovery_evidence' as any)

    expect(model.batchReviewQueue.status).toBe('done')
    expect(model.batchReviewQueue.riskRadar.repairTasks.map((task: any) => task.issue_type)).not.toContain('recovery_evidence_mismatch')
    expect(recoverySignal?.status).toBe('ok')
    expect(recoverySignal?.detail).toContain('恢复放行依据失效风险已修复并通过复检')
    expect(recoveryMetric?.label).toBe('恢复依据')
    expect(recoveryMetric?.status).toBe('ok')
    expect(recoveryMetric?.detail).toContain('恢复依据已闭环')
    expect(model.batchReviewQueue.completionDashboard.summary).toContain('恢复依据已闭环')
    expect(model.batchReviewQueue.handoff.evidence).toContain('恢复依据已闭环')
  })

  test('holds delivered safe batch when chapter benchmark execution misses baseline beats', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
      },
      writing: {
        ...baseWriting,
        nextChapter: { ...baseWriting.nextChapter, id: 18, chapterNo: 18, title: '内门来人' },
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '内门招揽', goal: '新势力提出条件' }],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 17 },
      chapters: [
        { id: 15, chapter_no: 15, title: '内门影子', chapter_text: '内门影子'.repeat(500) },
        { id: 16, chapter_no: 16, title: '执事逼问', chapter_text: '执事逼问'.repeat(500) },
        { id: 17, chapter_no: 17, title: '阵纹余波', chapter_text: '阵纹余波'.repeat(500) },
      ],
      reviews: [
        { id: 101, chapter_id: 15, review_type: 'prose_quality', created_at: '2026-06-03T01:00:00.000Z', payload: JSON.stringify({ score: 84, passed: true }) },
        { id: 102, chapter_id: 16, review_type: 'prose_quality', created_at: '2026-06-03T01:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 103, chapter_id: 17, review_type: 'prose_quality', created_at: '2026-06-03T01:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
        {
          id: 502,
          chapter_id: 16,
          review_type: 'chapter_benchmark_sync',
          created_at: '2026-06-03T01:03:00.000Z',
          payload: JSON.stringify({
            chapter_benchmark_sync: {
              status: 'warn',
              label: '基准缺口 3',
              score: 57,
              missed_count: 3,
              missed: [
                { key: 'opening_hook', label: '开篇钩子', text: '前300字没有把上一章压力转成现场危险。' },
                { key: 'payoff_pattern', label: '爽点兑现', text: '主角反制没有形成可见回报。' },
                { key: 'ending_hook_pattern', label: '章末追读', text: '章末缺少下一章非看不可的问题。' },
              ],
            },
          }),
        },
      ],
      runRecords: [
        {
          id: 10,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-03T00:00:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({ source: 'auto_creation_safe_batch', safety_limit: 3 }),
          output_ref: JSON.stringify({
            total: 3,
            success: 3,
            failed: 0,
            chapters: [
              { id: 15, chapter_no: 15, title: '内门影子', status: 'success', score: 84, word_count: 3180 },
              { id: 16, chapter_no: 16, title: '执事逼问', status: 'success', score: 85, word_count: 3090 },
              { id: 17, chapter_no: 17, title: '阵纹余波', status: 'success', score: 86, word_count: 3021 },
            ],
          }),
        },
      ],
    } as any)

    expect(model.batchReviewQueue.status).toBe('risk')
    expect((model.batchReviewQueue.riskRadar as any).chapterBenchmarkRiskCount).toBe(3)
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'chapter_benchmark')?.detail).toContain('标杆章')
    expect(model.batchReviewQueue.riskRadar.repairTasks.map((task: any) => task.issue_type)).toContain('chapter_benchmark_gap')
    const benchmarkTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'chapter_benchmark_gap')
    expect(benchmarkTask?.chapter_benchmark_sync?.missed.map((item: any) => item.label)).toContain('开篇钩子')
    expect(model.batchReviewQueue.handoff.riskLabels).toContain('标杆章')
    expect(model.batchReviewQueue.completionDashboard.score).toBeLessThan(90)
  })

  test('holds delivered safe batch when chapter attraction execution is weak', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
      },
      writing: {
        ...baseWriting,
        nextChapter: { ...baseWriting.nextChapter, id: 18, chapterNo: 18, title: '内门来人' },
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '内门招揽', goal: '新势力提出条件' }],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 17 },
      chapters: [
        { id: 15, chapter_no: 15, title: '内门影子', chapter_text: '内门影子'.repeat(500) },
        { id: 16, chapter_no: 16, title: '执事逼问', chapter_text: '执事逼问'.repeat(500) },
        { id: 17, chapter_no: 17, title: '阵纹余波', chapter_text: '阵纹余波'.repeat(500) },
      ],
      reviews: [
        { id: 101, chapter_id: 15, review_type: 'prose_quality', created_at: '2026-06-03T01:00:00.000Z', payload: JSON.stringify({ score: 84, passed: true }) },
        { id: 102, chapter_id: 16, review_type: 'prose_quality', created_at: '2026-06-03T01:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 103, chapter_id: 17, review_type: 'prose_quality', created_at: '2026-06-03T01:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
        {
          id: 503,
          chapter_id: 16,
          review_type: 'chapter_attraction_review',
          created_at: '2026-06-03T01:03:00.000Z',
          payload: JSON.stringify({
            chapter_attraction_review: {
              status: 'warn',
              label: '吸引力缺口 3',
              score: 62,
              weak_count: 3,
              priority_repair: '优先修章末翻页',
              weak_dimensions: [
                { key: 'scene_drive', label: '场景推进', status: 'warn', score: 57, issue: '中段缺少目标、阻碍、转折和回报。' },
                { key: 'payoff_density', label: '爽点密度', status: 'warn', score: 58, issue: '主角反制没有写成可见结果。' },
                { key: 'page_turn', label: '章末翻页', status: 'warn', score: 42, issue: '结尾没有留下下一章必须看的问题。' },
              ],
            },
          }),
        },
      ],
      runRecords: [
        {
          id: 10,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-03T00:00:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({ source: 'auto_creation_safe_batch', safety_limit: 3 }),
          output_ref: JSON.stringify({
            total: 3,
            success: 3,
            failed: 0,
            chapters: [
              { id: 15, chapter_no: 15, title: '内门影子', status: 'success', score: 84, word_count: 3180 },
              { id: 16, chapter_no: 16, title: '执事逼问', status: 'success', score: 85, word_count: 3090 },
              { id: 17, chapter_no: 17, title: '阵纹余波', status: 'success', score: 86, word_count: 3021 },
            ],
          }),
        },
      ],
    } as any)

    expect(model.batchReviewQueue.status).toBe('risk')
    expect((model.batchReviewQueue.riskRadar as any).chapterAttractionRiskCount).toBe(3)
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'chapter_attraction')?.detail).toContain('吸引力')
    expect(model.batchReviewQueue.riskRadar.repairTasks.map((task: any) => task.issue_type)).toContain('chapter_attraction_gap')
    const attractionTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'chapter_attraction_gap')
    expect(attractionTask?.chapter_attraction_review?.weak_dimensions.map((item: any) => item.label)).toContain('章末翻页')
    expect(attractionTask?.chapter_attraction_review?.priority_repair).toBe('优先修章末翻页')
    expect(model.batchReviewQueue.handoff.riskLabels).toContain('吸引力')
    expect(model.batchReviewQueue.completionDashboard.score).toBeLessThan(90)
  })

  test('holds delivered safe batch when reader trial review finds drop points in the batch', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
      },
      writing: {
        ...baseWriting,
        nextChapter: { ...baseWriting.nextChapter, id: 11, chapterNo: 11, title: '内门来人' },
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '内门招揽', goal: '新势力提出条件' }],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 10 },
      chapters: [
        { id: 8, chapter_no: 8, title: '试炼前夜', chapter_text: '试炼前夜'.repeat(500) },
        { id: 9, chapter_no: 9, title: '阵盘裂纹', chapter_text: '阵盘裂纹'.repeat(500) },
        { id: 10, chapter_no: 10, title: '外门震动', chapter_text: '外门震动'.repeat(500) },
      ],
      reviews: [
        { id: 101, chapter_id: 8, review_type: 'prose_quality', created_at: '2026-06-03T01:00:00.000Z', payload: JSON.stringify({ score: 84, passed: true }) },
        { id: 102, chapter_id: 9, review_type: 'prose_quality', created_at: '2026-06-03T01:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 103, chapter_id: 10, review_type: 'prose_quality', created_at: '2026-06-03T01:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
        {
          id: 601,
          review_type: 'reader_trial_review',
          created_at: '2026-06-03T01:03:00.000Z',
          payload: JSON.stringify({
            report: {
              status: 'needs_repair',
              score: 63,
              summary: '试读十章存在明显弃读点。',
              quality_bar: 'qidian_10k_reader_trial_baseline',
              drop_points: [
                '第8章中段解释宗门派系过密，试读用户可能弃读。',
                '第10章章末钩子弱，没有形成付费前继续阅读动力。',
              ],
              repair_actions: [
                '第8章删减派系解释，改成执事现场逼问。',
                '第10章重做章末未解决问题。',
              ],
              segments: [
                { key: 'trial_10', label: '试读十章', score: 63, verdict: '第8-10章掉速。' },
              ],
            },
          }),
        },
      ],
      runRecords: [
        {
          id: 10,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-03T00:00:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({ source: 'auto_creation_safe_batch', safety_limit: 3 }),
          output_ref: JSON.stringify({
            total: 3,
            success: 3,
            failed: 0,
            chapters: [
              { id: 8, chapter_no: 8, title: '试炼前夜', status: 'success', score: 84, word_count: 3180 },
              { id: 9, chapter_no: 9, title: '阵盘裂纹', status: 'success', score: 85, word_count: 3090 },
              { id: 10, chapter_no: 10, title: '外门震动', status: 'success', score: 86, word_count: 3021 },
            ],
          }),
        },
      ],
    } as any)

    expect(model.batchReviewQueue.status).toBe('risk')
    expect((model.batchReviewQueue.riskRadar as any).readerTrialRiskCount).toBe(2)
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'reader_trial')?.detail).toContain('试读弃读点')
    expect(model.batchReviewQueue.riskRadar.repairTasks.map((task: any) => task.issue_type)).toContain('reader_trial_drop_point')
    const trialTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'reader_trial_drop_point')
    expect(trialTask?.reader_trial_review?.drop_points).toContain('第8章中段解释宗门派系过密，试读用户可能弃读。')
    expect(trialTask?.reader_trial_review?.repair_actions).toContain('第10章重做章末未解决问题。')
    expect(model.batchReviewQueue.handoff.riskLabels).toContain('试读')
    expect(model.batchReviewQueue.completionDashboard.score).toBeLessThan(90)
  })

  test('holds delivered safe batch when first30 retention diagnosis is stale for opening chapters', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        first30Retention: {
          ...basePlanning.first30Retention,
          status: 'stale',
          score: 76,
          summary: '需重新诊断：前30章内容已在报告后更新。旧报告显示第4-10章试读闭环偏弱。',
          stale: true,
          actionKey: 'run_first30_retention',
          risks: [{ severity: 'high', segment: '4-10', issue: '试读闭环偏弱', action: '重新运行前30章诊断' }],
          nextActions: ['重新运行前30章诊断，确认第8-10章修复后的追读曲线。'],
        },
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
      },
      writing: {
        ...baseWriting,
        nextChapter: { ...baseWriting.nextChapter, id: 11, chapterNo: 11, title: '内门来人' },
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '内门招揽', goal: '新势力提出条件' }],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 10 },
      chapters: [
        { id: 8, chapter_no: 8, title: '试炼前夜', updated_at: '2026-06-03T02:00:00.000Z', chapter_text: '试炼前夜'.repeat(500) },
        { id: 9, chapter_no: 9, title: '阵盘裂纹', updated_at: '2026-06-03T02:01:00.000Z', chapter_text: '阵盘裂纹'.repeat(500) },
        { id: 10, chapter_no: 10, title: '外门震动', updated_at: '2026-06-03T02:02:00.000Z', chapter_text: '外门震动'.repeat(500) },
      ],
      reviews: [
        { id: 101, chapter_id: 8, review_type: 'prose_quality', created_at: '2026-06-03T03:00:00.000Z', payload: JSON.stringify({ score: 84, passed: true }) },
        { id: 102, chapter_id: 9, review_type: 'prose_quality', created_at: '2026-06-03T03:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 103, chapter_id: 10, review_type: 'prose_quality', created_at: '2026-06-03T03:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
      ],
      runRecords: [
        {
          id: 10,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-03T00:00:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({ source: 'auto_creation_safe_batch', safety_limit: 3 }),
          output_ref: JSON.stringify({
            total: 3,
            success: 3,
            failed: 0,
            chapters: [
              { id: 8, chapter_no: 8, title: '试炼前夜', status: 'success', score: 84, word_count: 3180 },
              { id: 9, chapter_no: 9, title: '阵盘裂纹', status: 'success', score: 85, word_count: 3090 },
              { id: 10, chapter_no: 10, title: '外门震动', status: 'success', score: 86, word_count: 3021 },
            ],
          }),
        },
      ],
    } as any)

    expect(model.batchReviewQueue.status).toBe('risk')
    expect((model.batchReviewQueue.riskRadar as any).first30RetentionRiskCount).toBe(1)
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'first30_retention')?.detail).toContain('需重新诊断')
    expect(model.batchReviewQueue.riskRadar.repairTasks.map((task: any) => task.issue_type)).toContain('first30_retention_recheck')
    const retentionTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'first30_retention_recheck')
    expect(retentionTask?.action_key).toBe('run_first30_retention')
    expect(retentionTask?.first30_retention?.summary).toContain('前30章内容已在报告后更新')
    expect(model.batchReviewQueue.handoff.riskLabels).toContain('前30章')
    expect(model.batchReviewQueue.completionDashboard.score).toBeLessThan(90)
  })

  test('ignores old reader trial drop points when the safe batch is outside the trial window', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          currentChapterLabel: '第43章',
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
      },
      writing: {
        ...baseWriting,
        nextChapter: { ...baseWriting.nextChapter, id: 43, chapterNo: 43, title: '内门复盘' },
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '内门复盘', goal: '结算阶段回报' }],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 42 },
      chapters: [
        { id: 40, chapter_no: 40, title: '内门暗潮', chapter_text: '内门暗潮'.repeat(500) },
        { id: 41, chapter_no: 41, title: '长老下注', chapter_text: '长老下注'.repeat(500) },
        { id: 42, chapter_no: 42, title: '榜单改写', chapter_text: '榜单改写'.repeat(500) },
      ],
      reviews: [
        { id: 101, chapter_id: 40, review_type: 'prose_quality', created_at: '2026-06-03T01:00:00.000Z', payload: JSON.stringify({ score: 84, passed: true }) },
        { id: 102, chapter_id: 41, review_type: 'prose_quality', created_at: '2026-06-03T01:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 103, chapter_id: 42, review_type: 'prose_quality', created_at: '2026-06-03T01:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
        {
          id: 601,
          review_type: 'reader_trial_review',
          created_at: '2026-06-03T01:03:00.000Z',
          payload: JSON.stringify({
            report: {
              status: 'needs_repair',
              score: 63,
              summary: '试读十章存在明显弃读点。',
              drop_points: [
                '第8章中段解释宗门派系过密，试读用户可能弃读。',
                '第10章章末钩子弱，没有形成付费前继续阅读动力。',
              ],
              repair_actions: ['第8章删减派系解释。', '第10章重做章末未解决问题。'],
            },
          }),
        },
      ],
      runRecords: [
        {
          id: 10,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-03T00:00:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({ source: 'auto_creation_safe_batch', safety_limit: 3 }),
          output_ref: JSON.stringify({
            total: 3,
            success: 3,
            failed: 0,
            chapters: [
              { id: 40, chapter_no: 40, title: '内门暗潮', status: 'success', score: 84, word_count: 3180 },
              { id: 41, chapter_no: 41, title: '长老下注', status: 'success', score: 85, word_count: 3090 },
              { id: 42, chapter_no: 42, title: '榜单改写', status: 'success', score: 86, word_count: 3021 },
            ],
          }),
        },
      ],
    } as any)

    expect(model.batchReviewQueue.status).toBe('done')
    expect((model.batchReviewQueue.riskRadar as any).readerTrialRiskCount).toBe(0)
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'reader_trial')?.status).toBe('ok')
    expect(model.batchReviewQueue.riskRadar.repairTasks.map((task: any) => task.issue_type)).not.toContain('reader_trial_drop_point')
  })

  test('holds delivered safe batch when reader pull and innovation execution are missed', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
      },
      writing: {
        ...baseWriting,
        nextChapter: { ...baseWriting.nextChapter, id: 15, chapterNo: 15, title: '内门来人' },
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '内门招揽', goal: '新势力提出条件' }],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 14 },
      chapters: [
        { id: 12, chapter_no: 12, title: '令牌代价', chapter_text: '令牌代价'.repeat(500), raw_payload: { ending_hook: '令牌背面浮出血字' } },
        { id: 13, chapter_no: 13, title: '阵盘回响', chapter_text: '阵盘回响'.repeat(500), raw_payload: { ending_hook: '暗处长老认出阵纹' } },
        { id: 14, chapter_no: 14, title: '内门影子', chapter_text: '内门影子'.repeat(500), raw_payload: { payoff: '压迫继续升级' } },
      ],
      reviews: [
        { id: 101, chapter_id: 12, review_type: 'prose_quality', created_at: '2026-06-03T01:00:00.000Z', payload: JSON.stringify({ score: 84, passed: true }) },
        { id: 102, chapter_id: 13, review_type: 'prose_quality', created_at: '2026-06-03T01:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 103, chapter_id: 14, review_type: 'prose_quality', created_at: '2026-06-03T01:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
        {
          id: 301,
          chapter_id: 12,
          review_type: 'reader_expectation_sync',
          created_at: '2026-06-03T01:03:00.000Z',
          payload: JSON.stringify({
            reader_expectation_sync: {
              status: 'warn',
              label: '期待欠账 1',
              missed_count: 1,
              missed: [{ label: '令牌代价', text: '章内没有兑现令牌背面血字代表的即时危险。' }],
            },
          }),
        },
        {
          id: 302,
          chapter_id: 13,
          review_type: 'reader_retention_sync',
          created_at: '2026-06-03T01:04:00.000Z',
          payload: JSON.stringify({
            reader_retention_sync: {
              status: 'warn',
              label: '追读漏项 1',
              missed_count: 1,
              missed: [{ label: '章末问题', text: '章末没有留下明确的下一章选择或危险。' }],
            },
          }),
        },
        {
          id: 303,
          chapter_id: 14,
          review_type: 'innovation_sync',
          created_at: '2026-06-03T01:05:00.000Z',
          payload: JSON.stringify({
            innovation_sync: {
              status: 'warn',
              label: '创新缺口 2',
              missed_count: 2,
              missed: [
                { label: '规则反制新鲜感', text: '没有把阵法规则写成可视化反制场面。' },
                { label: 'IP化场面', text: '缺少适合短剧/漫剧化的强视觉场景。' },
              ],
            },
          }),
        },
      ],
      runRecords: [
        {
          id: 10,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-03T00:00:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({ source: 'auto_creation_safe_batch', safety_limit: 3 }),
          output_ref: JSON.stringify({
            total: 3,
            success: 3,
            failed: 0,
            chapters: [
              { id: 12, chapter_no: 12, title: '令牌代价', status: 'success', score: 84, word_count: 3180 },
              { id: 13, chapter_no: 13, title: '阵盘回响', status: 'success', score: 85, word_count: 3090 },
              { id: 14, chapter_no: 14, title: '内门影子', status: 'success', score: 86, word_count: 3021 },
            ],
          }),
        },
      ],
    } as any)

    expect(model.batchReviewQueue.status).toBe('risk')
    expect((model.batchReviewQueue.riskRadar as any).readerPullRiskCount).toBe(2)
    expect((model.batchReviewQueue.riskRadar as any).innovationRiskCount).toBe(2)
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'reader_pull')?.detail).toContain('读者拉力')
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'innovation')?.detail).toContain('创新')
    expect(model.batchReviewQueue.riskRadar.repairTasks.map((task: any) => task.issue_type)).toEqual(expect.arrayContaining([
      'reader_pull_missed',
      'innovation_execution_missed',
    ]))
    const readerTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'reader_pull_missed')
    const innovationTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'innovation_execution_missed')
    expect(readerTask?.reader_pull_review?.missed.map((item: any) => item.label)).toContain('令牌代价')
    expect(innovationTask?.innovation_review?.missed.map((item: any) => item.label)).toContain('IP化场面')
    expect(model.batchReviewQueue.handoff.riskLabels).toEqual(expect.arrayContaining(['读者拉力', '创新/IP']))
  })

  test('releases safe batch risk after repair tasks are resolved and chapters are rechecked', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        futureRoute: [
          { chapterNo: 11, title: '内门来人', chapterTask: '内门势力抛出招揽条件', conflict: '招揽背后附带夺阵盘的暗线', endingHook: '内门令牌落在桌上', mainlineProgress: '主角进入内门视野' },
          { chapterNo: 12, title: '令牌代价', chapterTask: '主角试探令牌真实代价', conflict: '旧执事借规矩继续施压', endingHook: '令牌背面浮出血字', mainlineProgress: '宗门规矩开始反噬旧秩序' },
          { chapterNo: 13, title: '阵盘回响', chapterTask: '阵盘回应内门试探', conflict: '阵盘力量暴露与隐藏身份冲突', endingHook: '暗处长老认出阵纹', mainlineProgress: '阵法天赋进入高层视线' },
        ],
      },
      writing: {
        ...baseWriting,
        nextChapter: { ...baseWriting.nextChapter, id: 11, chapterNo: 11, title: '内门来人' },
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [
            { title: '余波清算', goal: '试炼结果引发宗门震动' },
            { title: '内门招揽', goal: '新势力提出条件' },
          ],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 10 },
      chapters: [
        { id: 8, chapter_no: 8, title: '试炼前夜', chapter_text: '正文'.repeat(1600) },
        { id: 9, chapter_no: 9, title: '阵盘裂纹', chapter_text: '正文'.repeat(1550) },
        { id: 10, chapter_no: 10, title: '外门震动', chapter_text: '正文'.repeat(1510) },
      ],
      reviews: [
        { id: 101, chapter_id: 8, review_type: 'prose_quality', created_at: '2026-06-03T01:00:00.000Z', payload: JSON.stringify({ score: 82, passed: true }) },
        { id: 102, chapter_id: 9, review_type: 'prose_quality', created_at: '2026-06-03T01:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 103, chapter_id: 10, review_type: 'prose_quality', created_at: '2026-06-03T01:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
        { id: 201, chapter_id: 9, review_type: 'chapter_core_drift', created_at: '2026-06-03T01:03:00.000Z', payload: JSON.stringify({ core_drift: { status: 'warn', score: 70, drift_risks: ['主线推进不足'] } }) },
        { id: 202, chapter_id: 10, review_type: 'reader_payoff_sync', created_at: '2026-06-03T01:04:00.000Z', payload: JSON.stringify({ reader_payoff_sync: { status: 'warn', debt_count: 2, missed: ['阵盘反噬回报', '内门压力'] } }) },
        { id: 203, chapter_id: 10, review_type: 'storyline_sync', created_at: '2026-06-03T01:05:00.000Z', payload: JSON.stringify({ storyline_sync: { status: 'warn', missed: ['内门线推进'], forbidden_touched: ['幕后主使'] } }) },
        { id: 301, chapter_id: 9, review_type: 'prose_quality', created_at: '2026-06-03T02:10:00.000Z', payload: JSON.stringify({ score: 84, passed: true }) },
        { id: 302, chapter_id: 10, review_type: 'prose_quality', created_at: '2026-06-03T02:11:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
      ],
      runRecords: [
        {
          id: 10,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-03T00:00:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({
            source: 'auto_creation_safe_batch',
            safety_limit: 3,
            batch_preflight: {
              recovery_evidence: [
                '批次任务书完整',
                '样章任务书复检通过 2 项',
                '第9、10章样章已重审',
              ],
              storyline_decision_closure: {
                status: 'ok',
                label: '剧情线决策已闭环',
                open_count: 0,
              },
            },
          }),
          output_ref: JSON.stringify({
            total: 3,
            success: 3,
            failed: 0,
            chapters: [
              { id: 8, chapter_no: 8, title: '试炼前夜', status: 'success', score: 82, word_count: 3180 },
              { id: 9, chapter_no: 9, title: '阵盘裂纹', status: 'success', score: 85, word_count: 3090 },
              { id: 10, chapter_no: 10, title: '外门震动', status: 'success', score: 86, word_count: 3021 },
            ],
          }),
        },
        {
          id: 11,
          run_type: 'longform_production_repair',
          created_at: '2026-06-03T02:00:00.000Z',
          status: 'completed',
          input_ref: JSON.stringify({ source: 'auto_creation_safe_batch_risk', batch_created_at: '2026-06-03T00:00:00.000Z' }),
          output_ref: JSON.stringify({
            tasks: [
              { task_type: 'repair_quality', issue_type: 'core_drift', task_status: 'resolved', chapter_id: 9, chapter_no: 9 },
              { task_type: 'repair_quality', issue_type: 'reader_payoff_debt', task_status: 'resolved', chapter_id: 10, chapter_no: 10 },
              { task_type: 'repair_quality', issue_type: 'storyline_sync_risk', task_status: 'resolved', chapter_id: 10, chapter_no: 10 },
            ],
          }),
        },
      ],
    } as any)

    expect(model.batchReviewQueue.status).toBe('done')
    expect(model.batchReviewQueue.riskRadar.status).toBe('ok')
    expect(model.batchReviewQueue.riskRadar.repairTasks).toHaveLength(0)
    expect(model.status).toBe('ready')
    expect(model.batchReviewQueue.nextAction.key).toBe('start_safe_batch_generation')
    expect(model.batchReviewQueue.completionDashboard.status).toBe('ready_next')
    expect(model.batchReviewQueue.completionDashboard.score).toBeGreaterThanOrEqual(90)
    expect(model.batchReviewQueue.completionDashboard.nextAction.key).toBe('start_safe_batch_generation')
    expect(model.batchReviewQueue.completionDashboard.metrics.every(metric => metric.status === 'ok')).toBe(true)
    expect(model.batchReviewQueue.handoff.evidence).toContain('剧情线决策已闭环')
    expect(model.batchReviewQueue.handoff.evidence).toContain('样章任务书复检通过 2 项')
    expect(model.batchReviewQueue.handoff.evidence).toContain('第9、10章样章已重审')
  })

  test('releases chapter handoff batch risk after the handoff repair is resolved and rechecked', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
      },
      writing: {
        ...baseWriting,
        nextChapter: { ...baseWriting.nextChapter, id: 11, chapterNo: 11, title: '内门来人' },
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '内门招揽', goal: '新势力提出条件' }],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 10 },
      chapters: [
        { id: 8, chapter_no: 8, title: '试炼前夜', chapter_text: '正文'.repeat(1600) },
        { id: 9, chapter_no: 9, title: '阵盘裂纹', chapter_text: '正文'.repeat(1550) },
        { id: 10, chapter_no: 10, title: '外门震动', chapter_text: '正文'.repeat(1510) },
      ],
      reviews: [
        { id: 101, chapter_id: 8, review_type: 'prose_quality', created_at: '2026-06-03T01:00:00.000Z', payload: JSON.stringify({ score: 84, passed: true }) },
        { id: 102, chapter_id: 9, review_type: 'prose_quality', created_at: '2026-06-03T01:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 103, chapter_id: 10, review_type: 'prose_quality', created_at: '2026-06-03T01:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
        {
          id: 301,
          chapter_id: 10,
          review_type: 'reader_expectation_sync',
          created_at: '2026-06-03T01:03:00.000Z',
          payload: JSON.stringify({
            reader_expectation_sync: {
              status: 'warn',
              missed_count: 1,
              missed: [
                {
                  key: 'opening_handoff',
                  label: '上一章承接',
                  match_scope: 'opening',
                  text: '阵盘第二道裂纹必须在开篇造成可见压力。',
                },
              ],
            },
          }),
        },
        { id: 401, chapter_id: 10, review_type: 'prose_quality', created_at: '2026-06-03T02:10:00.000Z', payload: JSON.stringify({ score: 88, passed: true }) },
      ],
      runRecords: [
        {
          id: 10,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-03T00:00:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({ source: 'auto_creation_safe_batch', safety_limit: 3 }),
          output_ref: JSON.stringify({
            total: 3,
            success: 3,
            failed: 0,
            chapters: [
              { id: 8, chapter_no: 8, title: '试炼前夜', status: 'success', score: 84, word_count: 3180 },
              { id: 9, chapter_no: 9, title: '阵盘裂纹', status: 'success', score: 85, word_count: 3090 },
              { id: 10, chapter_no: 10, title: '外门震动', status: 'success', score: 86, word_count: 3021 },
            ],
          }),
        },
        {
          id: 11,
          run_type: 'longform_production_repair',
          created_at: '2026-06-03T02:00:00.000Z',
          status: 'completed',
          input_ref: JSON.stringify({ source: 'auto_creation_safe_batch_risk', batch_created_at: '2026-06-03T00:00:00.000Z' }),
          output_ref: JSON.stringify({
            tasks: [
              { task_type: 'repair_quality', issue_type: 'chapter_handoff_missed', task_status: 'resolved', chapter_id: 10, chapter_no: 10 },
            ],
          }),
        },
      ],
    } as any)

    expect(model.batchReviewQueue.status).toBe('done')
    expect(model.batchReviewQueue.riskRadar.status).toBe('ok')
    expect((model.batchReviewQueue.riskRadar as any).handoffRiskCount).toBe(0)
    expect((model.batchReviewQueue.riskRadar as any).readerPullRiskCount).toBe(0)
    expect(model.batchReviewQueue.riskRadar.repairTasks).toHaveLength(0)
    expect(model.batchReviewQueue.handoff.status).not.toBe('repair_risks')
    expect(model.batchReviewQueue.nextAction.key).not.toBe('create_safe_batch_risk_repair')
  })

  test('releases underlying batch risks after composite batch brief repairs are resolved and rechecked', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
      },
      writing: {
        ...baseWriting,
        nextChapter: { ...baseWriting.nextChapter, id: 11, chapterNo: 11, title: '内门来人' },
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '内门招揽', goal: '新势力提出条件' }],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 10 },
      chapters: [
        { id: 9, chapter_no: 9, title: '阵盘裂纹', chapter_text: '正文'.repeat(1550) },
        { id: 10, chapter_no: 10, title: '外门震动', chapter_text: '正文'.repeat(1510) },
      ],
      reviews: [
        { id: 102, chapter_id: 9, review_type: 'prose_quality', created_at: '2026-06-03T01:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 103, chapter_id: 10, review_type: 'prose_quality', created_at: '2026-06-03T01:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
        { id: 202, chapter_id: 9, review_type: 'reader_payoff_sync', created_at: '2026-06-03T01:04:00.000Z', payload: JSON.stringify({ reader_payoff_sync: { status: 'warn', debt_count: 1, missed: ['阵盘反噬回报'] } }) },
        { id: 203, chapter_id: 10, review_type: 'storyline_sync', created_at: '2026-06-03T01:05:00.000Z', payload: JSON.stringify({ storyline_sync: { status: 'warn', missed: ['进入内门视野'] } }) },
        { id: 301, chapter_id: 9, review_type: 'prose_quality', created_at: '2026-06-03T02:10:00.000Z', payload: JSON.stringify({ score: 84, passed: true }) },
        { id: 302, chapter_id: 10, review_type: 'prose_quality', created_at: '2026-06-03T02:11:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
      ],
      runRecords: [
        {
          id: 10,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-03T00:00:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({
            source: 'auto_creation_safe_batch',
            safety_limit: 2,
            next_batch_brief: {
              chapterRangeLabel: '第9-10章',
              batchGoal: '三章内进入内门视野。',
              readerPayoffPlan: '升级、打脸、规则反制逐章交付。',
              mainlineFocus: '外门危机 -> 内门招揽',
              forbiddenBoundary: '第10章前不得揭露规则源头。',
              chapters: [
                { chapterNo: 9, title: '阵盘裂纹', chapterTask: '兑现阵盘反噬回报。' },
                { chapterNo: 10, title: '外门震动', chapterTask: '推进到内门视野。' },
              ],
            },
          }),
          output_ref: JSON.stringify({
            total: 2,
            success: 2,
            failed: 0,
            chapters: [
              { id: 9, chapter_no: 9, title: '阵盘裂纹', status: 'success', score: 85, word_count: 3090 },
              { id: 10, chapter_no: 10, title: '外门震动', status: 'success', score: 86, word_count: 3021 },
            ],
          }),
        },
        {
          id: 11,
          run_type: 'longform_production_repair',
          created_at: '2026-06-03T02:00:00.000Z',
          status: 'completed',
          input_ref: JSON.stringify({ source: 'auto_creation_safe_batch_risk', batch_created_at: '2026-06-03T00:00:00.000Z' }),
          output_ref: JSON.stringify({
            tasks: [
              { task_type: 'repair_quality', issue_type: 'batch_brief_mismatch', task_status: 'resolved', chapter_id: 9, chapter_no: 9 },
              { task_type: 'repair_quality', issue_type: 'batch_brief_mismatch', task_status: 'resolved', chapter_id: 10, chapter_no: 10 },
            ],
          }),
        },
      ],
    } as any)

    expect(model.batchReviewQueue.status).toBe('done')
    expect(model.batchReviewQueue.riskRadar.status).toBe('ok')
    expect(model.batchReviewQueue.riskRadar.payoffDebtCount).toBe(0)
    expect(model.batchReviewQueue.riskRadar.storylineRiskCount).toBe(0)
    expect(model.batchReviewQueue.riskRadar.batchPlanRiskCount).toBe(0)
    expect(model.batchReviewQueue.riskRadar.repairTasks).toHaveLength(0)
  })

  test('keeps acceptance workflow as the only next step after prose exists', () => {
    const model = buildAutoCreationDirectorModel({
      planning: basePlanning,
      writing: {
        ...baseWriting,
        nextChapter: { ...baseWriting.nextChapter, wordCount: 3200, hasProse: true },
        chapterAcceptanceDesk: {
          ...baseWriting.chapterAcceptanceDesk,
          visible: true,
          acceptanceStatus: 'needs_quality_check',
          statusLabel: '需复检',
          acceptanceReasons: ['本章已有正文，但还没有当前章节的质量复检记录。'],
          recommendedAcceptanceAction: { key: 'refresh_current_quality', label: '复检当前版本' },
        },
        topStatus: { ...baseWriting.topStatus, nextActionLabel: '复检当前版本', primaryActionKey: 'refresh_current_quality' },
        primaryActionKey: 'refresh_current_quality',
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.status).toBe('needs_acceptance')
    expect(model.mainAction.area).toBe('writing')
    expect(model.mainAction.key).toBe('refresh_current_quality')
    expect(model.mainAction.label).toBe('复检当前版本')
    expect(model.pipeline.find(step => step.key === 'quality_gate')?.status).toBe('active')
  })
})

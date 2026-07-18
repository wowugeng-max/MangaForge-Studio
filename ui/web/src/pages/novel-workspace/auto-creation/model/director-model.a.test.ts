import { describe, expect, test } from 'bun:test'
import { buildAutoCreationDirectorModel, buildStyleSampleTaskBookRecheckPlan } from './director-model'
import {
  basePlanning,
  baseWriting,
  safeBatchFutureRoute,
  futureRouteRange,
  readySafeBatchPlanning,
  readySafeBatchWriting,
  recoveryEvidenceFailureRun,
  recoveryEvidenceDeepRepairRun,
  strengthenedRepairReleaseSummary,
  buildStrengthenedRepairAcceptanceInput,
  strengthenedAcceptanceBatchRun,
  expandedSafeBatchRun,
  restoredFiveChapterBatchRun,
  defaultFiveChapterLaneBatchRun,
  expansionStructureVerification,
  expansionStructureValidationBatchRun,
  defaultRegressionValidationBatchRun,
  defaultLaneTemplateValidationBatchRun,
  strengthenedAcceptanceQualityReviews,
} from './director-model.test-fixtures'

describe('buildAutoCreationDirectorModel a', () => {
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

  test('surfaces a first manual test calibration gate before claiming longform readiness', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          targetWords: 10000000,
        },
      },
      writing: baseWriting,
      activeTasks: [],
      selectedModelId: 12,
      storyState: {
        last_updated_chapter: 7,
        global: {
          core_promise: '寒门少年以阵法反压宗门秩序',
          current_volume_goal: '进入内门视野',
        },
      },
    })

    expect(model.manualTestReadiness.status).toBe('blocked')
    expect(model.manualTestReadiness.label).toContain('首测校准')
    expect(model.manualTestReadiness.primaryAction.key).toBe('longform_creation_diagnosis')
    expect(model.manualTestReadiness.gates.map(item => item.key)).toEqual([
      'commercial_benchmark',
      'reader_trial',
      'longrun_stress',
      'memory_canon',
    ])
    expect(model.manualTestReadiness.gates.find(item => item.key === 'commercial_benchmark')?.detail).toContain('起点1万均订')
    expect(model.manualTestReadiness.gates.find(item => item.key === 'reader_trial')?.action.key).toBe('run_reader_trial_review')
    expect(model.manualTestReadiness.gates.find(item => item.key === 'longrun_stress')?.detail).toContain('30/100/300章')
    expect(model.manualTestReadiness.handoffChecklist).toContain('先跑长篇创作健康诊断，确认核心不偏、故事强度、创新差异和读者吸引。')
  })

  test('builds a single repair plan for blocked auto creation gates', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          targetWords: 10000000,
        },
        first30Retention: {
          ...basePlanning.first30Retention,
          status: 'missing',
          score: 45,
          summary: '尚未运行前30章留存诊断。',
          actionKey: 'run_first30_retention',
        },
      },
      writing: baseWriting,
      activeTasks: [],
      selectedModelId: 12,
      reviews: [
        {
          id: 205,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-04T01:04:00.000Z',
          status: 'warn',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            self_check: {
              review: {
                score: 84,
                passed: false,
                status: 'warn',
                quality_audit_checks: [
                  {
                    key: 'reader_retention_open_loop',
                    label: '读者追读',
                    status: 'fail',
                    evidence: '章末没有留下未解决问题。',
                    fix: '重做章末追读钩子。',
                  },
                ],
              },
            },
          }),
        },
      ],
      storyState: {
        last_updated_chapter: 7,
        global: {
          core_promise: '寒门少年以阵法反压宗门秩序',
          current_volume_goal: '进入内门视野',
        },
      },
    })

    expect(model.repairPlan.visible).toBe(true)
    expect(model.repairPlan.primaryAction.key).toBe('auto_repair_blockers')
    expect(model.repairPlan.primaryAction.label).toBe('自动修复阻塞')
    expect(model.repairPlan.actions.map(action => action.key)).toEqual([
      'longform_creation_diagnosis',
      'run_first30_retention',
      'run_reader_trial_review',
      'longform_pressure',
      'create_delivery_risk_repair',
    ])
    expect(model.repairPlan.autoActionCount).toBe(5)
    expect(model.repairPlan.panelActionCount).toBe(0)
    expect(model.repairPlan.summary).toContain('5项')
  })

  test('marks first manual test calibration ready only after commercial, reader and long-run reports pass', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          targetWords: 10000000,
        },
      },
      writing: baseWriting,
      activeTasks: [],
      selectedModelId: 12,
      storyState: {
        last_updated_chapter: 7,
        global: {
          core_promise: '寒门少年以阵法反压宗门秩序',
          current_volume_goal: '进入内门视野',
          open_questions: ['祖阵来源仍需追问'],
          payoff_queue: ['内门视野必须给出新资源回报'],
        },
        characters: [
          { name: '陆沉', status: '外门试炼胜者', location: '宗门外门' },
        ],
      },
      reviews: [
        {
          id: 901,
          review_type: 'longform_creation_diagnosis',
          created_at: '2026-06-10T01:00:00.000Z',
          payload: JSON.stringify({
            report: {
              score: 88,
              status: 'ready',
              quality_bar_label: '起点1万均订基础线',
              dimensions: [
                { key: 'core', label: '核心不偏', status: 'ok', detail: '核心稳定', evidence: ['承诺清晰'] },
                { key: 'story', label: '故事强度', status: 'ok', detail: '故事稳定', evidence: ['压力阶梯'] },
                { key: 'innovation', label: '创新差异', status: 'ok', detail: '机制新鲜', evidence: ['阵法代价'] },
                { key: 'reader_pull', label: '读者吸引', status: 'ok', detail: '追读稳定', evidence: ['前30章 86分'] },
              ],
            },
          }),
        },
        {
          id: 902,
          review_type: 'reader_trial_review',
          created_at: '2026-06-10T01:10:00.000Z',
          payload: JSON.stringify({
            report: {
              score: 84,
              status: 'ready',
              quality_bar_label: '起点1万均订试读基准',
              summary: '读者试读吸引力达到稳定追读基础。',
              drop_points: [],
              repair_actions: [],
            },
          }),
        },
        {
          id: 903,
          review_type: 'longform_pressure_test',
          created_at: '2026-06-10T01:20:00.000Z',
          payload: JSON.stringify({
            report: {
              score: 88,
              status: 'scalable',
              summary: '具备千万字级长线扩容基础。',
              target_words_range: { min: 3000000, max: 10000000 },
              stress_gates: [
                { key: 'chapter_30', label: '30章试读段', status: 'ok', detail: '开篇追读稳定。' },
                { key: 'chapter_100', label: '100章卷级闭环', status: 'ok', detail: '未来100章储备充足。' },
                { key: 'chapter_300', label: '300章扩容引擎', status: 'ok', detail: '扩展引擎可持续。' },
                { key: 'memory_canon', label: '正史记忆/版本', status: 'ok', detail: '状态机、开放悬念和回报债可回溯。' },
              ],
            },
          }),
        },
      ],
    })

    expect(model.manualTestReadiness.status).toBe('ready')
    expect(model.manualTestReadiness.primaryAction.key).toBe('enter_chapter_writing')
    expect(model.manualTestReadiness.gates.every(item => item.status === 'ok')).toBe(true)
    expect(model.manualTestReadiness.summary).toContain('可以进入第一次手工测试')
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

  test('serial cockpit queues relationship graph risks before unattended drafting', () => {
    const model = buildAutoCreationDirectorModel({
      planning: basePlanning,
      writing: {
        ...baseWriting,
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'needs_context',
          statusLabel: '资产关系待确认',
          reasons: ['关系图风险：旧钥匙还没有和主角、禁门规则或章末钩子建立关系'],
          recommendedPlannerAction: { key: 'open_story_assets', label: '打开设定资产' },
        },
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    const risk = model.serialCockpit.riskQueue.find(item => item.key === 'asset_relationships')
    expect(risk?.label).toBe('资产关系待确认')
    expect(risk?.detail).toContain('旧钥匙')
    expect(risk?.action.key).toBe('open_story_assets')
    expect(risk?.action.area).toBe('planning')
  })

  test('serial cockpit queues unmapped quality-continuity scene work before drafting', () => {
    const model = buildAutoCreationDirectorModel({
      planning: basePlanning,
      writing: {
        ...baseWriting,
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'needs_scene_plan',
          statusLabel: '需补质量续航落点',
          scenePlanStatus: 'ready',
          sceneCards: [
            { title: '审判厅入场', goal: '主角进入审判厅' },
          ],
          qualityContinuitySceneMap: [],
          reasons: [
            '检测到 delivery_risk_carry_over / 质量续航动作，但当前场景卡没有写入 serial_risk_repairs、recent_fatigue_action、required_beats 或章末钩子落点。',
          ],
          recommendedPlannerAction: { key: 'build_scene_plan', label: '补续航场景' },
          episodePlan: {
            deliveryRiskCarryOver: {
              openingActions: ['前300字先让旧账压迫重新逼近主角'],
              middleActions: ['中段用新证据推动目标并改变盟友立场'],
              endingActions: ['章末抛出第三个名字作为追读钩子'],
            },
          },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '补续航场景',
          primaryActionKey: 'build_scene_plan',
        },
        primaryActionKey: 'build_scene_plan',
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    const risk = model.serialCockpit.riskQueue.find(item => item.key === 'quality_continuity_scene_map')
    expect(risk?.label).toBe('需补质量续航落点')
    expect(risk?.count).toBe(3)
    expect(risk?.detail).toContain('delivery_risk_carry_over')
    expect(risk?.action.key).toBe('build_scene_plan')
    expect(model.serialCockpit.guardrails.find(item => item.key === 'reader_pull')?.status).toBe('warn')
    expect(model.serialCockpit.chapterChain.find(item => item.key === 'brief')?.status).toBe('current')
    expect(model.serialCockpit.chapterChain.find(item => item.key === 'draft')?.status).toBe('pending')
  })

})

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
    expect(model.batchGuardrail.preflight.inputSnapshot.recovery_evidence_release_summary).toMatchObject({
      status: 'released',
      source: 'recovery_evidence_governance_queue',
      safe_chapter_count: 3,
      allowed_chapter_nos: [8, 9, 10],
      next_batch_label: '第8-10章',
      cleared_source_count: 2,
    })
    expect(model.batchGuardrail.preflight.inputSnapshot.recovery_evidence_release_summary.evidence).toEqual(expect.arrayContaining([
      '恢复依据治理队列已闭环',
      '单章治理复查：生产阻断已解除',
      '批次恢复复查：生产阻断已解除',
    ]))
    expect(model.batchGuardrail.recommendedAction.payload?.batch_preflight?.recovery_evidence_release_summary).toMatchObject({
      status: 'released',
      cleared_source_count: 2,
    })
    expect(model.batchGuardrail.briefRecovery.evidence).toContain('恢复依据治理队列已闭环')
    expect(model.productionLicense.reasons).toContain('恢复依据治理队列已闭环')
    expect(model.todayCommandDeck.releaseRationale.checks).toContain('恢复依据治理队列已闭环')
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
    expect(model.batchGuardrail.recommendedAction.key).toBe('create_recovery_evidence_governance_queue')
    expect(model.batchGuardrail.recommendedAction.label).toBe('生成恢复依据治理队列')
    expect(model.batchGuardrail.recommendedAction.payload?.recoveryEvidenceNextAction).toEqual(expect.objectContaining({
      action: 'focus_task',
      label: '定位批次任务',
      source: 'safe_batch_recovery_recheck',
      residualEvidence: ['第43章读者回报仍未继承'],
    }))
    expect(model.batchGuardrail.recommendedAction.payload?.recoveryEvidenceGovernanceQueue).toEqual(expect.objectContaining({
      source: 'recovery_evidence_production_gate',
      summary: expect.stringContaining('定位批次任务'),
      main_action: expect.objectContaining({
        action: 'focus_task',
        label: '定位批次任务',
        source: 'safe_batch_recovery_recheck',
      }),
      source_count: 2,
      tasks: [
        expect.objectContaining({
          issue_type: 'recovery_evidence_governance_queue',
          source: 'single_chapter_governance_recheck',
          action_key: 'recheck_single_chapter',
          recheck_mode: 'single_chapter',
          recheck_source: 'governance_recheck_sync',
          source_task_index: 0,
          chapter_no: 42,
          closure_status: 'blocked_until_recheck',
          auto_recheck: true,
          task_status: 'needs_review',
        }),
        expect.objectContaining({
          issue_type: 'recovery_evidence_governance_queue',
          source: 'safe_batch_recovery_recheck',
          action_key: 'focus_task',
          recheck_mode: 'manual_then_batch_audit',
          recheck_source: 'longform_repair_audit_summary',
          source_task_index: 1,
          chapter_no: 43,
          requires_manual_repair: true,
          closure_status: 'blocked_until_batch_audit',
          task_status: 'needs_review',
          recovery_evidence_review: expect.objectContaining({
            failed_evidence: ['第43章读者回报仍未继承'],
          }),
        }),
      ],
    }))
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
      recommended_action: {
        key: 'create_recovery_evidence_governance_queue',
        label: '生成恢复依据治理队列',
      },
    })
    expect(model.todayCommandDeck.releaseRationale.checks.join('；')).toContain('恢复依据生产闸门')
    expect(model.productionLicense.status).toBe('blocked')
  })

  test('routes pending single-chapter recovery evidence gate to the single recheck main action', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        futureRoute: [
          { chapterNo: 8, title: '试炼前夜', chapterTask: '主角拿到试炼资格', conflict: '执事设局阻拦', endingHook: '阵盘亮起第二道裂纹', mainlineProgress: '进入外门试炼核心局', riskTags: [] },
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
          id: 903,
          run_type: 'longform_production_repair',
          created_at: '2026-06-14T10:00:00Z',
          output_ref: {
            audit_summary: {
              status: 'closed',
              recovery_evidence_closure: {
                status: 'closed',
                total: 1,
                resolved: 1,
                tasks: [
                  {
                    chapter_no: 42,
                    task_index: 0,
                    task_status: 'open',
                    source: 'single_chapter_governance_recheck',
                    source_label: '单章治理复查',
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

    expect(model.batchGuardrail.recommendedAction.key).toBe('create_recovery_evidence_governance_queue')
    expect(model.batchGuardrail.recommendedAction.label).toBe('生成恢复依据治理队列')
    expect(model.batchGuardrail.recommendedAction.payload?.recoveryEvidenceNextAction).toEqual(expect.objectContaining({
      action: 'recheck_single_chapter',
      label: '复检单章',
      source: 'single_chapter_governance_recheck',
    }))
    expect(model.batchGuardrail.recommendedAction.payload?.recoveryEvidenceGovernanceQueue).toEqual(expect.objectContaining({
      source: 'recovery_evidence_production_gate',
      summary: expect.stringContaining('复检单章'),
      main_action: expect.objectContaining({
        action: 'recheck_single_chapter',
        label: '复检单章',
      }),
      tasks: [
        expect.objectContaining({
          source: 'single_chapter_governance_recheck',
          action_key: 'recheck_single_chapter',
          recheck_mode: 'single_chapter',
          recheck_source: 'governance_recheck_sync',
          source_task_index: 0,
          chapter_no: 42,
          closure_status: 'blocked_until_recheck',
          auto_recheck: true,
          task_status: 'needs_review',
        }),
      ],
    }))
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

  test('blocks unattended drafting when write preparation still needs confirmation', () => {
    const model = buildAutoCreationDirectorModel({
      planning: basePlanning,
      writing: readySafeBatchWriting({
        chapterPlanningDesk: {
          writePreparationBrief: {
            readinessStatus: 'needs_context',
            sourceGaps: ['上一章正文或上一章承接｜状态=missing｜缺少上一章承接'],
            assetRisks: ['旧钥匙(isolated_key_asset)：旧钥匙还没有和禁门规则建立现场关系'],
            deliveryRiskActions: ['前 300 字先接住上一章门外黑影压迫'],
            blueprintFocus: ['开篇钩子：警钟第三响压入筵席'],
            readerPayoffFocus: ['读者回报：失势皇子第一次当众夺回主动权'],
            mustConfirm: ['补上旧钥匙的现场功能和代价。'],
            executionOrder: ['先确认来源就绪，再进入场景卡。'],
          },
          reasons: ['写前准备待确认：上一章正文或旧钥匙资产关系未确认'],
          recommendedPlannerAction: { key: 'open_generation_diagnostics', label: '查看生成诊断' },
        },
      }),
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.chapterLaunchGate.status).toBe('blocked')
    expect(model.chapterLaunchGate.signals.find(signal => signal.key === 'write_preparation')?.status).toBe('block')
    expect(model.chapterLaunchGate.signals.find(signal => signal.key === 'write_preparation')?.detail).toContain('上一章正文')
    expect(model.statusLabel).toBe('开写门禁')
    expect(model.mainAction.key).toBe('open_generation_diagnostics')
    expect(model.confirmations).toContain('本章开写门禁未通过')
  })

  test('keeps execution risks in the chapter contract without blocking the launch gate', () => {
    const writing = readySafeBatchWriting({
      chapterPlanningDesk: {
        reasons: [],
        recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        writePreparationBrief: {
          readinessStatus: 'ready',
          sourceGaps: [],
          assetRisks: ['旧钥匙需要在现场建立触发条件和代价'],
          deliveryRiskActions: ['前300字接住上一章围捕压力'],
          rollingRhythmPreflight: {
            principle: '拉期待速度 > 断期待速度',
            nextActions: ['先铺下一目标，再兑现当前回报'],
          },
          blueprintFocus: ['开篇钩子：山路第一轮截杀'],
          readerPayoffFocus: ['读者回报：现场验证旧方案失效'],
          mustConfirm: ['旧钥匙风险动作必须进入写后回执。'],
          executionOrder: ['按场景顺序执行并核验。'],
        },
      },
    })
    expect(writing.chapterPlanningDesk.readiness).toBe('ready')
    expect(writing.chapterPlanningDesk.scenePlanStatus).toBe('ready')
    expect(writing.chapterPlanningDesk.sceneCards).toHaveLength(2)

    const model = buildAutoCreationDirectorModel({
      planning: basePlanning,
      writing,
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.chapterLaunchGate.signals.find(signal => signal.key === 'write_preparation')).toBeUndefined()
    expect(model.chapterLaunchGate.status).toBe('ready')
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

  test('downgrades safe batching when the same recovery evidence source repeatedly fails after release', () => {
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
          id: 501,
          run_type: 'longform_production_repair',
          created_at: '2026-06-06T00:00:00.000Z',
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
        },
        {
          id: 502,
          run_type: 'longform_production_repair',
          created_at: '2026-06-07T00:00:00.000Z',
          status: 'ready',
          output_ref: JSON.stringify({
            report: { source: 'auto_creation_safe_batch_risk' },
            tasks: [
              {
                issue_type: 'recovery_evidence_mismatch',
                recovery_evidence_regovernance_queue: {
                  source: 'recovery_evidence_release_summary',
                  tasks: [
                    {
                      issue_type: 'recovery_evidence_governance_queue',
                      evidence: '单章治理复查：生产阻断已解除',
                      source: 'single_chapter_governance_recheck',
                      source_label: '单章治理复查',
                      action_key: 'recheck_single_chapter',
                      action_label: '复检单章',
                    },
                  ],
                },
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
        },
        {
          id: 503,
          run_type: 'longform_production_repair',
          created_at: '2026-06-06T12:00:00.000Z',
          updated_at: '2026-06-06T12:30:00.000Z',
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
                action_label: '深修单章任务书',
                task_status: 'resolved',
                updated_at: '2026-06-06T12:30:00.000Z',
                deep_repair_direction: '深层修复方向：回到单章任务书，确认治理复查证据已经写成正文里的可见冲突、对白动作、读者回报和章末钩子。',
                recovery_evidence_review: {
                  failed_evidence: ['单章治理复查：生产阻断已解除'],
                },
              },
            ],
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
      },
    } as any)

    const profileSignal = model.batchGuardrail.guardrails.find(item => item.label === '恢复依据画像')
    const deepRepairDirection = model.batchGuardrail.recoveryEvidenceTrend.sources[0]?.deepRepairDirection || ''

    expect(model.batchGuardrail.status).toBe('caution')
    expect(model.batchGuardrail.safeChapterCount).toBe(1)
    expect(profileSignal?.status).toBe('warn')
    expect(profileSignal?.detail).toContain('单章治理复查反复放行失败 2 次')
    expect(model.batchGuardrail.preflight.inputSnapshot.recovery_evidence_source_risk_profile).toMatchObject({
      status: 'warn',
      repeat_source_count: 1,
      sources: [
        expect.objectContaining({
          source: 'single_chapter_governance_recheck',
          label: '单章治理复查',
          release_failure_count: 2,
          deep_repair_effect: expect.objectContaining({
            status: 'recurred',
            label: '深修后仍失效',
            post_repair_failure_count: 1,
            latest_repair_action_label: '深修单章任务书',
          }),
        }),
      ],
    })
    expect(model.batchGuardrail.recoveryEvidenceTrend).toMatchObject({
      visible: true,
      status: 'warn',
      totalFailureCount: 2,
      repeatSourceCount: 1,
      sources: [
        expect.objectContaining({
          source: 'single_chapter_governance_recheck',
          label: '单章治理复查',
          releaseFailureCount: 2,
          trendLabel: '近2轮失败',
          deepRepairEffect: expect.objectContaining({
            status: 'recurred',
            label: '深修后仍失效',
            postRepairFailureCount: 1,
            latestRepairActionLabel: '深修单章任务书',
          }),
        }),
      ],
    })
    expect(model.batchGuardrail.recoveryEvidenceTrend.summary).toContain('单章治理复查近2轮放行后失效')
    expect(deepRepairDirection.includes('回到单章任务书')).toBe(true)
    expect(model.batchGuardrail.recommendedAction.key).toBe('create_recovery_evidence_governance_queue')
    expect(model.batchGuardrail.recommendedAction.label).toBe('生成强化深修队列')
    expect(model.batchGuardrail.recommendedAction.payload?.recoveryEvidenceGovernanceQueue).toEqual(expect.objectContaining({
      source: 'recovery_evidence_source_risk_profile',
      label: '恢复依据画像强化深修',
      task_count: 1,
      tasks: [
        expect.objectContaining({
          issue_type: 'recovery_evidence_governance_queue',
          source: 'single_chapter_governance_recheck',
          source_status: 'repeated_release_failure',
          action_key: 'deep_repair_single_brief',
          action_label: '强化单章任务书复盘',
          deep_repair_level: 'escalated_after_recurrence',
          deep_repair_direction: expect.stringContaining('回到单章任务书'),
          recovery_evidence_review: expect.objectContaining({
            failed_evidence: ['单章治理复查：生产阻断已解除'],
          }),
        }),
      ],
    }))
    expect(model.batchGuardrail.recommendedAction.payload?.recoveryEvidenceGovernanceQueue?.recommendations).toEqual(expect.arrayContaining([
      expect.stringContaining('回到单章任务书'),
    ]))
    expect(model.productionLicense.status).toBe('single_chapter')
    expect(model.productionLicense.reasons).toEqual(expect.arrayContaining([
      expect.stringContaining('单章治理复查反复放行失败 2 次'),
    ]))
    expect(model.todayCommandDeck.releaseRationale.allowedCount).toBe(1)
    expect(model.todayCommandDeck.releaseRationale.checks).toEqual(expect.arrayContaining([
      expect.stringContaining('单章治理复查反复放行失败 2 次'),
    ]))
  })

  test('keeps recovered recovery evidence sources under observation instead of regenerating deep repair tasks', () => {
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
          id: 511,
          run_type: 'longform_production_repair',
          created_at: '2026-06-06T00:00:00.000Z',
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
                      source_action: 'single_chapter_governance_recheck',
                      production_gate_source: 'single_chapter_governance_recheck',
                    },
                  ],
                },
              },
            ],
          }),
        },
        {
          id: 512,
          run_type: 'longform_production_repair',
          created_at: '2026-06-07T00:00:00.000Z',
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
                      source_action: 'single_chapter_governance_recheck',
                      production_gate_source: 'single_chapter_governance_recheck',
                    },
                  ],
                },
              },
            ],
          }),
        },
        {
          id: 513,
          run_type: 'longform_production_repair',
          created_at: '2026-06-08T00:00:00.000Z',
          updated_at: '2026-06-08T00:30:00.000Z',
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
                action_label: '深修单章任务书',
                task_status: 'resolved',
                updated_at: '2026-06-08T00:30:00.000Z',
              },
            ],
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
      },
    } as any)

    expect(model.batchGuardrail.recoveryEvidenceTrend.sources[0]?.deepRepairEffect).toMatchObject({
      status: 'observing',
      label: '深修后暂无再失效',
      postRepairFailureCount: 0,
    })
    expect(model.batchGuardrail.recommendedAction.key).toBe('open_task_center')
    expect(model.batchGuardrail.recommendedAction.label).toBe('查看深修观察')
    expect(model.batchGuardrail.recommendedAction.payload?.recoveryEvidenceGovernanceQueue?.task_count).toBe(0)
  })

  test('keeps safe batching downgraded while strengthened recovery evidence repair is waiting for recheck', () => {
    const model = buildAutoCreationDirectorModel({
      planning: readySafeBatchPlanning(),
      writing: readySafeBatchWriting(),
      activeTasks: [],
      selectedModelId: 12,
      runRecords: [
        recoveryEvidenceFailureRun(521, '2026-06-06T00:00:00.000Z'),
        recoveryEvidenceDeepRepairRun({
          id: 522,
          createdAt: '2026-06-06T12:00:00.000Z',
          updatedAt: '2026-06-06T12:30:00.000Z',
          taskStatus: 'resolved',
          actionLabel: '深修单章任务书',
          deepRepairLevel: 'first_deep_repair',
        }),
        recoveryEvidenceFailureRun(523, '2026-06-07T00:00:00.000Z'),
        recoveryEvidenceDeepRepairRun({
          id: 524,
          createdAt: '2026-06-08T00:00:00.000Z',
          taskStatus: 'needs_review',
          actionLabel: '强化单章任务书复盘',
          deepRepairLevel: 'escalated_after_recurrence',
        }),
      ],
      storyState: {
        last_updated_chapter: 7,
        global: {
          core_promise: '李超用超人蛮力碰撞规则怪谈，张智负责拆解规则。',
          current_volume_goal: '午夜校园中活过第一轮规则。',
        },
      },
    } as any)

    expect(model.batchGuardrail.status).toBe('caution')
    expect(model.batchGuardrail.safeChapterCount).toBe(1)
    expect(model.productionLicense.status).toBe('single_chapter')
    expect(model.batchGuardrail.recommendedAction.key).toBe('open_task_center')
    expect(model.batchGuardrail.recommendedAction.label).toBe('查看强化深修复检')
    expect(model.batchGuardrail.recommendedAction.payload?.recoveryEvidenceGovernanceQueue?.task_count).toBe(0)
    expect(model.batchGuardrail.recoveryEvidenceTrend.sources[0]?.deepRepairEffect).toMatchObject({
      status: 'recurred',
      strengthenedClosure: {
        status: 'pending_recheck',
        label: '强化深修待复检',
      },
    })
    expect(model.batchGuardrail.preflight.inputSnapshot.recovery_evidence_source_risk_profile).toMatchObject({
      status: 'warn',
      sources: [
        expect.objectContaining({
          source: 'single_chapter_governance_recheck',
          deep_repair_effect: expect.objectContaining({
            strengthened_repair_closure: expect.objectContaining({
              status: 'pending_recheck',
              label: '强化深修待复检',
            }),
          }),
        }),
      ],
    })
  })

  test('restores safe batching after strengthened recovery evidence repair converges', () => {
    const model = buildAutoCreationDirectorModel({
      planning: readySafeBatchPlanning(),
      writing: readySafeBatchWriting(),
      activeTasks: [],
      selectedModelId: 12,
      runRecords: [
        recoveryEvidenceFailureRun(531, '2026-06-06T00:00:00.000Z'),
        recoveryEvidenceDeepRepairRun({
          id: 532,
          createdAt: '2026-06-06T12:00:00.000Z',
          updatedAt: '2026-06-06T12:30:00.000Z',
          taskStatus: 'resolved',
          actionLabel: '深修单章任务书',
          deepRepairLevel: 'first_deep_repair',
        }),
        recoveryEvidenceFailureRun(533, '2026-06-07T00:00:00.000Z'),
        recoveryEvidenceDeepRepairRun({
          id: 534,
          createdAt: '2026-06-08T00:00:00.000Z',
          updatedAt: '2026-06-08T00:30:00.000Z',
          taskStatus: 'resolved',
          actionLabel: '强化单章任务书复盘',
          deepRepairLevel: 'escalated_after_recurrence',
        }),
      ],
      storyState: {
        last_updated_chapter: 7,
        global: {
          core_promise: '李超用超人蛮力碰撞规则怪谈，张智负责拆解规则。',
          current_volume_goal: '午夜校园中活过第一轮规则。',
        },
      },
    } as any)

    expect(model.batchGuardrail.status).toBe('ready')
    expect(model.batchGuardrail.safeChapterCount).toBe(3)
    expect(model.batchGuardrail.recommendedAction.key).toBe('start_safe_batch_generation')
    expect(model.productionLicense.status).toBe('batch_allowed')
    expect(model.productionLicense.safeChapterCount).toBe(3)
    expect(model.batchGuardrail.recoveryEvidenceTrend).toMatchObject({
      status: 'ok',
      sources: [
        expect.objectContaining({
          source: 'single_chapter_governance_recheck',
          deepRepairEffect: expect.objectContaining({
            status: 'observing',
            label: '深修后暂无再失效',
            latestRepairActionLabel: '强化单章任务书复盘',
            strengthenedClosure: expect.objectContaining({
              status: 'converged',
              label: '强化深修已收敛',
            }),
          }),
        }),
      ],
    })
    expect(model.batchGuardrail.preflight.inputSnapshot.recovery_evidence_source_risk_profile).toMatchObject({
      status: 'ok',
      sources: [
        expect.objectContaining({
          source: 'single_chapter_governance_recheck',
          deep_repair_effect: expect.objectContaining({
            strengthened_repair_closure: expect.objectContaining({
              status: 'converged',
              label: '强化深修已收敛',
            }),
          }),
        }),
      ],
    })
    expect(model.batchGuardrail.preflight.inputSnapshot.recovery_evidence_release_summary).toMatchObject({
      status: 'released',
      strengthened_repair_source_count: 1,
      evidence: expect.arrayContaining([
        '单章治理复查：强化深修已收敛',
      ]),
    })
    expect(model.productionLicense.reasons).toContain('单章治理复查：强化深修已收敛')
  })

  test('records a long-term trend when strengthened recovery batches pass core payoff and reader pull acceptance', () => {
    const model = buildAutoCreationDirectorModel({
      planning: readySafeBatchPlanning(),
      writing: readySafeBatchWriting(),
      activeTasks: [],
      selectedModelId: 12,
      runRecords: [
        recoveryEvidenceFailureRun(541, '2026-06-06T00:00:00.000Z'),
        recoveryEvidenceDeepRepairRun({
          id: 542,
          createdAt: '2026-06-06T12:00:00.000Z',
          updatedAt: '2026-06-06T12:30:00.000Z',
          taskStatus: 'resolved',
          actionLabel: '深修单章任务书',
          deepRepairLevel: 'first_deep_repair',
        }),
        recoveryEvidenceFailureRun(543, '2026-06-07T00:00:00.000Z'),
        recoveryEvidenceDeepRepairRun({
          id: 544,
          createdAt: '2026-06-08T00:00:00.000Z',
          updatedAt: '2026-06-08T00:30:00.000Z',
          taskStatus: 'resolved',
          actionLabel: '强化单章任务书复盘',
          deepRepairLevel: 'escalated_after_recurrence',
        }),
        strengthenedAcceptanceBatchRun({ id: 545, createdAt: '2026-06-09T00:00:00.000Z', chapterNos: [41, 42, 43] }),
        strengthenedAcceptanceBatchRun({ id: 546, createdAt: '2026-06-10T00:00:00.000Z', chapterNos: [44, 45, 46] }),
      ],
      chapters: [41, 42, 43, 44, 45, 46].map(chapterNo => ({
        id: chapterNo,
        chapter_no: chapterNo,
        title: `强化趋势${chapterNo}`,
        chapter_text: '强化趋势正文'.repeat(500),
      })),
      reviews: [
        ...strengthenedAcceptanceQualityReviews([41, 42, 43], 4601, '2026-06-09T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([44, 45, 46], 4611, '2026-06-10T01:00:00.000Z'),
      ],
      storyState: {
        last_updated_chapter: 46,
        global: {
          core_promise: '李超用超人蛮力碰撞规则怪谈，张智负责拆解规则。',
          current_volume_goal: '午夜校园中活过第一轮规则。',
        },
      },
    } as any)

    const acceptanceTrend = (model.batchGuardrail.recoveryEvidenceTrend as any).strengthenedAcceptanceTrend
    const trendSignal = model.batchGuardrail.guardrails.find(item => item.label === '强化恢复验收趋势')

    expect(model.batchGuardrail.status).toBe('ready')
    expect(model.batchGuardrail.safeChapterCount).toBe(3)
    expect(trendSignal?.status).toBe('ok')
    expect(acceptanceTrend).toMatchObject({
      visible: true,
      status: 'ok',
      acceptedBatchCount: 2,
      failedBatchCount: 0,
      passStreak: 2,
      latestStatus: 'ok',
      dimensions: {
        core: { failedCount: 0 },
        payoff: { failedCount: 0 },
        readerPull: { failedCount: 0 },
      },
    })
    expect(acceptanceTrend.summary).toContain('连续 2 批通过')
    expect(model.batchGuardrail.preflight.inputSnapshot.strengthened_repair_acceptance_trend).toMatchObject({
      status: 'ok',
      pass_streak: 2,
    })
    expect(model.productionLicense.status).toBe('batch_allowed')
  })

  test('expands the safe batch only after three strengthened recovery acceptance passes', () => {
    const expandedFutureRoute = [
      ...safeBatchFutureRoute,
      { chapterNo: 11, title: '内门门槛', chapterTask: '主角第一次触碰内门条件', conflict: '招揽背后藏着交换代价', endingHook: '长老递来一枚禁阵令', mainlineProgress: '进入内门势力博弈', riskTags: [] },
      { chapterNo: 12, title: '禁阵令', chapterTask: '主角用禁阵令反逼对手表态', conflict: '同门要求主角公开阵盘来源', endingHook: '阵盘浮出第二层铭文', mainlineProgress: '扩大阵盘主线谜团', riskTags: [] },
    ]
    const model = buildAutoCreationDirectorModel({
      planning: readySafeBatchPlanning({ futureRoute: expandedFutureRoute }),
      writing: readySafeBatchWriting(),
      activeTasks: [],
      selectedModelId: 12,
      runRecords: [
        strengthenedAcceptanceBatchRun({ id: 565, createdAt: '2026-06-09T00:00:00.000Z', chapterNos: [41, 42, 43] }),
        strengthenedAcceptanceBatchRun({ id: 566, createdAt: '2026-06-10T00:00:00.000Z', chapterNos: [44, 45, 46] }),
        strengthenedAcceptanceBatchRun({ id: 567, createdAt: '2026-06-11T00:00:00.000Z', chapterNos: [47, 48, 49] }),
      ],
      chapters: [41, 42, 43, 44, 45, 46, 47, 48, 49].map(chapterNo => ({
        id: chapterNo,
        chapter_no: chapterNo,
        title: `强化扩批${chapterNo}`,
        chapter_text: '强化扩批正文'.repeat(500),
      })),
      reviews: [
        ...strengthenedAcceptanceQualityReviews([41, 42, 43], 4631, '2026-06-09T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([44, 45, 46], 4641, '2026-06-10T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([47, 48, 49], 4651, '2026-06-11T01:00:00.000Z'),
      ],
      storyState: {
        last_updated_chapter: 49,
        global: {
          core_promise: '李超用超人蛮力碰撞规则怪谈，张智负责拆解规则。',
          current_volume_goal: '午夜校园中活过第一轮规则。',
        },
      },
    } as any)

    const expansionSignal = model.batchGuardrail.guardrails.find(item => item.label === '强化扩批规则')

    expect(model.batchGuardrail.status).toBe('ready')
    expect(model.batchGuardrail.safeChapterCount).toBe(5)
    expect(model.batchGuardrail.preflight.allowedChapterNos).toEqual([8, 9, 10, 11, 12])
    expect(expansionSignal?.status).toBe('ok')
    expect(expansionSignal?.detail).toContain('连续 3/3 批通过')
    expect(model.batchGuardrail.preflight.inputSnapshot.safe_batch_expansion_policy).toMatchObject({
      status: 'expanded',
      target_chapter_count: 5,
      required_pass_streak: 3,
      pass_streak: 3,
    })
    expect(model.productionLicense.safeChapterCount).toBe(5)
  })

  test('segments five-chapter expansion reviews into hotspots and rollback policy', () => {
    const model = buildAutoCreationDirectorModel({
      planning: readySafeBatchPlanning(),
      writing: readySafeBatchWriting({
        nextChapter: { ...baseWriting.nextChapter, id: 13, chapterNo: 13, title: '扩批后续' },
      }),
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 12 },
      chapters: [8, 9, 10, 11, 12].map(chapterNo => ({
        id: chapterNo,
        chapter_no: chapterNo,
        title: `扩批验收${chapterNo}`,
        chapter_text: '扩批验收正文'.repeat(500),
      })),
      reviews: [
        ...strengthenedAcceptanceQualityReviews([8, 9, 10, 11, 12], 4661, '2026-06-12T01:00:00.000Z'),
        {
          id: 4671,
          chapter_id: 10,
          review_type: 'chapter_core_drift',
          created_at: '2026-06-12T01:10:00.000Z',
          payload: JSON.stringify({ chapter_core_drift: { status: 'warn', drift_risks: ['中段偏离阵盘主线承诺'] } }),
        },
        {
          id: 4672,
          chapter_id: 11,
          review_type: 'reader_payoff_sync',
          created_at: '2026-06-12T01:11:00.000Z',
          payload: JSON.stringify({ reader_payoff_sync: { status: 'warn', debt_count: 1, missed: ['内门门槛回报没有显性兑现'] } }),
        },
        {
          id: 4673,
          chapter_id: 11,
          review_type: 'reader_retention_sync',
          created_at: '2026-06-12T01:12:00.000Z',
          payload: JSON.stringify({ reader_retention_sync: { status: 'warn', missed_count: 1, missed: ['第11章章末没有留下下一章必看问题'] } }),
        },
      ],
      runRecords: [
        {
          id: 568,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-12T00:00:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({
            source: 'auto_creation_safe_batch',
            safety_limit: 5,
            batch_preflight: {
              safe_chapter_count: 5,
              allowed_chapter_nos: [8, 9, 10, 11, 12],
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
            total: 5,
            success: 5,
            failed: 0,
            chapters: [8, 9, 10, 11, 12].map((chapterNo, index) => ({
              id: chapterNo,
              chapter_no: chapterNo,
              title: `扩批验收${chapterNo}`,
              status: 'success',
              score: 84 + index,
              word_count: 3000 + index * 10,
            })),
          }),
        },
      ],
    } as any)

    const segmentSignal = model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'batch_expansion_segment' as any)
    const segmentTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'safe_batch_expansion_segment_hotspot')
    const segmentReview = (model.batchReviewQueue.riskRadar as any).safeBatchExpansionSegmentReview

    expect(model.batchReviewQueue.status).toBe('risk')
    expect(segmentSignal?.status).toBe('warn')
    expect(segmentSignal?.detail).toContain('中段')
    expect(segmentTask?.safe_batch_expansion_segment_review?.hotspots[0]).toMatchObject({
      key: 'middle',
      label: '中段',
      risk_count: 3,
      chapter_nos: [10, 11],
    })
    expect(segmentTask?.safe_batch_expansion_segment_review?.rollback_policy).toMatchObject({
      target_chapter_count: 3,
      mode: 'rollback_to_small_batch',
    })
    expect(segmentReview.rollbackPolicy.summary).toContain('回退到 2-3 章')
    expect(model.batchReviewQueue.handoff.riskLabels).toContain('扩批分段')
  })

})

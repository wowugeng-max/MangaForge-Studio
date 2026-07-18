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

describe('buildAutoCreationDirectorModel a b', () => {
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

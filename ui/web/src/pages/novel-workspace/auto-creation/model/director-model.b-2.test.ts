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

describe('buildAutoCreationDirectorModel b 2', () => {
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

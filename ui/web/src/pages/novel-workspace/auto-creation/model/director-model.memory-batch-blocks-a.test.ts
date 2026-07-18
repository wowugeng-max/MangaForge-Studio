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

describe('buildAutoCreationDirectorModel memory/batch/batch-blocks a', () => {
  test('blocks safe batching when plot dynamics checks remain open', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          ready: true,
          readyToWrite: true,
          primaryActionKey: 'start_safe_batch',
        },
      },
      writing: {
        ...baseWriting,
        readiness: {
          ready: true,
          blockers: [],
          warnings: [],
          checks: [],
        },
        planningDesk: {
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '内门压迫', goal: '以新规逼主角交出阵盘' }],
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
          id: 219,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-04T01:18:00.000Z',
          status: 'ok',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            score: 86,
            passed: true,
            self_check: {
              review: {
                plot_dynamics_checks: [
                  {
                    key: 'goal_obstacle_action_feedback',
                    label: '剧情闭环',
                    status: 'fail',
                    evidence: '红色阀门没有形成目标、阻碍、行动、代价/反馈、新期待闭环。',
                    fix: '补账本编号目标、协会阻碍、行动和代价反馈。',
                  },
                ],
              },
            },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('剧情动力')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('红色阀门')
    expect(model.batchGuardrail.status).toBe('blocked')
  })

  test('blocks safe batching when character relation checks remain open', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          ready: true,
          readyToWrite: true,
          primaryActionKey: 'start_safe_batch',
        },
      },
      writing: {
        ...baseWriting,
        readiness: {
          ready: true,
          blockers: [],
          warnings: [],
          checks: [],
        },
        planningDesk: {
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '内门压迫', goal: '以新规逼主角交出阵盘' }],
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
          id: 220,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-04T01:19:00.000Z',
          status: 'ok',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            score: 86,
            passed: true,
            self_check: {
              review: {
                character_relation_checks: [
                  {
                    key: 'goal_ownership',
                    label: '目标归属',
                    status: 'fail',
                    evidence: '主角只是在帮林栖雨追查旧案，缺少自己的诉求、主动选择和代价。',
                    fix: '补主角自己的风险、选择和代价。',
                  },
                ],
              },
            },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('角色关系')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('帮林栖雨')
    expect(model.batchGuardrail.status).toBe('blocked')
  })

  test('blocks safe batching when character behavior checks remain open', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          ready: true,
          readyToWrite: true,
          primaryActionKey: 'start_safe_batch',
        },
      },
      writing: {
        ...baseWriting,
        readiness: {
          ready: true,
          blockers: [],
          warnings: [],
          checks: [],
        },
        planningDesk: {
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '内门压迫', goal: '以新规逼主角交出阵盘' }],
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
          id: 221,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-04T01:20:00.000Z',
          status: 'ok',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            score: 86,
            passed: true,
            self_check: {
              review: {
                character_behavior_checks: [
                  {
                    key: 'motivation_specificity',
                    label: '动机具体性',
                    status: 'fail',
                    evidence: '主角只是想变强，缺少具体起因、情感理由和动机演变铺垫。',
                    fix: '补具体事件、情感理由和代价。',
                  },
                ],
              },
            },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('角色行为')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('只是想变强')
    expect(model.batchGuardrail.status).toBe('blocked')
  })

  test('blocks safe batching when conflict structure checks remain open', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          ready: true,
          readyToWrite: true,
          primaryActionKey: 'start_safe_batch',
        },
      },
      writing: {
        ...baseWriting,
        readiness: {
          ready: true,
          blockers: [],
          warnings: [],
          checks: [],
        },
        planningDesk: {
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '内门压迫', goal: '以新规逼主角交出阵盘' }],
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
          id: 222,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-04T01:21:00.000Z',
          status: 'ok',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            score: 86,
            passed: true,
            self_check: {
              review: {
                conflict_structure_checks: [
                  {
                    key: 'no_exit_stakes',
                    label: '有进无出',
                    status: 'fail',
                    evidence: '主角可以随时离开账房，没人阻止他拿到账本，也没有退出代价。',
                    fix: '补阻止者、封闭场所和退出代价。',
                  },
                ],
              },
            },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('冲突结构')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('随时离开账房')
    expect(model.batchGuardrail.status).toBe('blocked')
  })

  test('blocks safe batching when opening checks remain open', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          ready: true,
          readyToWrite: true,
          primaryActionKey: 'start_safe_batch',
        },
      },
      writing: {
        ...baseWriting,
        readiness: {
          ready: true,
          blockers: [],
          warnings: [],
          checks: [],
        },
        planningDesk: {
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '内门压迫', goal: '以新规逼主角交出阵盘' }],
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
          id: 223,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-04T01:22:00.000Z',
          status: 'ok',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            score: 86,
            passed: true,
            self_check: {
              review: {
                opening_checks: [
                  {
                    key: 'protagonist_entry_delay',
                    label: '300字主角登场',
                    status: 'fail',
                    evidence: '开头连续写宗门天气和旧史，主角第900字才出现，1000字内没有期待点。',
                    fix: '第一段让主角进入验阵台，补目标和期待点。',
                  },
                ],
              },
            },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('开篇设计')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('主角第900字')
    expect(model.batchGuardrail.status).toBe('blocked')
  })

  test('blocks safe batching when bridge unit checks remain open', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          ready: true,
          readyToWrite: true,
          primaryActionKey: 'start_safe_batch',
        },
      },
      writing: {
        ...baseWriting,
        readiness: {
          ready: true,
          blockers: [],
          warnings: [],
          checks: [],
        },
        planningDesk: {
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '旧城会审', goal: '兑现旧期待并挂新目标' }],
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
          id: 224,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-04T01:23:00.000Z',
          status: 'ok',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            score: 86,
            passed: true,
            self_check: {
              review: {
                bridge_unit_checks: [
                  {
                    key: 'expectation_chain_break',
                    label: '连续期待',
                    status: 'fail',
                    evidence: '旧城会审兑现旧期待后直接散场，章尾没有新目标，也没有高潮中埋钩子。',
                    fix: '兑现账本爽点前先挂赤炉城供奉新目标，章尾给连续小期待。',
                  },
                ],
              },
            },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('桥段节奏')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('章尾没有新目标')
    expect(model.batchGuardrail.status).toBe('blocked')
  })

  test('blocks safe batching when reversal checks remain open', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          ready: true,
          readyToWrite: true,
          primaryActionKey: 'start_safe_batch',
        },
      },
      writing: {
        ...baseWriting,
        readiness: {
          ready: true,
          blockers: [],
          warnings: [],
          checks: [],
        },
        planningDesk: {
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '旧印反证', goal: '用旧印反证完成身份反转' }],
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
          id: 225,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-04T01:24:00.000Z',
          status: 'ok',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            score: 86,
            passed: true,
            self_check: {
              review: {
                reversal_checks: [
                  {
                    key: 'setup_clues_missing',
                    label: '铺垫暗示',
                    status: 'fail',
                    evidence: '执事身份反转是揭示时才出现的新信息，前文没有3处公平暗示，揭示后只靠长解释说明。',
                    fix: '在验印、账页错位、证人迟疑里提前埋3处暗示。',
                  },
                ],
              },
            },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('反转设计')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('没有3处公平暗示')
    expect(model.batchGuardrail.status).toBe('blocked')
  })

  test('blocks safe batching when showdown checks remain open', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          ready: true,
          readyToWrite: true,
          primaryActionKey: 'start_safe_batch',
        },
      },
      writing: {
        ...baseWriting,
        readiness: {
          ready: true,
          blockers: [],
          warnings: [],
          checks: [],
        },
        planningDesk: {
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '旧印压阵', goal: '释放底牌压制执事' }],
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
          id: 226,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-04T01:25:00.000Z',
          status: 'ok',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            score: 86,
            passed: true,
            self_check: {
              review: {
                showdown_checks: [
                  {
                    key: 'payoff_release_missing',
                    label: '爽点释放',
                    status: 'fail',
                    evidence: '主角亮出旧印后执事没有受到对应压制，旁观者只统一震惊，底牌释放后没有新目标。',
                    fix: '让执事当场失去审判资格，并分层写三方反应。',
                  },
                ],
              },
            },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('高潮对抗')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('没有受到对应压制')
    expect(model.batchGuardrail.status).toBe('blocked')
  })

  test('blocks safe batching when prose craft checks remain open', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          ready: true,
          readyToWrite: true,
          primaryActionKey: 'start_safe_batch',
        },
      },
      writing: {
        ...baseWriting,
        readiness: {
          ready: true,
          blockers: [],
          warnings: [],
          checks: [],
        },
        planningDesk: {
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '旧印压阵', goal: '用旧印完成对抗收束' }],
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
          id: 227,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-04T01:26:00.000Z',
          status: 'ok',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            score: 86,
            passed: true,
            self_check: {
              review: {
                prose_craft_checks: [
                  {
                    key: 'omniscient_crowd_camera',
                    label: '远景概括',
                    status: 'fail',
                    evidence: '高潮段连续写全场死寂、所有人震惊，没有主角深度限知，也没有身体细节或环境交互承接。',
                    fix: '改成主角感知、身体动作和环境交互承接。',
                  },
                ],
              },
            },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('正文工艺')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('没有主角深度限知')
    expect(model.batchGuardrail.status).toBe('blocked')
  })

  test('blocks safe batching when punctuation tone checks remain open', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          ready: true,
          readyToWrite: true,
          primaryActionKey: 'start_safe_batch',
        },
      },
      writing: {
        ...baseWriting,
        readiness: {
          ready: true,
          blockers: [],
          warnings: [],
          checks: [],
        },
        planningDesk: {
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '旧印压阵', goal: '用旧印完成对抗收束' }],
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
          id: 228,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-04T01:27:00.000Z',
          status: 'ok',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            score: 86,
            passed: true,
            self_check: {
              review: {
                punctuation_tone_checks: [
                  {
                    key: 'ellipsis_dash_pause',
                    label: '硬停顿',
                    status: 'fail',
                    evidence: '执事质问连续用“你……你竟然——”制造停顿，爆发句乱用三个感叹号，角色声线和主角一样。',
                    fix: '改成动作打断、短句承接和人物声线差异。',
                  },
                ],
              },
            },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('语气标点')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('爆发句乱用三个感叹号')
    expect(model.batchGuardrail.status).toBe('blocked')
  })

  test('blocks safe batching when content rubric checks remain open', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          ready: true,
          readyToWrite: true,
          primaryActionKey: 'start_safe_batch',
        },
      },
      writing: {
        ...baseWriting,
        readiness: {
          ready: true,
          blockers: [],
          warnings: [],
          checks: [],
        },
        planningDesk: {
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '旧印压阵', goal: '用旧印完成对抗收束' }],
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
          id: 229,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-04T01:28:00.000Z',
          status: 'ok',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            score: 86,
            passed: true,
            self_check: {
              review: {
                content_rubric_checks: [
                  {
                    key: 'golden_three_questions',
                    label: '黄金三问',
                    status: 'fail',
                    evidence: '本章没有回答读者为什么翻下一页，旧印亮出后局势没有可见变化，也缺少支持内容判断的正文证据。',
                    fix: '补局势变化和章末新期待。',
                  },
                ],
              },
            },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('内容基准')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('为什么翻下一页')
    expect(model.batchGuardrail.status).toBe('blocked')
  })

  test('blocks safe batching when reader retention checks remain open', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          ready: true,
          readyToWrite: true,
          primaryActionKey: 'start_safe_batch',
        },
      },
      writing: {
        ...baseWriting,
        readiness: {
          ready: true,
          blockers: [],
          warnings: [],
          checks: [],
        },
        planningDesk: {
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '旧印压阵', goal: '用旧印完成对抗收束' }],
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
          id: 230,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-04T01:29:00.000Z',
          status: 'ok',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            score: 86,
            passed: true,
            self_check: {
              review: {
                reader_retention_checks: [
                  {
                    key: 'double_engine_hunger_missing',
                    label: '留存双引擎',
                    status: 'fail',
                    evidence: '本章有情绪爆发，但没有信息差植入问号，旧印来源和内库阵图线索一次性讲完，章尾没有追读饥饿。',
                    fix: '补信息差和章尾新问题。',
                  },
                ],
              },
            },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('追读雷达')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('没有信息差植入问号')
    expect(model.batchGuardrail.status).toBe('blocked')
  })

})

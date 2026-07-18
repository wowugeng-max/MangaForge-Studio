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

describe('buildAutoCreationDirectorModel memory/batch/batch-blocks', () => {
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

  test('blocks safe batching when target reader checks remain open', () => {
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
          id: 231,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-04T01:30:00.000Z',
          status: 'ok',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            score: 86,
            passed: true,
            self_check: {
              review: {
                target_reader_checks: [
                  {
                    key: 'emotion_gap_missing',
                    label: '情绪缺口',
                    status: 'fail',
                    evidence: '目标读者画像只写年轻读者，缺核心痛苦、深层情结和未满足需求，本章旧印亮出后没有给尊严补偿。',
                    fix: '补目标读者痛点和可见回报。',
                  },
                ],
              },
            },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('目标读者')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('缺核心痛苦')
    expect(model.batchGuardrail.status).toBe('blocked')
  })

  test('blocks safe batching when genre positioning checks remain open', () => {
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
          id: 232,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-04T01:31:00.000Z',
          status: 'ok',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            score: 86,
            passed: true,
            self_check: {
              review: {
                genre_positioning_checks: [
                  {
                    key: 'core_hook_blurry',
                    label: '核心梗',
                    status: 'fail',
                    evidence: '本章挂阵修题材，但旧印只当普通信物使用，核心梗和阵法长板没有变成审判现场优势，书名简介承诺的阵师逆袭没有正文证据。',
                    fix: '补题材长板和正文证据。',
                  },
                ],
              },
            },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('题材定位')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('核心梗')
    expect(model.batchGuardrail.status).toBe('blocked')
  })

  test('blocks safe batching when female audience checks remain open', () => {
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
          id: 233,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-04T01:32:00.000Z',
          status: 'ok',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            score: 86,
            passed: true,
            self_check: {
              review: {
                female_audience_checks: [
                  {
                    key: 'agency_and_security_missing',
                    label: '安全感与主动性',
                    status: 'fail',
                    evidence: '本章女主被长老安排着赢，缺少自己做决定的动作；旧印反转只打脸，没有安全感锚点、被珍视回馈和虐后反糖。',
                    fix: '补女主主动选择和安全感反馈。',
                  },
                ],
              },
            },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('女频长篇')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('被长老安排着赢')
    expect(model.batchGuardrail.status).toBe('blocked')
  })

  test('blocks safe batching when upgrade rhythm checks remain open', () => {
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
          id: 234,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-04T01:33:00.000Z',
          status: 'ok',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            score: 86,
            passed: true,
            self_check: {
              review: {
                upgrade_rhythm_checks: [
                  {
                    key: 'feedback_and_threshold_missing',
                    label: '升级反馈与门槛',
                    status: 'fail',
                    evidence: '本章获得旧印后只有奖励，没有展示升级前情绪缺口、即时反馈、延迟反馈和新门槛；金手指触发条件和升级规则不清晰。',
                    fix: '补升级前后对比、即时反馈、延迟反馈和新门槛。',
                  },
                ],
              },
            },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('升级节奏')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('升级前情绪缺口')
    expect(model.batchGuardrail.status).toBe('blocked')
  })

  test('blocks safe batching when chapter structure and progression checks remain open', () => {
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
          id: 235,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-04T01:34:00.000Z',
          status: 'ok',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            score: 81,
            passed: false,
            self_check: {
              review: {
                structure_checks: [
                  {
                    key: 'missing_turning_structure',
                    label: '章节结构',
                    status: 'fail',
                    evidence: '本章开头没有钩子，中段只复述旧设定，局势没有变化，结尾落在总结而不是新的发现或危机。',
                    fix: '补章节结构。',
                  },
                ],
                progression_checks: [
                  {
                    key: 'deletable_chapter',
                    label: '章节推进',
                    status: 'warn',
                    evidence: '删掉这章不影响理解，主线、关系、设定都没有可见位移。',
                    fix: '补本章不可删除的主线变化。',
                  },
                ],
              },
            },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('章节结构')
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('章节推进')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('开头没有钩子')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('删掉这章不影响理解')
    expect(model.batchGuardrail.status).toBe('blocked')
  })

  test('blocks safe batching when information load and longform checks remain open', () => {
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
          id: 236,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-04T01:35:00.000Z',
          status: 'ok',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            score: 80,
            passed: false,
            self_check: {
              review: {
                information_checks: [
                  {
                    key: 'concept_overload',
                    label: '信息负载',
                    status: 'fail',
                    evidence: '本章一次性解释三套阵法、两条宗门规则和旧印来历，信息没有跟着冲突走。',
                    fix: '压缩新概念并改成冲突释放。',
                  },
                ],
                longform_checks: [
                  {
                    key: 'recent_progress_stalled',
                    label: '长篇连续性',
                    status: 'warn',
                    evidence: '最近5章都在解释旧印背景，没有明确进展，爽点间隔过长。',
                    fix: '补阶段位移和爽点间隔。',
                  },
                ],
              },
            },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('信息负载')
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('长篇连续性')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('信息没有跟着冲突走')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('最近5章')
    expect(model.batchGuardrail.status).toBe('blocked')
  })

  test('blocks safe batching when core contract and continuity heat checks remain open', () => {
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
          sceneCards: [{ title: '广播室名单', goal: '用名单逼出广播来源' }],
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
          id: 237,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-04T01:36:00.000Z',
          status: 'ok',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            score: 79,
            passed: false,
            self_check: {
              review: {
                core_contract_checks: [
                  {
                    key: 'theme_unity_rules',
                    label: '核心契约',
                    status: 'fail',
                    evidence: '本章追逐支线宝物，主角没有服务规则反制的核心承诺。',
                    fix: '把支线宝物改成规则判定证据。',
                  },
                ],
                continuity_heat_checks: [
                  {
                    key: 'cold_recall_without_warmup',
                    label: '连续性热度',
                    status: 'warn',
                    evidence: '旧印作为 hot 元素本章只提名字没有推进，cold 伏笔突然回收前没有升温。',
                    fix: '让旧印触发新证据推进。',
                  },
                ],
              },
            },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('核心契约')
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('连续性热度')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('核心承诺')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('cold 伏笔突然回收前没有升温')
    expect(model.batchGuardrail.status).toBe('blocked')
  })

  test('blocks safe batching when revision receipt and deslop repair checks remain open', () => {
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
          sceneCards: [{ title: '重修广播室', goal: '修正文首钩子并清理模板对白' }],
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
          id: 238,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-04T01:37:00.000Z',
          status: 'ok',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            score: 78,
            passed: false,
            self_check: {
              review: {
                revision_receipt_checks: [
                  {
                    key: 'prose_revision_receipt_sync',
                    label: '修订回执',
                    status: 'fail',
                    evidence: 'revision_receipts 没有给 changed_evidence。',
                    fix: '补 changed_evidence。',
                  },
                ],
                deslop_repair_checks: [
                  {
                    key: 'deslop_repair_receipt_sync',
                    label: '去AI味修复',
                    status: 'warn',
                    evidence: 'Gate E 模板化对白仍残留。',
                    fix: '重修 Gate E。',
                  },
                ],
              },
            },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('修订回执')
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('去AI味修复')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('changed_evidence')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('Gate E')
    expect(model.batchGuardrail.status).toBe('blocked')
  })

  test('blocks safe batching when prose meta and serial risk repair checks remain open', () => {
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
          sceneCards: [{ title: '连更复检', goal: '清除作者说明并补连续风险回执' }],
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
          id: 239,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-04T01:38:00.000Z',
          status: 'ok',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            score: 77,
            passed: false,
            self_check: {
              review: {
                prose_meta_checks: [
                  {
                    key: 'meta_narration_leak',
                    label: '正文元叙事',
                    status: 'fail',
                    evidence: '正文出现作者说明，破坏读者沉浸。',
                    fix: '删除作者说明。',
                  },
                ],
                serial_risk_repair_checks: [
                  {
                    key: 'scene_serial_risk_unrepaired',
                    label: '连续风险修复',
                    status: 'warn',
                    evidence: '场景承接风险仍未补回执。',
                    fix: '补 scene_serial_risk_repair_receipt。',
                  },
                ],
              },
            },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('正文元叙事')
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('连续风险修复')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('作者说明')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('场景承接风险')
    expect(model.batchGuardrail.status).toBe('blocked')
  })

  test('blocks safe batching when chapter hook quality checks remain open', () => {
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
          sceneCards: [{ title: '章尾复检', goal: '清除弱章尾钩子' }],
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
          id: 240,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-04T01:40:00.000Z',
          status: 'ok',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            score: 77,
            passed: false,
            self_check: {
              review: {
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
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('章钩质量')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('下一章行动压力')
    expect(model.batchGuardrail.status).toBe('blocked')
  })

  test('blocks safe batching when generic quality audit checks remain open', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
      } as any,
      writing: {
        ...baseWriting,
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
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
          id: 206,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-04T01:05:00.000Z',
          status: 'warn',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            self_check: {
              review: {
                score: 82,
                passed: false,
                status: 'warn',
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
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.totalOpen).toBe(1)
    expect(model.deliveryRiskGate.highOpen).toBe(1)
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('质量诊断')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('质量诊断第8章：爽点场景只用一句摘要带过')
    expect(model.mainAction.key).toBe('create_delivery_risk_repair')
    expect(model.mainAction.payload?.deliveryRiskGate?.categories.map((item: any) => item.label)).toContain('质量诊断')
    expect(model.batchGuardrail.status).toBe('blocked')
  })
})

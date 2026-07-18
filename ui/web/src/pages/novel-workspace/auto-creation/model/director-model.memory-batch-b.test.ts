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

describe('buildAutoCreationDirectorModel memory/batch b', () => {
  test('blocks safe batching when scene-card receipt checks remain open', () => {
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
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.totalOpen).toBe(1)
    expect(model.deliveryRiskGate.highOpen).toBe(1)
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('场景回执')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('场景回执第8章：场景2《盟友改口》scene_card_receipts 标记未兑现。')
    expect(model.mainAction.key).toBe('create_delivery_risk_repair')
    expect(model.mainAction.payload?.deliveryRiskGate?.categories.map((item: any) => item.label)).toContain('场景回执')
    expect(model.mainAction.payload?.deliveryRiskGate?.topRisks.join('｜')).toContain('scene_card_receipts 标记未兑现')
    expect(model.batchGuardrail.status).toBe('blocked')
    expect(model.batchGuardrail.recommendedAction.payload?.deliveryRiskGate?.categories.map((item: any) => item.label)).toContain('场景回执')
    expect(model.batchGuardrail.guardrails.find(item => item.label === '未清交稿风险')?.status).toBe('block')
  })

  test('blocks safe batching when nested pre-draft execution receipts remain open', () => {
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
          status: 'ok',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            score: 86,
            passed: true,
            oh_story_delivery_receipts: {
              pre_draft_execution_receipts: {
                intent_confirmation_checks: [
                  {
                    key: 'emotion_target',
                    label: '情绪目标',
                    delivered: false,
                    evidence: '正文只写了发现封条，没有从压迫转到反制。',
                    remaining_risk: '压迫后的反制情绪没有落到正文。',
                  },
                ],
                benchmark_recall_checks: [
                  {
                    key: 'rhythm_reference',
                    label: '节奏参照',
                    delivered: false,
                    evidence: '没有三轮压问，证据一出现就结束。',
                    remaining_risk: '文风召回里的先压后爆没有执行。',
                  },
                ],
              },
            },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.totalOpen).toBe(2)
    expect(model.deliveryRiskGate.highOpen).toBe(2)
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('写前执行')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('压迫后的反制情绪没有落到正文')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('文风召回里的先压后爆没有执行')
    expect(model.mainAction.key).toBe('create_delivery_risk_repair')
    expect(model.mainAction.payload?.deliveryRiskGate?.categories.map((item: any) => item.label)).toContain('写前执行')
    expect(model.batchGuardrail.status).toBe('blocked')
  })

  test('blocks safe batching when source readiness checks remain open', () => {
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
          id: 207,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-04T01:06:00.000Z',
          status: 'ok',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            score: 86,
            passed: true,
            self_check: {
              review: {
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
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.totalOpen).toBe(1)
    expect(model.deliveryRiskGate.highOpen).toBe(1)
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('来源就绪')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('黑色钥匙当成已解锁道具')
    expect(model.mainAction.key).toBe('create_delivery_risk_repair')
    expect(model.batchGuardrail.status).toBe('blocked')
  })

  test('blocks safe batching when state tracking checks remain open', () => {
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
          id: 208,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-04T01:07:00.000Z',
          status: 'ok',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            score: 86,
            passed: true,
            self_check: {
              review: {
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
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.totalOpen).toBe(1)
    expect(model.deliveryRiskGate.highOpen).toBe(1)
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('状态跟踪')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('上一章状态仍是昏迷未醒')
    expect(model.mainAction.key).toBe('create_delivery_risk_repair')
    expect(model.batchGuardrail.status).toBe('blocked')
  })

  test('blocks safe batching when style boundary checks remain open', () => {
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
          id: 209,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-04T01:08:00.000Z',
          status: 'ok',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            score: 86,
            passed: true,
            self_check: {
              review: {
                style_boundary_checks: [
                  {
                    key: 'source_copy_risk',
                    label: '参照句式过近',
                    status: 'warn',
                    evidence: '正文连续三句沿用标杆样章的句式节奏，只有名词替换。',
                    fix: '改用本章动作链和角色口吻重写。',
                  },
                ],
              },
            },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('风格边界')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('标杆样章的句式节奏')
    expect(model.batchGuardrail.status).toBe('blocked')
  })

  test('blocks safe batching when information flow checks remain open', () => {
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
          id: 210,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-04T01:09:00.000Z',
          status: 'ok',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            score: 86,
            passed: true,
            self_check: {
              review: {
                information_flow_checks: [
                  {
                    key: 'reveal_order',
                    label: '线索揭示顺序',
                    status: 'fail',
                    evidence: '正文先解释封条真相，再让主角发现供词，导致悬念提前泄底。',
                    fix: '先写误判和供词异常，再揭示封条真相。',
                  },
                ],
              },
            },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('信息流')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('悬念提前泄底')
    expect(model.batchGuardrail.status).toBe('blocked')
  })

  test('blocks safe batching when expectation threshold checks remain open', () => {
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
          id: 211,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-04T01:10:00.000Z',
          status: 'ok',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            score: 86,
            passed: true,
            self_check: {
              review: {
                expectation_threshold_checks: [
                  {
                    key: 'page_turn_question',
                    label: '章末追问强度',
                    status: 'warn',
                    evidence: '章末只说封条异常，没有形成读者必须点下一章的具体问题。',
                    fix: '把异常落到未揭身份、代价或选择压力上。',
                  },
                ],
              },
            },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('期待阈值')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('必须点下一章')
    expect(model.batchGuardrail.status).toBe('blocked')
  })

  test('blocks safe batching when story loop checks remain open', () => {
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
          id: 212,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-04T01:11:00.000Z',
          status: 'ok',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            score: 86,
            passed: true,
            self_check: {
              review: {
                story_loop_checks: [
                  {
                    key: 'setup_payoff_loop',
                    label: '设问回收闭环',
                    status: 'fail',
                    evidence: '开头抛出谁换了封条，但结尾没有推进答案、代价或新问题。',
                    fix: '推进一个答案碎片，并把新问题挂到下一章钩子。',
                  },
                ],
              },
            },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('故事闭环')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('没有推进答案')
    expect(model.batchGuardrail.status).toBe('blocked')
  })

  test('blocks safe batching when emotional arc checks remain open', () => {
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
          id: 213,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-04T01:12:00.000Z',
          status: 'ok',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            score: 86,
            passed: true,
            self_check: {
              review: {
                emotional_arc_checks: [
                  {
                    key: 'pressure_release',
                    label: '压迫释放弧',
                    status: 'fail',
                    evidence: '开场压迫后直接解释规则，没有写出调动、反制和爽感释放。',
                    fix: '把压迫落到现场选择，用动作和对白完成反制。',
                  },
                ],
              },
            },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('情绪弧')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('爽感释放')
    expect(model.batchGuardrail.status).toBe('blocked')
  })

  test('blocks safe batching when chapter hook checks remain open', () => {
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
          id: 214,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-04T01:13:00.000Z',
          status: 'ok',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            score: 86,
            passed: true,
            self_check: {
              review: {
                chapter_hook_checks: [
                  {
                    key: 'ending_page_turn',
                    label: '章尾翻页钩子',
                    status: 'fail',
                    evidence: '最后一幕只写封条异常，没有形成具体翻页问题或下一章压力。',
                    fix: '把异常落到未揭身份和下一章选择压力。',
                  },
                ],
              },
            },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('章级钩子')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('具体翻页问题')
    expect(model.batchGuardrail.status).toBe('blocked')
  })

  test('blocks safe batching when paragraph hook checks remain open', () => {
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
          id: 215,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-04T01:14:00.000Z',
          status: 'ok',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            score: 86,
            passed: true,
            self_check: {
              review: {
                paragraph_hook_checks: [
                  {
                    key: 'micro_hook_stall',
                    label: '段落微推进',
                    status: 'fail',
                    evidence: '连续六段只写环境和站位，没有信息、风险、情绪或关系变化。',
                    fix: '加入暗牌、倒计时或对话压迫。',
                  },
                ],
              },
            },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('段落级钩子')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('连续六段')
    expect(model.batchGuardrail.status).toBe('blocked')
  })

  test('blocks safe batching when suspense checks remain open', () => {
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
          id: 216,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-04T01:15:00.000Z',
          status: 'ok',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            score: 86,
            passed: true,
            self_check: {
              review: {
                suspense_checks: [
                  {
                    key: 'question_misdirect_answer',
                    label: '疑问误导答案循环',
                    status: 'fail',
                    evidence: '正文只抛出封条异常，没有给可信误导、局部答案或新期待。',
                    fix: '补假提示和局部答案。',
                  },
                ],
              },
            },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('悬念编排')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('可信误导')
    expect(model.batchGuardrail.status).toBe('blocked')
  })

  test('blocks safe batching when asset linkage checks remain open', () => {
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
          id: 217,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-04T01:16:00.000Z',
          status: 'ok',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            score: 86,
            passed: true,
            self_check: {
              review: {
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
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('资产挂钩')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('旧钥匙')
    expect(model.batchGuardrail.status).toBe('blocked')
  })

  test('blocks safe batching when dialogue checks remain open', () => {
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
          id: 218,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-04T01:17:00.000Z',
          status: 'ok',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            score: 86,
            passed: true,
            self_check: {
              review: {
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
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('对白质量')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('说明书')
    expect(model.batchGuardrail.status).toBe('blocked')
  })

})

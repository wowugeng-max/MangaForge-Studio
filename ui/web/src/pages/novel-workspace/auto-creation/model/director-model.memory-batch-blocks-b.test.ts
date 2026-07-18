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

describe('buildAutoCreationDirectorModel memory/batch/batch-blocks b', () => {
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

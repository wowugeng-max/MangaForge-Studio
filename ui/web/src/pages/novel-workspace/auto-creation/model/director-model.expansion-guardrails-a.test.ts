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

describe('buildAutoCreationDirectorModel expansion/guardrails a', () => {
  test('downgrades to single chapter when the latest strengthened recovery acceptance trend fails', () => {
    const model = buildAutoCreationDirectorModel({
      planning: readySafeBatchPlanning(),
      writing: readySafeBatchWriting(),
      activeTasks: [],
      selectedModelId: 12,
      runRecords: [
        recoveryEvidenceFailureRun(551, '2026-06-06T00:00:00.000Z'),
        recoveryEvidenceDeepRepairRun({
          id: 552,
          createdAt: '2026-06-06T12:00:00.000Z',
          updatedAt: '2026-06-06T12:30:00.000Z',
          taskStatus: 'resolved',
          actionLabel: '深修单章任务书',
          deepRepairLevel: 'first_deep_repair',
        }),
        recoveryEvidenceFailureRun(553, '2026-06-07T00:00:00.000Z'),
        recoveryEvidenceDeepRepairRun({
          id: 554,
          createdAt: '2026-06-08T00:00:00.000Z',
          updatedAt: '2026-06-08T00:30:00.000Z',
          taskStatus: 'resolved',
          actionLabel: '强化单章任务书复盘',
          deepRepairLevel: 'escalated_after_recurrence',
        }),
        strengthenedAcceptanceBatchRun({ id: 555, createdAt: '2026-06-09T00:00:00.000Z', chapterNos: [41, 42, 43] }),
        {
          id: 556,
          run_type: 'longform_production_repair',
          created_at: '2026-06-10T00:00:00.000Z',
          status: 'ready',
          output_ref: JSON.stringify({
            report: { source: 'auto_creation_safe_batch_risk' },
            tasks: [
              {
                issue_type: 'strengthened_repair_acceptance_mismatch',
                task_status: 'open',
                chapter_no: 44,
                strengthened_repair_acceptance_review: {
                  status: 'warn',
                  source_evidence: ['单章治理复查：强化深修已收敛'],
                  failed_evidence: ['核心守恒风险 1 项', '读者回报欠账 1 项', '读者拉力风险 1 项'],
                  risk_count: 3,
                  core_risk_count: 1,
                  payoff_debt_count: 1,
                  reader_pull_risk_count: 1,
                  summary: '强化深修恢复验收未通过：单章治理复查：强化深修已收敛 放行后仍有核心守恒风险 1 项、读者回报欠账 1 项、读者拉力风险 1 项。',
                },
              },
            ],
          }),
        },
      ],
      chapters: [41, 42, 43].map(chapterNo => ({
        id: chapterNo,
        chapter_no: chapterNo,
        title: `强化趋势${chapterNo}`,
        chapter_text: '强化趋势正文'.repeat(500),
      })),
      reviews: strengthenedAcceptanceQualityReviews([41, 42, 43], 4621, '2026-06-09T01:00:00.000Z'),
      storyState: {
        last_updated_chapter: 43,
        global: {
          core_promise: '李超用超人蛮力碰撞规则怪谈，张智负责拆解规则。',
          current_volume_goal: '午夜校园中活过第一轮规则。',
        },
      },
    } as any)

    const acceptanceTrend = (model.batchGuardrail.recoveryEvidenceTrend as any).strengthenedAcceptanceTrend
    const trendSignal = model.batchGuardrail.guardrails.find(item => item.label === '强化恢复验收趋势')

    expect(model.batchGuardrail.status).toBe('caution')
    expect(model.batchGuardrail.safeChapterCount).toBe(1)
    expect(model.productionLicense.status).toBe('single_chapter')
    expect(model.batchGuardrail.recommendedAction.key).toBe('open_task_center')
    expect(model.batchGuardrail.recommendedAction.label).toBe('查看强化复盘')
    expect(trendSignal?.status).toBe('warn')
    expect(acceptanceTrend).toMatchObject({
      visible: true,
      status: 'warn',
      acceptedBatchCount: 1,
      failedBatchCount: 1,
      passStreak: 0,
      latestStatus: 'warn',
      dimensions: {
        core: { failedCount: 1 },
        payoff: { failedCount: 1 },
        readerPull: { failedCount: 1 },
      },
    })
    expect(acceptanceTrend.summary).toContain('最近 1 批未通过')
    expect(model.batchGuardrail.preflight.inputSnapshot.strengthened_repair_acceptance_trend).toMatchObject({
      status: 'warn',
      latest_status: 'warn',
      failed_batch_count: 1,
    })
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

  test('injects creation contract carry-over into safe batch preflight and action payload', () => {
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
              totalCount: 4,
              label: '创作契约：执行缺口 4',
              priorityLabel: '优先修创作契约',
              items: [
                '创作契约：目标读者缺口 1',
                '创作契约：题材定位缺口 1',
                '创作契约：核心承诺缺口 1',
                '创作契约：追读留存缺口 1',
              ],
              requiredActions: [
                '前300字把被轻视的核心痛苦写成现场压力',
                '中段用阵修长板识阵、破阵、反制',
                '章末回到规则反制的核心承诺并留下追读问题',
              ],
              openingActions: ['开篇先补目标读者压力'],
              middleActions: ['中段补题材长板和核心承诺'],
              endingActions: ['章末补追读留存'],
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

    const carryOver = model.batchGuardrail.preflight.inputSnapshot.delivery_risk_carry_over

    expect(model.batchGuardrail.status).toBe('ready')
    expect(carryOver).toMatchObject({
      priority_label: '优先修创作契约',
      items: [
        '创作契约：目标读者缺口 1',
        '创作契约：题材定位缺口 1',
        '创作契约：核心承诺缺口 1',
        '创作契约：追读留存缺口 1',
      ],
      creation_contract_carry_over: {
        priority_label: '优先修创作契约',
        items: [
          '创作契约：目标读者缺口 1',
          '创作契约：题材定位缺口 1',
          '创作契约：核心承诺缺口 1',
          '创作契约：追读留存缺口 1',
        ],
        checklist: ['target_reader', 'genre_positioning', 'core_promise', 'reader_retention'],
      },
    })
    expect(carryOver?.creation_contract_carry_over?.required_actions.join('｜')).toContain('阵修长板')
    expect(carryOver?.creation_contract_carry_over?.policy).toContain('目标读者、题材定位、核心承诺、追读留存')
    expect(model.batchGuardrail.recommendedAction.payload?.batch_preflight?.delivery_risk_carry_over?.creation_contract_carry_over?.checklist).toContain('core_promise')
    expect(model.productionLicense.nextAction.payload?.batch_preflight?.delivery_risk_carry_over?.creation_contract_carry_over?.policy).toContain('安全连写第一章')
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

})

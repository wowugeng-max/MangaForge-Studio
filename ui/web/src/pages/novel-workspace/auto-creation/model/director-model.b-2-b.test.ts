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

describe('buildAutoCreationDirectorModel b 2 b', () => {
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

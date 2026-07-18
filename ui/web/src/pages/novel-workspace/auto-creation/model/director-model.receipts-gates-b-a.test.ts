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

describe('buildAutoCreationDirectorModel receipts/gates b a', () => {
  test('holds strengthened repair recovery when core and reader payoff acceptance fails', () => {
    const model = buildAutoCreationDirectorModel(buildStrengthenedRepairAcceptanceInput([
      {
        id: 4510,
        chapter_id: 42,
        review_type: 'chapter_core_drift',
        created_at: '2026-06-06T01:03:00.000Z',
        payload: JSON.stringify({
          core_drift: {
            status: 'warn',
            score: 68,
            drift_risks: ['强化深修恢复后主线承诺仍被支线挤压'],
          },
        }),
      },
      {
        id: 4511,
        chapter_id: 43,
        review_type: 'reader_payoff_sync',
        created_at: '2026-06-06T01:04:00.000Z',
        payload: JSON.stringify({
          reader_payoff_sync: {
            status: 'warn',
            debt_count: 1,
            missed: ['强化深修恢复后没有兑现阵盘反压爽点'],
          },
        }),
      },
      {
        id: 4512,
        chapter_id: 43,
        review_type: 'reader_expectation_sync',
        created_at: '2026-06-06T01:05:00.000Z',
        payload: JSON.stringify({
          reader_expectation_sync: {
            status: 'warn',
            missed_count: 1,
            missed: ['章末追读问题没有接住下一章期待'],
          },
        }),
      },
    ]))

    const acceptanceSignal = model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'strengthened_repair_acceptance' as any)
    const acceptanceTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'strengthened_repair_acceptance_mismatch')

    expect(model.batchReviewQueue.status).toBe('risk')
    expect((model.batchReviewQueue.riskRadar as any).strengthenedRepairAcceptanceRiskCount).toBe(3)
    expect(acceptanceSignal?.label).toBe('强化复盘')
    expect(acceptanceSignal?.status).toBe('warn')
    expect(acceptanceSignal?.detail).toContain('强化深修恢复验收未通过')
    expect(acceptanceSignal?.detail).toContain('单章治理复查：强化深修已收敛')
    expect(acceptanceTask?.strengthened_repair_acceptance_review).toMatchObject({
      status: 'warn',
      source_evidence: ['单章治理复查：强化深修已收敛'],
      failed_evidence: expect.arrayContaining([
        '核心守恒风险 1 项',
        '读者回报欠账 1 项',
        '读者拉力风险 1 项',
      ]),
    })
    expect(model.batchReviewQueue.handoff.riskLabels).toContain('强化复盘')
    expect(model.batchReviewQueue.completionDashboard.metrics.find(metric => metric.key === 'strengthened_repair_acceptance' as any)?.status).toBe('warn')
  })
  test('shows strengthened repair recovery acceptance after core and reader payoff pass', () => {
    const model = buildAutoCreationDirectorModel(buildStrengthenedRepairAcceptanceInput())

    const acceptanceSignal = model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'strengthened_repair_acceptance' as any)
    const acceptanceMetric = model.batchReviewQueue.completionDashboard.metrics.find(metric => metric.key === 'strengthened_repair_acceptance' as any)

    expect(model.batchReviewQueue.status).toBe('done')
    expect((model.batchReviewQueue.riskRadar as any).strengthenedRepairAcceptanceRiskCount).toBe(0)
    expect(acceptanceSignal?.label).toBe('强化复盘')
    expect(acceptanceSignal?.status).toBe('ok')
    expect(acceptanceSignal?.detail).toContain('强化深修恢复验收已通过')
    expect(acceptanceMetric?.status).toBe('ok')
    expect(acceptanceMetric?.detail).toContain('强化深修恢复验收已通过')
    expect(model.batchReviewQueue.completionDashboard.summary).toContain('强化深修恢复验收已通过')
    expect(model.batchReviewQueue.handoff.evidence).toContain('强化深修恢复验收已通过')
  })
  test('turns missed default five-chapter lane redesign execution into a batch repair task', () => {
    const chapterNos = [89]
    const model = buildAutoCreationDirectorModel({
      planning: readySafeBatchPlanning({ futureRoute: futureRouteRange(90, 5) }),
      writing: readySafeBatchWriting({
        nextChapter: { ...baseWriting.nextChapter, id: 90, chapterNo: 90, title: '默认档模板复检' },
        previousChapter: { chapterNo: 89, title: '默认档重构章', wordCount: 3200, hasProse: true },
      }),
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 89 },
      chapters: [{
        id: 89,
        chapter_no: 89,
        title: '默认档重构章',
        chapter_text: '默认档重构正文'.repeat(500),
        raw_payload: {
          generated_scene_breakdown: [{
            expansion_structure_decision_execution: {
              segment_role_delivered: true,
              observation_metrics_delivered: true,
              redesign_principles_delivered: true,
              evidence: ['第89章只回填了旧结构决策三项，没有写默认5章档位模板。'],
            },
          }],
        },
      }],
      reviews: strengthenedAcceptanceQualityReviews(chapterNos, 7301, '2026-06-24T01:00:00.000Z'),
      runRecords: [{
        id: 730,
        run_type: 'batch_generate_prose',
        created_at: '2026-06-24T00:00:00.000Z',
        status: 'success',
        input_ref: JSON.stringify({
          source: 'auto_creation_safe_batch',
          safety_limit: 1,
          batch_preflight: {
            safe_chapter_count: 1,
            allowed_chapter_nos: [89],
            safe_batch_expansion_policy: {
              status: 'recovering',
              label: '强化扩批规则',
              summary: '连续恢复判定失效，进入默认档位结构重构。',
              target_chapter_count: 1,
              base_chapter_count: 3,
              expanded_chapter_count: 5,
              required_pass_streak: 3,
              pass_streak: 3,
              accepted_batch_count: 3,
              failed_batch_count: 1,
              latest_status: 'warn',
            },
          },
          next_batch_brief: {
            chapter_range_label: '第89章',
            expansion_structure_decision: {
              visible: true,
              label: '结构修复决策',
              recommendation: 'escalate_structure_redesign',
              target_chapter_count: 1,
              mode_label: '单章结构重构',
              segment_key: 'middle',
              segment_label: '中段',
              summary: '连续 2 次恢复判定失效，默认档位结构重构。',
              instruction: '默认 5 章档位连续恢复判定失效，先重写默认档位结构。',
              observation_metrics: ['恢复判定连续失效 2 次', '同维复发：核心偏移、回报欠账、追读拉力'],
              default_five_chapter_lane_redesign: {
                reason: 'repeated_recovery_verdict_relapse',
                relapse_count: 2,
                repeated_failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
                segment_duty_rewrite: '段位职责重写：定义默认 5 章前段、中段、后段职责。',
                conflict_rotation: '冲突轮换：五章内轮换规则压迫、人物对抗、信息误导。',
                payoff_density: '回报密度：每章都有显性回报，不能连续两章只铺垫。',
                ending_hook_template: '章末追读模板：最后 300 字给触发事件、读者问题、下一章风险。',
              },
            },
          },
        }),
        output_ref: JSON.stringify({
          total: 1,
          success: 1,
          failed: 0,
          chapters: [{
            id: 89,
            chapter_no: 89,
            title: '默认档重构章',
            status: 'success',
            score: 86,
            word_count: 3300,
          }],
        }),
      }],
    } as any)

    const decisionTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'safe_batch_expansion_structure_decision_mismatch')

    expect(model.batchReviewQueue.status).toBe('risk')
    expect((model.batchReviewQueue.riskRadar as any).safeBatchExpansionStructureDecisionRiskCount).toBe(4)
    expect(decisionTask?.message).toContain('默认5章档位模板')
    expect(decisionTask?.safe_batch_expansion_structure_decision_review).toMatchObject({
      recommendation: 'escalate_structure_redesign',
      target_chapter_count: 1,
      default_five_chapter_lane_redesign: {
        reason: 'repeated_recovery_verdict_relapse',
        relapse_count: 2,
        repeated_failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
      },
      failed_items: expect.arrayContaining([
        expect.objectContaining({ chapter_no: 89, key: 'default_lane_segment_duty', label: '默认档位段位职责' }),
        expect.objectContaining({ chapter_no: 89, key: 'default_lane_conflict_rotation', label: '冲突轮换' }),
        expect.objectContaining({ chapter_no: 89, key: 'default_lane_payoff_density', label: '回报密度' }),
        expect.objectContaining({ chapter_no: 89, key: 'default_lane_ending_hook_template', label: '章末追读模板' }),
      ]),
    })
  })
  test('holds delivered safe batch when chapter benchmark execution misses baseline beats', () => {
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
        nextChapter: { ...baseWriting.nextChapter, id: 18, chapterNo: 18, title: '内门来人' },
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '内门招揽', goal: '新势力提出条件' }],
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
      storyState: { last_updated_chapter: 17 },
      chapters: [
        { id: 15, chapter_no: 15, title: '内门影子', chapter_text: '内门影子'.repeat(500) },
        { id: 16, chapter_no: 16, title: '执事逼问', chapter_text: '执事逼问'.repeat(500) },
        { id: 17, chapter_no: 17, title: '阵纹余波', chapter_text: '阵纹余波'.repeat(500) },
      ],
      reviews: [
        { id: 101, chapter_id: 15, review_type: 'prose_quality', created_at: '2026-06-03T01:00:00.000Z', payload: JSON.stringify({ score: 84, passed: true }) },
        { id: 102, chapter_id: 16, review_type: 'prose_quality', created_at: '2026-06-03T01:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 103, chapter_id: 17, review_type: 'prose_quality', created_at: '2026-06-03T01:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
        {
          id: 502,
          chapter_id: 16,
          review_type: 'chapter_benchmark_sync',
          created_at: '2026-06-03T01:03:00.000Z',
          payload: JSON.stringify({
            chapter_benchmark_sync: {
              status: 'warn',
              label: '基准缺口 3',
              score: 57,
              missed_count: 3,
              missed: [
                { key: 'opening_hook', label: '开篇钩子', text: '前300字没有把上一章压力转成现场危险。' },
                { key: 'payoff_pattern', label: '爽点兑现', text: '主角反制没有形成可见回报。' },
                { key: 'ending_hook_pattern', label: '章末追读', text: '章末缺少下一章非看不可的问题。' },
              ],
            },
          }),
        },
      ],
      runRecords: [
        {
          id: 10,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-03T00:00:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({ source: 'auto_creation_safe_batch', safety_limit: 3 }),
          output_ref: JSON.stringify({
            total: 3,
            success: 3,
            failed: 0,
            chapters: [
              { id: 15, chapter_no: 15, title: '内门影子', status: 'success', score: 84, word_count: 3180 },
              { id: 16, chapter_no: 16, title: '执事逼问', status: 'success', score: 85, word_count: 3090 },
              { id: 17, chapter_no: 17, title: '阵纹余波', status: 'success', score: 86, word_count: 3021 },
            ],
          }),
        },
      ],
    } as any)

    expect(model.batchReviewQueue.status).toBe('risk')
    expect((model.batchReviewQueue.riskRadar as any).chapterBenchmarkRiskCount).toBe(3)
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'chapter_benchmark')?.detail).toContain('标杆章')
    expect(model.batchReviewQueue.riskRadar.repairTasks.map((task: any) => task.issue_type)).toContain('chapter_benchmark_gap')
    const benchmarkTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'chapter_benchmark_gap')
    expect(benchmarkTask?.chapter_benchmark_sync?.missed.map((item: any) => item.label)).toContain('开篇钩子')
    expect(model.batchReviewQueue.handoff.riskLabels).toContain('标杆章')
    expect(model.batchReviewQueue.completionDashboard.score).toBeLessThan(90)
  })
  test('holds delivered safe batch when intent confirmation or benchmark recall execution is weak', () => {
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
        nextChapter: { ...baseWriting.nextChapter, id: 18, chapterNo: 18, title: '内门来人' },
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '内门招揽', goal: '新势力提出条件' }],
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
      storyState: { last_updated_chapter: 17 },
      chapters: [
        { id: 15, chapter_no: 15, title: '内门影子', chapter_text: '内门影子'.repeat(500) },
        { id: 16, chapter_no: 16, title: '执事逼问', chapter_text: '执事逼问'.repeat(500) },
        { id: 17, chapter_no: 17, title: '阵纹余波', chapter_text: '阵纹余波'.repeat(500) },
      ],
      reviews: [
        { id: 101, chapter_id: 15, review_type: 'prose_quality', created_at: '2026-06-03T01:00:00.000Z', payload: JSON.stringify({ score: 84, passed: true }) },
        { id: 102, chapter_id: 16, review_type: 'prose_quality', created_at: '2026-06-03T01:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 103, chapter_id: 17, review_type: 'prose_quality', created_at: '2026-06-03T01:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
        {
          id: 601,
          chapter_id: 15,
          review_type: 'intent_confirmation_sync',
          created_at: '2026-06-03T01:03:00.000Z',
          payload: JSON.stringify({
            intent_confirmation_sync: {
              status: 'warn',
              label: '意图确认缺口 2',
              missed_count: 2,
              missed: [
                { key: 'emotion_target', label: '情绪目标', text: '本章没有从压抑转为当众夺回主动权。' },
                { key: 'ending_handoff', label: '章尾承接', text: '带血腰牌没有成为下一章推动力。' },
              ],
            },
          }),
        },
        {
          id: 602,
          chapter_id: 16,
          review_type: 'benchmark_recall_sync',
          created_at: '2026-06-03T01:04:00.000Z',
          payload: JSON.stringify({
            benchmark_recall_sync: {
              status: 'warn',
              label: '文风召回缺口 1',
              missed_count: 1,
              missed: [
                { key: 'rhythm_reference', label: '节奏参照', text: '爆发后没有冷却承接，直接跳到总结。' },
              ],
            },
          }),
        },
      ],
      runRecords: [
        {
          id: 10,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-03T00:00:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({ source: 'auto_creation_safe_batch', safety_limit: 3 }),
          output_ref: JSON.stringify({
            total: 3,
            success: 3,
            failed: 0,
            chapters: [
              { id: 15, chapter_no: 15, title: '内门影子', status: 'success', score: 84, word_count: 3180 },
              { id: 16, chapter_no: 16, title: '执事逼问', status: 'success', score: 85, word_count: 3090 },
              { id: 17, chapter_no: 17, title: '阵纹余波', status: 'success', score: 86, word_count: 3021 },
            ],
          }),
        },
      ],
    } as any)

    expect(model.batchReviewQueue.status).toBe('risk')
    expect((model.batchReviewQueue.riskRadar as any).preDraftExecutionRiskCount).toBe(3)
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'pre_draft_execution')?.detail).toContain('写前执行缺口')
    expect(model.batchReviewQueue.riskRadar.repairTasks.map((task: any) => task.issue_type)).toEqual(expect.arrayContaining([
      'intent_confirmation_gap',
      'benchmark_recall_gap',
    ]))
    const intentTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'intent_confirmation_gap')
    const recallTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'benchmark_recall_gap')
    expect(intentTask?.intent_confirmation_sync?.missed.map((item: any) => item.label)).toContain('情绪目标')
    expect(recallTask?.benchmark_recall_sync?.missed.map((item: any) => item.label)).toContain('节奏参照')
    expect(model.batchReviewQueue.handoff.riskLabels).toContain('写前执行')
  })
  test('holds delivered safe batch when chapter attraction execution is weak', () => {
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
        nextChapter: { ...baseWriting.nextChapter, id: 18, chapterNo: 18, title: '内门来人' },
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '内门招揽', goal: '新势力提出条件' }],
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
      storyState: { last_updated_chapter: 17 },
      chapters: [
        { id: 15, chapter_no: 15, title: '内门影子', chapter_text: '内门影子'.repeat(500) },
        { id: 16, chapter_no: 16, title: '执事逼问', chapter_text: '执事逼问'.repeat(500) },
        { id: 17, chapter_no: 17, title: '阵纹余波', chapter_text: '阵纹余波'.repeat(500) },
      ],
      reviews: [
        { id: 101, chapter_id: 15, review_type: 'prose_quality', created_at: '2026-06-03T01:00:00.000Z', payload: JSON.stringify({ score: 84, passed: true }) },
        { id: 102, chapter_id: 16, review_type: 'prose_quality', created_at: '2026-06-03T01:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 103, chapter_id: 17, review_type: 'prose_quality', created_at: '2026-06-03T01:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
        {
          id: 503,
          chapter_id: 16,
          review_type: 'chapter_attraction_review',
          created_at: '2026-06-03T01:03:00.000Z',
          payload: JSON.stringify({
            chapter_attraction_review: {
              status: 'warn',
              label: '吸引力缺口 3',
              score: 62,
              weak_count: 3,
              priority_repair: '优先修章末翻页',
              weak_dimensions: [
                { key: 'scene_drive', label: '场景推进', status: 'warn', score: 57, issue: '中段缺少目标、阻碍、转折和回报。' },
                { key: 'payoff_density', label: '爽点密度', status: 'warn', score: 58, issue: '主角反制没有写成可见结果。' },
                { key: 'page_turn', label: '章末翻页', status: 'warn', score: 42, issue: '结尾没有留下下一章必须看的问题。' },
              ],
            },
          }),
        },
      ],
      runRecords: [
        {
          id: 10,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-03T00:00:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({ source: 'auto_creation_safe_batch', safety_limit: 3 }),
          output_ref: JSON.stringify({
            total: 3,
            success: 3,
            failed: 0,
            chapters: [
              { id: 15, chapter_no: 15, title: '内门影子', status: 'success', score: 84, word_count: 3180 },
              { id: 16, chapter_no: 16, title: '执事逼问', status: 'success', score: 85, word_count: 3090 },
              { id: 17, chapter_no: 17, title: '阵纹余波', status: 'success', score: 86, word_count: 3021 },
            ],
          }),
        },
      ],
    } as any)

    expect(model.batchReviewQueue.status).toBe('risk')
    expect((model.batchReviewQueue.riskRadar as any).chapterAttractionRiskCount).toBe(3)
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'chapter_attraction')?.detail).toContain('吸引力')
    expect(model.batchReviewQueue.riskRadar.repairTasks.map((task: any) => task.issue_type)).toContain('chapter_attraction_gap')
    const attractionTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'chapter_attraction_gap')
    expect(attractionTask?.chapter_attraction_review?.weak_dimensions.map((item: any) => item.label)).toContain('章末翻页')
    expect(attractionTask?.chapter_attraction_review?.priority_repair).toBe('优先修章末翻页')
    expect(model.batchReviewQueue.handoff.riskLabels).toContain('吸引力')
    expect(model.batchReviewQueue.completionDashboard.score).toBeLessThan(90)
  })
  test('holds delivered safe batch when reader trial review finds drop points in the batch', () => {
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
        nextChapter: { ...baseWriting.nextChapter, id: 11, chapterNo: 11, title: '内门来人' },
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '内门招揽', goal: '新势力提出条件' }],
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
      storyState: { last_updated_chapter: 10 },
      chapters: [
        { id: 8, chapter_no: 8, title: '试炼前夜', chapter_text: '试炼前夜'.repeat(500) },
        { id: 9, chapter_no: 9, title: '阵盘裂纹', chapter_text: '阵盘裂纹'.repeat(500) },
        { id: 10, chapter_no: 10, title: '外门震动', chapter_text: '外门震动'.repeat(500) },
      ],
      reviews: [
        { id: 101, chapter_id: 8, review_type: 'prose_quality', created_at: '2026-06-03T01:00:00.000Z', payload: JSON.stringify({ score: 84, passed: true }) },
        { id: 102, chapter_id: 9, review_type: 'prose_quality', created_at: '2026-06-03T01:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 103, chapter_id: 10, review_type: 'prose_quality', created_at: '2026-06-03T01:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
        {
          id: 601,
          review_type: 'reader_trial_review',
          created_at: '2026-06-03T01:03:00.000Z',
          payload: JSON.stringify({
            report: {
              status: 'needs_repair',
              score: 63,
              summary: '试读十章存在明显弃读点。',
              quality_bar: 'qidian_10k_reader_trial_baseline',
              drop_points: [
                '第8章中段解释宗门派系过密，试读用户可能弃读。',
                '第10章章末钩子弱，没有形成付费前继续阅读动力。',
              ],
              repair_actions: [
                '第8章删减派系解释，改成执事现场逼问。',
                '第10章重做章末未解决问题。',
              ],
              segments: [
                { key: 'trial_10', label: '试读十章', score: 63, verdict: '第8-10章掉速。' },
              ],
            },
          }),
        },
      ],
      runRecords: [
        {
          id: 10,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-03T00:00:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({ source: 'auto_creation_safe_batch', safety_limit: 3 }),
          output_ref: JSON.stringify({
            total: 3,
            success: 3,
            failed: 0,
            chapters: [
              { id: 8, chapter_no: 8, title: '试炼前夜', status: 'success', score: 84, word_count: 3180 },
              { id: 9, chapter_no: 9, title: '阵盘裂纹', status: 'success', score: 85, word_count: 3090 },
              { id: 10, chapter_no: 10, title: '外门震动', status: 'success', score: 86, word_count: 3021 },
            ],
          }),
        },
      ],
    } as any)

    expect(model.batchReviewQueue.status).toBe('risk')
    expect((model.batchReviewQueue.riskRadar as any).readerTrialRiskCount).toBe(2)
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'reader_trial')?.detail).toContain('试读弃读点')
    expect(model.batchReviewQueue.riskRadar.repairTasks.map((task: any) => task.issue_type)).toContain('reader_trial_drop_point')
    const trialTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'reader_trial_drop_point')
    expect(trialTask?.reader_trial_review?.drop_points).toContain('第8章中段解释宗门派系过密，试读用户可能弃读。')
    expect(trialTask?.reader_trial_review?.repair_actions).toContain('第10章重做章末未解决问题。')
    expect(model.batchReviewQueue.handoff.riskLabels).toContain('试读')
    expect(model.batchReviewQueue.completionDashboard.score).toBeLessThan(90)
  })
})

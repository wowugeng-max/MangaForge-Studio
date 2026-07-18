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

describe('buildAutoCreationDirectorModel expansion/structure', () => {
  test('keeps expansion on small batches while a five-chapter segment hotspot is unresolved', () => {
    const expandedFutureRoute = [
      { chapterNo: 13, title: '禁阵回声', chapterTask: '主角确认禁阵令后果', conflict: '内门要求立刻站队', endingHook: '禁阵令映出长老旧名', mainlineProgress: '推进内门规则谜团', riskTags: [] },
      { chapterNo: 14, title: '旧名', chapterTask: '主角用旧名反逼长老解释', conflict: '长老否认旧名并封锁现场', endingHook: '张智发现旧名对应禁阵卷宗', mainlineProgress: '打开禁阵旧案线', riskTags: [] },
      { chapterNo: 15, title: '卷宗裂页', chapterTask: '主角拿到禁阵卷宗残页', conflict: '同门夺页导致阵纹暴走', endingHook: '残页写着主角家族姓氏', mainlineProgress: '把家族线接入阵盘主线', riskTags: [] },
      { chapterNo: 16, title: '家族姓氏', chapterTask: '主角追问家族与禁阵关系', conflict: '内门弟子以家族罪名压迫主角', endingHook: '阵盘主动吞掉罪名烙印', mainlineProgress: '升级主角身世压力', riskTags: [] },
      { chapterNo: 17, title: '烙印消失', chapterTask: '主角公开反击罪名烙印', conflict: '长老必须在众人面前裁决', endingHook: '裁决钟响起第二声', mainlineProgress: '进入内门裁决小高潮', riskTags: [] },
    ]
    const model = buildAutoCreationDirectorModel({
      planning: readySafeBatchPlanning({ futureRoute: expandedFutureRoute }),
      writing: readySafeBatchWriting({
        nextChapter: { ...baseWriting.nextChapter, id: 13, chapterNo: 13, title: '扩批后续' },
        previousChapter: { chapterNo: 12, title: '禁阵令', wordCount: 3180, hasProse: true },
      }),
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 49 },
      chapters: [41, 42, 43, 44, 45, 46, 47, 48, 49, 8, 9, 10, 11, 12].map(chapterNo => ({
        id: chapterNo,
        chapter_no: chapterNo,
        title: `扩批反馈${chapterNo}`,
        chapter_text: '扩批反馈正文'.repeat(500),
      })),
      reviews: [
        ...strengthenedAcceptanceQualityReviews([41, 42, 43], 4701, '2026-06-09T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([44, 45, 46], 4711, '2026-06-10T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([47, 48, 49], 4721, '2026-06-11T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([8, 9, 10, 11, 12], 4731, '2026-06-12T01:00:00.000Z'),
        {
          id: 4741,
          chapter_id: 10,
          review_type: 'chapter_core_drift',
          created_at: '2026-06-12T01:10:00.000Z',
          payload: JSON.stringify({ chapter_core_drift: { status: 'warn', drift_risks: ['中段偏离阵盘主线承诺'] } }),
        },
        {
          id: 4742,
          chapter_id: 11,
          review_type: 'reader_payoff_sync',
          created_at: '2026-06-12T01:11:00.000Z',
          payload: JSON.stringify({ reader_payoff_sync: { status: 'warn', debt_count: 1, missed: ['内门门槛回报没有显性兑现'] } }),
        },
        {
          id: 4743,
          chapter_id: 11,
          review_type: 'reader_retention_sync',
          created_at: '2026-06-12T01:12:00.000Z',
          payload: JSON.stringify({ reader_retention_sync: { status: 'warn', missed_count: 1, missed: ['第11章章末没有留下下一章必看问题'] } }),
        },
      ],
      runRecords: [
        strengthenedAcceptanceBatchRun({ id: 570, createdAt: '2026-06-09T00:00:00.000Z', chapterNos: [41, 42, 43] }),
        strengthenedAcceptanceBatchRun({ id: 571, createdAt: '2026-06-10T00:00:00.000Z', chapterNos: [44, 45, 46] }),
        strengthenedAcceptanceBatchRun({ id: 572, createdAt: '2026-06-11T00:00:00.000Z', chapterNos: [47, 48, 49] }),
        expandedSafeBatchRun({ id: 573, createdAt: '2026-06-12T00:00:00.000Z', chapterNos: [8, 9, 10, 11, 12] }),
      ],
    } as any)

    const policy = model.batchGuardrail.preflight.inputSnapshot.safe_batch_expansion_policy

    expect(policy).toMatchObject({
      status: 'recovering',
      target_chapter_count: 3,
      expansion_feedback: {
        status: 'rollback_to_small_batch',
        target_chapter_count: 3,
        latest_chapter_nos: [8, 9, 10, 11, 12],
      },
    })
    expect(policy.summary).toContain('扩批分段热区')
  })

  test('restores five-chapter expansion after segment hotspot repair passes recheck', () => {
    const expandedFutureRoute = [
      ...safeBatchFutureRoute,
      { chapterNo: 11, title: '内门门槛', chapterTask: '主角第一次触碰内门条件', conflict: '招揽背后藏着交换代价', endingHook: '长老递来一枚禁阵令', mainlineProgress: '进入内门势力博弈', riskTags: [] },
      { chapterNo: 12, title: '禁阵令', chapterTask: '主角用禁阵令反逼对手表态', conflict: '同门要求主角公开阵盘来源', endingHook: '阵盘浮出第二层铭文', mainlineProgress: '扩大阵盘主线谜团', riskTags: [] },
    ]
    const model = buildAutoCreationDirectorModel({
      planning: readySafeBatchPlanning({ futureRoute: expandedFutureRoute }),
      writing: readySafeBatchWriting({
        nextChapter: { ...baseWriting.nextChapter, id: 13, chapterNo: 13, title: '扩批后续' },
        previousChapter: { chapterNo: 12, title: '禁阵令', wordCount: 3180, hasProse: true },
      }),
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 49 },
      chapters: [41, 42, 43, 44, 45, 46, 47, 48, 49, 8, 9, 10, 11, 12].map(chapterNo => ({
        id: chapterNo,
        chapter_no: chapterNo,
        title: `扩批反馈${chapterNo}`,
        chapter_text: '扩批反馈正文'.repeat(500),
      })),
      reviews: [
        ...strengthenedAcceptanceQualityReviews([41, 42, 43], 4751, '2026-06-09T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([44, 45, 46], 4761, '2026-06-10T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([47, 48, 49], 4771, '2026-06-11T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([8, 9, 10, 11, 12], 4781, '2026-06-12T01:00:00.000Z'),
        {
          id: 4791,
          chapter_id: 10,
          review_type: 'chapter_core_drift',
          created_at: '2026-06-12T01:10:00.000Z',
          payload: JSON.stringify({ chapter_core_drift: { status: 'warn', drift_risks: ['中段偏离阵盘主线承诺'] } }),
        },
        {
          id: 4792,
          chapter_id: 11,
          review_type: 'reader_payoff_sync',
          created_at: '2026-06-12T01:11:00.000Z',
          payload: JSON.stringify({ reader_payoff_sync: { status: 'warn', debt_count: 1, missed: ['内门门槛回报没有显性兑现'] } }),
        },
        {
          id: 4793,
          chapter_id: 11,
          review_type: 'reader_retention_sync',
          created_at: '2026-06-12T01:12:00.000Z',
          payload: JSON.stringify({ reader_retention_sync: { status: 'warn', missed_count: 1, missed: ['第11章章末没有留下下一章必看问题'] } }),
        },
        {
          id: 4794,
          chapter_id: 10,
          review_type: 'prose_quality',
          created_at: '2026-06-12T02:30:00.000Z',
          payload: JSON.stringify({ score: 90, passed: true }),
        },
        {
          id: 4795,
          chapter_id: 11,
          review_type: 'prose_quality',
          created_at: '2026-06-12T02:31:00.000Z',
          payload: JSON.stringify({ score: 91, passed: true }),
        },
      ],
      runRecords: [
        strengthenedAcceptanceBatchRun({ id: 574, createdAt: '2026-06-09T00:00:00.000Z', chapterNos: [41, 42, 43] }),
        strengthenedAcceptanceBatchRun({ id: 575, createdAt: '2026-06-10T00:00:00.000Z', chapterNos: [44, 45, 46] }),
        strengthenedAcceptanceBatchRun({ id: 576, createdAt: '2026-06-11T00:00:00.000Z', chapterNos: [47, 48, 49] }),
        expandedSafeBatchRun({ id: 577, createdAt: '2026-06-12T00:00:00.000Z', chapterNos: [8, 9, 10, 11, 12] }),
        {
          id: 578,
          run_type: 'longform_production_repair',
          created_at: '2026-06-12T02:00:00.000Z',
          completed_at: '2026-06-12T02:20:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({
            source: 'auto_creation_safe_batch_risk',
            batch_created_at: '2026-06-12T00:00:00.000Z',
          }),
          output_ref: JSON.stringify({
            tasks: [
              { issue_type: 'safe_batch_expansion_segment_hotspot', task_status: 'resolved', chapter_no: 10, resolved_at: '2026-06-12T02:15:00.000Z' },
              { issue_type: 'core_drift', task_status: 'resolved', chapter_no: 10, resolved_at: '2026-06-12T02:16:00.000Z' },
              { issue_type: 'reader_payoff_debt', task_status: 'resolved', chapter_no: 11, resolved_at: '2026-06-12T02:17:00.000Z' },
              { issue_type: 'reader_pull_missed', task_status: 'resolved', chapter_no: 11, resolved_at: '2026-06-12T02:18:00.000Z' },
            ],
          }),
        },
      ],
    } as any)

    const segmentSignal = model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'batch_expansion_segment' as any)
    const policy = model.batchGuardrail.preflight.inputSnapshot.safe_batch_expansion_policy

    expect(model.batchReviewQueue.status).toBe('done')
    expect(segmentSignal?.status).toBe('ok')
    expect(policy).toMatchObject({
      status: 'expanded',
      target_chapter_count: 5,
      expansion_feedback: {
        status: 'recovered',
        target_chapter_count: 5,
        latest_chapter_nos: [8, 9, 10, 11, 12],
      },
    })
    expect(policy.summary).toContain('扩批分段热区已修复')
  })

  test('tracks consecutive clean five-chapter expansion batches as a stability streak', () => {
    const model = buildAutoCreationDirectorModel({
      planning: readySafeBatchPlanning({ futureRoute: futureRouteRange(18, 5) }),
      writing: readySafeBatchWriting({
        nextChapter: { ...baseWriting.nextChapter, id: 18, chapterNo: 18, title: '稳定扩批18' },
        previousChapter: { chapterNo: 17, title: '稳定扩批17', wordCount: 3180, hasProse: true },
      }),
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 49 },
      chapters: [41, 42, 43, 44, 45, 46, 47, 48, 49, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map(chapterNo => ({
        id: chapterNo,
        chapter_no: chapterNo,
        title: `稳定扩批${chapterNo}`,
        chapter_text: '稳定扩批正文'.repeat(500),
      })),
      reviews: [
        ...strengthenedAcceptanceQualityReviews([41, 42, 43], 4801, '2026-06-09T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([44, 45, 46], 4811, '2026-06-10T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([47, 48, 49], 4821, '2026-06-11T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([8, 9, 10, 11, 12], 4831, '2026-06-12T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([13, 14, 15, 16, 17], 4841, '2026-06-13T01:00:00.000Z'),
      ],
      runRecords: [
        strengthenedAcceptanceBatchRun({ id: 579, createdAt: '2026-06-09T00:00:00.000Z', chapterNos: [41, 42, 43] }),
        strengthenedAcceptanceBatchRun({ id: 580, createdAt: '2026-06-10T00:00:00.000Z', chapterNos: [44, 45, 46] }),
        strengthenedAcceptanceBatchRun({ id: 581, createdAt: '2026-06-11T00:00:00.000Z', chapterNos: [47, 48, 49] }),
        expandedSafeBatchRun({ id: 582, createdAt: '2026-06-12T00:00:00.000Z', chapterNos: [8, 9, 10, 11, 12] }),
        expandedSafeBatchRun({ id: 583, createdAt: '2026-06-13T00:00:00.000Z', chapterNos: [13, 14, 15, 16, 17] }),
      ],
    } as any)

    const policy = model.batchGuardrail.preflight.inputSnapshot.safe_batch_expansion_policy

    expect(policy).toMatchObject({
      status: 'expanded',
      target_chapter_count: 5,
      expansion_feedback: {
        status: 'passed',
        target_chapter_count: 5,
        latest_chapter_nos: [13, 14, 15, 16, 17],
        stable_pass_streak: 2,
        recent_expanded_batch_count: 2,
      },
    })
    expect(policy.expansion_feedback.summary).toContain('连续 2 批5章扩批通过')
  })

  test('prioritizes structure repair when the same expansion segment becomes hot again', () => {
    const model = buildAutoCreationDirectorModel({
      planning: readySafeBatchPlanning({ futureRoute: futureRouteRange(18, 5) }),
      writing: readySafeBatchWriting({
        nextChapter: { ...baseWriting.nextChapter, id: 18, chapterNo: 18, title: '稳定扩批18' },
        previousChapter: { chapterNo: 17, title: '稳定扩批17', wordCount: 3180, hasProse: true },
      }),
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 49 },
      chapters: [41, 42, 43, 44, 45, 46, 47, 48, 49, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map(chapterNo => ({
        id: chapterNo,
        chapter_no: chapterNo,
        title: `复发扩批${chapterNo}`,
        chapter_text: '复发扩批正文'.repeat(500),
      })),
      reviews: [
        ...strengthenedAcceptanceQualityReviews([41, 42, 43], 4851, '2026-06-09T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([44, 45, 46], 4861, '2026-06-10T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([47, 48, 49], 4871, '2026-06-11T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([8, 9, 10, 11, 12], 4881, '2026-06-12T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([13, 14, 15, 16, 17], 4891, '2026-06-13T01:00:00.000Z'),
        {
          id: 4901,
          chapter_id: 10,
          review_type: 'chapter_core_drift',
          created_at: '2026-06-12T01:10:00.000Z',
          payload: JSON.stringify({ chapter_core_drift: { status: 'warn', drift_risks: ['中段第一次偏离阵盘主线承诺'] } }),
        },
        {
          id: 4902,
          chapter_id: 11,
          review_type: 'reader_payoff_sync',
          created_at: '2026-06-12T01:11:00.000Z',
          payload: JSON.stringify({ reader_payoff_sync: { status: 'warn', debt_count: 1, missed: ['第一次中段回报没有显性兑现'] } }),
        },
        {
          id: 4903,
          chapter_id: 15,
          review_type: 'chapter_core_drift',
          created_at: '2026-06-13T01:10:00.000Z',
          payload: JSON.stringify({ chapter_core_drift: { status: 'warn', drift_risks: ['中段第二次偏离阵盘主线承诺'] } }),
        },
        {
          id: 4904,
          chapter_id: 16,
          review_type: 'reader_payoff_sync',
          created_at: '2026-06-13T01:11:00.000Z',
          payload: JSON.stringify({ reader_payoff_sync: { status: 'warn', debt_count: 1, missed: ['第二次中段回报没有显性兑现'] } }),
        },
        {
          id: 4905,
          chapter_id: 16,
          review_type: 'reader_retention_sync',
          created_at: '2026-06-13T01:12:00.000Z',
          payload: JSON.stringify({ reader_retention_sync: { status: 'warn', missed_count: 1, missed: ['第二次中段章末没有留下下一章必看问题'] } }),
        },
      ],
      runRecords: [
        strengthenedAcceptanceBatchRun({ id: 584, createdAt: '2026-06-09T00:00:00.000Z', chapterNos: [41, 42, 43] }),
        strengthenedAcceptanceBatchRun({ id: 585, createdAt: '2026-06-10T00:00:00.000Z', chapterNos: [44, 45, 46] }),
        strengthenedAcceptanceBatchRun({ id: 586, createdAt: '2026-06-11T00:00:00.000Z', chapterNos: [47, 48, 49] }),
        expandedSafeBatchRun({ id: 587, createdAt: '2026-06-12T00:00:00.000Z', chapterNos: [8, 9, 10, 11, 12] }),
        expandedSafeBatchRun({ id: 588, createdAt: '2026-06-13T00:00:00.000Z', chapterNos: [13, 14, 15, 16, 17] }),
      ],
    } as any)

    const policy = model.batchGuardrail.preflight.inputSnapshot.safe_batch_expansion_policy
    const structureTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'safe_batch_expansion_structure_repair')
    const roadmap = policy.safe_batch_recovery_roadmap

    expect(policy).toMatchObject({
      status: 'recovering',
      target_chapter_count: 3,
      expansion_feedback: {
        status: 'rollback_to_small_batch',
        stable_pass_streak: 0,
        repeated_hotspot_segment: {
          key: 'middle',
          label: '中段',
          count: 2,
        },
      },
    })
    expect(policy.expansion_feedback.summary).toContain('中段连续 2 次扩批热区')
    expect(policy.expansion_feedback.summary).toContain('批次结构改写')
    expect(structureTask).toMatchObject({
      task_type: 'repair_planning',
      issue_type: 'safe_batch_expansion_structure_repair',
      severity: 'high',
      safe_batch_expansion_structure_review: {
        repeated_hotspot_segment: {
          key: 'middle',
          label: '中段',
          count: 2,
        },
        structure_actions: expect.arrayContaining([
          expect.stringContaining('中段固定职责'),
          expect.stringContaining('批次节奏重排'),
        ]),
      },
    })
    expect(structureTask?.action).toContain('批次结构改写')
    expect(structureTask?.action).toContain('中段固定段落治理')
  })

  test('feeds resolved expansion structure repair into the next small validation batch brief', () => {
    const model = buildAutoCreationDirectorModel({
      planning: readySafeBatchPlanning({ futureRoute: futureRouteRange(50, 5) }),
      writing: readySafeBatchWriting({
        nextChapter: { ...baseWriting.nextChapter, id: 50, chapterNo: 50, title: '结构验证50' },
        previousChapter: { chapterNo: 49, title: '强化趋势49', wordCount: 3180, hasProse: true },
      }),
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 49 },
      chapters: [41, 42, 43, 44, 45, 46, 47, 48, 49, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map(chapterNo => ({
        id: chapterNo,
        chapter_no: chapterNo,
        title: `结构验证${chapterNo}`,
        chapter_text: '结构验证正文'.repeat(500),
      })),
      reviews: [
        ...strengthenedAcceptanceQualityReviews([41, 42, 43], 4911, '2026-06-09T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([44, 45, 46], 4921, '2026-06-10T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([47, 48, 49], 4931, '2026-06-11T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([8, 9, 10, 11, 12], 4941, '2026-06-12T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([13, 14, 15, 16, 17], 4951, '2026-06-13T01:00:00.000Z'),
        {
          id: 4961,
          chapter_id: 10,
          review_type: 'chapter_core_drift',
          created_at: '2026-06-12T01:10:00.000Z',
          payload: JSON.stringify({ chapter_core_drift: { status: 'warn', drift_risks: ['中段第一次偏离阵盘主线承诺'] } }),
        },
        {
          id: 4962,
          chapter_id: 11,
          review_type: 'reader_payoff_sync',
          created_at: '2026-06-12T01:11:00.000Z',
          payload: JSON.stringify({ reader_payoff_sync: { status: 'warn', debt_count: 1, missed: ['第一次中段回报没有显性兑现'] } }),
        },
        {
          id: 4963,
          chapter_id: 15,
          review_type: 'chapter_core_drift',
          created_at: '2026-06-13T01:10:00.000Z',
          payload: JSON.stringify({ chapter_core_drift: { status: 'warn', drift_risks: ['中段第二次偏离阵盘主线承诺'] } }),
        },
        {
          id: 4964,
          chapter_id: 16,
          review_type: 'reader_payoff_sync',
          created_at: '2026-06-13T01:11:00.000Z',
          payload: JSON.stringify({ reader_payoff_sync: { status: 'warn', debt_count: 1, missed: ['第二次中段回报没有显性兑现'] } }),
        },
        {
          id: 4965,
          chapter_id: 16,
          review_type: 'reader_retention_sync',
          created_at: '2026-06-13T01:12:00.000Z',
          payload: JSON.stringify({ reader_retention_sync: { status: 'warn', missed_count: 1, missed: ['第二次中段章末没有留下下一章必看问题'] } }),
        },
        {
          id: 4971,
          chapter_id: 10,
          review_type: 'prose_quality',
          created_at: '2026-06-13T02:28:00.000Z',
          payload: JSON.stringify({ score: 88, passed: true }),
        },
        {
          id: 4972,
          chapter_id: 11,
          review_type: 'prose_quality',
          created_at: '2026-06-13T02:29:00.000Z',
          payload: JSON.stringify({ score: 89, passed: true }),
        },
        {
          id: 4973,
          chapter_id: 15,
          review_type: 'prose_quality',
          created_at: '2026-06-13T02:30:00.000Z',
          payload: JSON.stringify({ score: 89, passed: true }),
        },
        {
          id: 4974,
          chapter_id: 16,
          review_type: 'prose_quality',
          created_at: '2026-06-13T02:31:00.000Z',
          payload: JSON.stringify({ score: 90, passed: true }),
        },
      ],
      runRecords: [
        strengthenedAcceptanceBatchRun({ id: 589, createdAt: '2026-06-09T00:00:00.000Z', chapterNos: [41, 42, 43] }),
        strengthenedAcceptanceBatchRun({ id: 590, createdAt: '2026-06-10T00:00:00.000Z', chapterNos: [44, 45, 46] }),
        strengthenedAcceptanceBatchRun({ id: 591, createdAt: '2026-06-11T00:00:00.000Z', chapterNos: [47, 48, 49] }),
        expandedSafeBatchRun({ id: 592, createdAt: '2026-06-12T00:00:00.000Z', chapterNos: [8, 9, 10, 11, 12] }),
        expandedSafeBatchRun({ id: 593, createdAt: '2026-06-13T00:00:00.000Z', chapterNos: [13, 14, 15, 16, 17] }),
        {
          id: 594,
          run_type: 'longform_production_repair',
          created_at: '2026-06-13T02:00:00.000Z',
          completed_at: '2026-06-13T02:20:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({ source: 'auto_creation_safe_batch_risk' }),
          output_ref: JSON.stringify({
            tasks: [
              {
                issue_type: 'safe_batch_expansion_structure_repair',
                task_status: 'resolved',
                chapter_no: 15,
                safe_batch_expansion_structure_review: {
                  repeated_hotspot_segment: { key: 'middle', label: '中段', count: 2 },
                  latest_chapter_nos: [13, 14, 15, 16, 17],
                  affected_chapter_nos: [15, 16],
                  default_five_chapter_lane_template_repair: {
                    visible: true,
                    label: '默认档位模板验证缺项',
                    summary: '默认档位模板回检未通过：第91章缺回报密度，结构修复已补入下一轮任务书。',
                    validation_chapter_nos: [90, 91, 92],
                    missing_count: 1,
                    missing_requirements: [
                      { key: 'default_lane_payoff_density', label: '回报密度', chapter_nos: [91] },
                    ],
                    repair_actions: [
                      '回报密度修复：第91章必须补出显性回报，让读者看到收益、反制结果或阶段结算。',
                    ],
                  },
                  structure_actions: [
                    '重写中段固定职责：每批第3-4章必须完成主线转折、显性回报和章末追读。',
                    '批次节奏重排：前段抛压，中段兑现并升级，后段留钩。',
                  ],
                },
              },
              {
                issue_type: 'safe_batch_expansion_structure_decision_mismatch',
                task_status: 'resolved',
                chapter_no: 50,
                safe_batch_expansion_structure_decision_review: {
                  default_five_chapter_lane_redesign: {
                    reason: 'repeated_recovery_verdict_relapse',
                    relapse_count: 2,
                    repeated_failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
                    segment_duty_rewrite: '段位职责重写：默认 5 章内前段压迫、中段兑现、后段升级钩子。',
                    conflict_rotation: '冲突轮换：规则压迫、人物对抗、信息误导至少三类轮换。',
                    payoff_density: '回报密度：每章至少交付一个显性回报。',
                    ending_hook_template: '章末追读模板：最后 300 字落触发事件、读者问题、下一章风险。',
                  },
                  failed_items: [
                    { key: 'default_lane_segment_duty', label: '默认档位段位职责', count: 1 },
                    { key: 'default_lane_conflict_rotation', label: '冲突轮换', count: 1 },
                    { key: 'default_lane_payoff_density', label: '回报密度', count: 1 },
                    { key: 'default_lane_ending_hook_template', label: '章末追读模板', count: 1 },
                  ],
                },
              },
              { issue_type: 'core_drift', task_status: 'resolved', chapter_no: 15, resolved_at: '2026-06-13T02:12:00.000Z' },
              { issue_type: 'core_drift', task_status: 'resolved', chapter_no: 10, resolved_at: '2026-06-13T02:12:00.000Z' },
              { issue_type: 'reader_payoff_debt', task_status: 'resolved', chapter_no: 11, resolved_at: '2026-06-13T02:13:00.000Z' },
              { issue_type: 'reader_pull_missed', task_status: 'resolved', chapter_no: 11, resolved_at: '2026-06-13T02:14:00.000Z' },
              { issue_type: 'reader_payoff_debt', task_status: 'resolved', chapter_no: 16, resolved_at: '2026-06-13T02:13:00.000Z' },
              { issue_type: 'reader_pull_missed', task_status: 'resolved', chapter_no: 16, resolved_at: '2026-06-13T02:14:00.000Z' },
            ],
          }),
        },
      ],
    } as any)

    const verification = model.batchGuardrail.nextBatchBrief.expansionStructureVerification

    expect(model.batchGuardrail.safeChapterCount).toBe(3)
    expect(model.batchGuardrail.nextBatchBrief.chapterRangeLabel).toBe('第50-52章')
    expect(verification).toMatchObject({
      source: 'safe_batch_expansion_structure_repair',
      repeated_hotspot_segment: {
        key: 'middle',
        label: '中段',
        count: 2,
      },
      validation_chapter_nos: [50, 51, 52],
    })
    expect(verification?.fixed_segment_role).toContain('中段固定职责')
    expect(verification?.conflict_rotation).toContain('冲突来源')
    expect(verification?.explicit_payoff).toContain('显性回报')
    expect(verification?.ending_hook_requirement).toContain('章末追读')
    expect(verification?.default_five_chapter_lane_template).toMatchObject({
      visible: true,
      status: 'fulfilled',
      source: 'safe_batch_expansion_structure_repair',
      source_run_id: 594,
      repaired_missing_requirements: [
        { key: 'default_lane_payoff_density', label: '回报密度', chapter_nos: [91] },
      ],
      requirements: [
        { key: 'default_lane_segment_duty', label: '默认档位段位职责', status: 'fulfilled' },
        { key: 'default_lane_conflict_rotation', label: '冲突轮换', status: 'fulfilled' },
        { key: 'default_lane_payoff_density', label: '回报密度', status: 'fulfilled' },
        { key: 'default_lane_ending_hook_template', label: '章末追读模板', status: 'fulfilled' },
      ],
    })
    expect((verification?.default_five_chapter_lane_template?.repair_actions || []).join('\n')).toContain('第91章必须补出显性回报')
    expect(verification?.default_five_chapter_lane_template?.summary).toContain('下一轮验证批逐章继承')
    expect(verification?.default_five_chapter_lane_template?.summary).toContain('第91章缺回报密度')
    expect(verification?.default_five_chapter_lane_template?.segment_duty_rewrite).toContain('前段压迫')
    expect(verification?.default_five_chapter_lane_template?.conflict_rotation).toContain('三类轮换')
    expect(verification?.default_five_chapter_lane_template?.payoff_density).toContain('显性回报')
    expect(verification?.default_five_chapter_lane_template?.ending_hook_template).toContain('最后 300 字')
    expect(model.batchGuardrail.nextBatchBrief.startChecklist.find(item => item.key === 'expansion_structure')).toMatchObject({
      status: 'ok',
      detail: expect.stringContaining('中段固定职责'),
    })
    expect(model.batchGuardrail.preflight.inputSnapshot.next_batch_brief.expansionStructureVerification).toMatchObject({
      validation_chapter_nos: [50, 51, 52],
    })
    expect(model.batchGuardrail.preflight.inputSnapshot.next_batch_brief.expansionStructureVerification.default_five_chapter_lane_template?.status).toBe('fulfilled')
    expect(model.batchGuardrail.preflight.inputSnapshot.next_batch_brief.expansionStructureVerification.default_five_chapter_lane_template?.requirements).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'default_lane_segment_duty', status: 'fulfilled' }),
    ]))
    expect((model.batchGuardrail.preflight.inputSnapshot.next_batch_brief.expansionStructureVerification.default_five_chapter_lane_template?.repair_actions || []).join('\n')).toContain('第91章必须补出显性回报')
    expect(model.batchGuardrail.preflight.inputSnapshot.safe_batch_expansion_structure_verification).toMatchObject({
      validation_chapter_nos: [50, 51, 52],
    })
    expect(model.batchGuardrail.preflight.inputSnapshot.safe_batch_expansion_structure_verification.default_five_chapter_lane_template?.status).toBe('fulfilled')
    expect(model.batchGuardrail.preflight.inputSnapshot.safe_batch_expansion_structure_verification.default_five_chapter_lane_template?.requirements).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'default_lane_ending_hook_template', status: 'fulfilled' }),
    ]))
    expect(model.batchGuardrail.preflight.inputSnapshot.safe_batch_expansion_structure_verification.default_five_chapter_lane_template?.repaired_missing_requirements).toEqual([
      expect.objectContaining({ key: 'default_lane_payoff_density', chapter_nos: [91] }),
    ])
  })

  test('restores five-chapter expansion after the structure validation batch passes', () => {
    const model = buildAutoCreationDirectorModel({
      planning: readySafeBatchPlanning({ futureRoute: futureRouteRange(53, 5) }),
      writing: readySafeBatchWriting({
        nextChapter: { ...baseWriting.nextChapter, id: 53, chapterNo: 53, title: '结构验证后53' },
        previousChapter: { chapterNo: 52, title: '结构验证52', wordCount: 3180, hasProse: true },
      }),
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 52 },
      chapters: [41, 42, 43, 44, 45, 46, 47, 48, 49, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 50, 51, 52].map(chapterNo => ({
        id: chapterNo,
        chapter_no: chapterNo,
        title: `结构验证${chapterNo}`,
        chapter_text: '结构验证正文'.repeat(500),
      })),
      reviews: [
        ...strengthenedAcceptanceQualityReviews([41, 42, 43], 4981, '2026-06-09T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([44, 45, 46], 4991, '2026-06-10T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([47, 48, 49], 5001, '2026-06-11T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([8, 9, 10, 11, 12], 5011, '2026-06-12T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([13, 14, 15, 16, 17], 5021, '2026-06-13T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([50, 51, 52], 5031, '2026-06-14T01:00:00.000Z'),
        {
          id: 5041,
          chapter_id: 10,
          review_type: 'chapter_core_drift',
          created_at: '2026-06-12T01:10:00.000Z',
          payload: JSON.stringify({ chapter_core_drift: { status: 'warn', drift_risks: ['中段第一次偏离阵盘主线承诺'] } }),
        },
        {
          id: 5042,
          chapter_id: 11,
          review_type: 'reader_payoff_sync',
          created_at: '2026-06-12T01:11:00.000Z',
          payload: JSON.stringify({ reader_payoff_sync: { status: 'warn', debt_count: 1, missed: ['第一次中段回报没有显性兑现'] } }),
        },
        {
          id: 5043,
          chapter_id: 15,
          review_type: 'chapter_core_drift',
          created_at: '2026-06-13T01:10:00.000Z',
          payload: JSON.stringify({ chapter_core_drift: { status: 'warn', drift_risks: ['中段第二次偏离阵盘主线承诺'] } }),
        },
        {
          id: 5044,
          chapter_id: 16,
          review_type: 'reader_payoff_sync',
          created_at: '2026-06-13T01:11:00.000Z',
          payload: JSON.stringify({ reader_payoff_sync: { status: 'warn', debt_count: 1, missed: ['第二次中段回报没有显性兑现'] } }),
        },
        {
          id: 5045,
          chapter_id: 16,
          review_type: 'reader_retention_sync',
          created_at: '2026-06-13T01:12:00.000Z',
          payload: JSON.stringify({ reader_retention_sync: { status: 'warn', missed_count: 1, missed: ['第二次中段章末没有留下下一章必看问题'] } }),
        },
        {
          id: 5046,
          chapter_id: 10,
          review_type: 'prose_quality',
          created_at: '2026-06-13T02:28:00.000Z',
          payload: JSON.stringify({ score: 88, passed: true }),
        },
        {
          id: 5047,
          chapter_id: 11,
          review_type: 'prose_quality',
          created_at: '2026-06-13T02:29:00.000Z',
          payload: JSON.stringify({ score: 89, passed: true }),
        },
        {
          id: 5048,
          chapter_id: 15,
          review_type: 'prose_quality',
          created_at: '2026-06-13T02:30:00.000Z',
          payload: JSON.stringify({ score: 89, passed: true }),
        },
        {
          id: 5049,
          chapter_id: 16,
          review_type: 'prose_quality',
          created_at: '2026-06-13T02:31:00.000Z',
          payload: JSON.stringify({ score: 90, passed: true }),
        },
      ],
      runRecords: [
        strengthenedAcceptanceBatchRun({ id: 595, createdAt: '2026-06-09T00:00:00.000Z', chapterNos: [41, 42, 43] }),
        strengthenedAcceptanceBatchRun({ id: 596, createdAt: '2026-06-10T00:00:00.000Z', chapterNos: [44, 45, 46] }),
        strengthenedAcceptanceBatchRun({ id: 597, createdAt: '2026-06-11T00:00:00.000Z', chapterNos: [47, 48, 49] }),
        expandedSafeBatchRun({ id: 598, createdAt: '2026-06-12T00:00:00.000Z', chapterNos: [8, 9, 10, 11, 12] }),
        expandedSafeBatchRun({ id: 599, createdAt: '2026-06-13T00:00:00.000Z', chapterNos: [13, 14, 15, 16, 17] }),
        {
          id: 600,
          run_type: 'longform_production_repair',
          created_at: '2026-06-13T02:00:00.000Z',
          completed_at: '2026-06-13T02:20:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({ source: 'auto_creation_safe_batch_risk' }),
          output_ref: JSON.stringify({
            tasks: [{
              issue_type: 'safe_batch_expansion_structure_repair',
              task_status: 'resolved',
              chapter_no: 15,
              safe_batch_expansion_structure_review: {
                repeated_hotspot_segment: { key: 'middle', label: '中段', count: 2 },
                latest_chapter_nos: [13, 14, 15, 16, 17],
                affected_chapter_nos: [15, 16],
                structure_actions: ['重写中段固定职责：每批第3-4章必须完成主线转折、显性回报和章末追读。'],
              },
            },
            { issue_type: 'core_drift', task_status: 'resolved', chapter_no: 10, resolved_at: '2026-06-13T02:12:00.000Z' },
            { issue_type: 'reader_payoff_debt', task_status: 'resolved', chapter_no: 11, resolved_at: '2026-06-13T02:13:00.000Z' },
            { issue_type: 'reader_pull_missed', task_status: 'resolved', chapter_no: 11, resolved_at: '2026-06-13T02:14:00.000Z' },
            { issue_type: 'core_drift', task_status: 'resolved', chapter_no: 15, resolved_at: '2026-06-13T02:12:00.000Z' },
            { issue_type: 'reader_payoff_debt', task_status: 'resolved', chapter_no: 16, resolved_at: '2026-06-13T02:13:00.000Z' },
            { issue_type: 'reader_pull_missed', task_status: 'resolved', chapter_no: 16, resolved_at: '2026-06-13T02:14:00.000Z' }],
          }),
        },
        expansionStructureValidationBatchRun({ id: 601, createdAt: '2026-06-14T00:00:00.000Z', chapterNos: [50, 51, 52] }),
      ],
    } as any)

    const policy = model.batchGuardrail.preflight.inputSnapshot.safe_batch_expansion_policy
    const structureSignal = model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'batch_expansion_structure' as any)

    expect(model.batchGuardrail.safeChapterCount).toBe(5)
    expect(policy).toMatchObject({
      status: 'expanded',
      target_chapter_count: 5,
      expansion_feedback: {
        status: 'recovered',
        target_chapter_count: 5,
        expansion_structure_validation_result: {
          status: 'ok',
          validation_chapter_nos: [50, 51, 52],
          risk_count: 0,
        },
      },
    })
    expect(structureSignal).toMatchObject({
      status: 'ok',
      detail: expect.stringContaining('结构验证批通过'),
    })
  })

  test('feeds recovery validation batches back into review queue and five-chapter recovery roadmap', () => {
    const validationChapterNos = [50, 51, 52]
    const model = buildAutoCreationDirectorModel({
      planning: readySafeBatchPlanning({ futureRoute: futureRouteRange(53, 5) }),
      writing: readySafeBatchWriting({
        nextChapter: { ...baseWriting.nextChapter, id: 53, chapterNo: 53, title: '恢复验证后53' },
        previousChapter: { chapterNo: 52, title: '恢复验证52', wordCount: 3180, hasProse: true },
      }),
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 52 },
      chapters: [...[41, 42, 43, 44, 45, 46, 47, 48, 49], ...validationChapterNos].map(chapterNo => ({
        id: chapterNo,
        chapter_no: chapterNo,
        title: `恢复验证${chapterNo}`,
        chapter_text: '恢复验证正文'.repeat(500),
      })),
      reviews: [
        ...strengthenedAcceptanceQualityReviews([41, 42, 43], 5121, '2026-06-09T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([44, 45, 46], 5131, '2026-06-10T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([47, 48, 49], 5141, '2026-06-11T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews(validationChapterNos, 5151, '2026-06-14T01:00:00.000Z'),
      ],
      runRecords: [
        strengthenedAcceptanceBatchRun({ id: 612, createdAt: '2026-06-09T00:00:00.000Z', chapterNos: [41, 42, 43] }),
        strengthenedAcceptanceBatchRun({ id: 613, createdAt: '2026-06-10T00:00:00.000Z', chapterNos: [44, 45, 46] }),
        strengthenedAcceptanceBatchRun({ id: 614, createdAt: '2026-06-11T00:00:00.000Z', chapterNos: [47, 48, 49] }),
        expansionStructureValidationBatchRun({
          id: 615,
          createdAt: '2026-06-14T00:00:00.000Z',
          chapterNos: validationChapterNos,
          source: 'safe_batch_recovery_validation_batch',
        }),
      ],
    } as any)

    const policy = model.batchGuardrail.preflight.inputSnapshot.safe_batch_expansion_policy
    const roadmap = policy.safe_batch_recovery_roadmap

    expect(model.batchReviewQueue).toMatchObject({
      visible: true,
      status: 'done',
      total: 3,
      success: 3,
      delivered: 3,
      safeLimit: 3,
      createdAt: '2026-06-14T00:00:00.000Z',
    })
    expect(model.batchReviewQueue.handoff.status).toBe('continue_batch')
    expect(model.batchReviewQueue.handoff.evidence).toEqual(expect.arrayContaining([
      expect.stringContaining('扩批结构验证批通过'),
    ]))
    expect(policy).toMatchObject({
      status: 'expanded',
      target_chapter_count: 5,
      expansion_feedback: {
        status: 'recovered',
        target_chapter_count: 5,
        expansion_structure_validation_result: {
          status: 'ok',
          validation_chapter_nos: validationChapterNos,
          risk_count: 0,
        },
      },
    })
    expect(roadmap).toMatchObject({
      current_lane: 'expanded_batch',
      current_target_chapter_count: 5,
      current_status: 'expanded',
      current_reason: expect.stringContaining('恢复 5 章'),
    })
    expect(model.batchGuardrail.safeChapterCount).toBe(5)
    expect(model.batchGuardrail.recommendedAction.key).toBe('start_safe_batch_generation')
    expect(model.batchGuardrail.recommendedAction.label).toBe('确认恢复5章扩批')
    expect(model.batchGuardrail.recommendedAction.description).toContain('第50、51、52章')
    expect(model.batchGuardrail.recommendedAction.payload).toMatchObject({
      source: 'safe_batch_recovery_restore_five_batch',
      safety_limit: 5,
      recovery_restore_confirmation: {
        status: 'ready',
        label: '确认恢复5章扩批',
        validation_chapter_nos: validationChapterNos,
        target_chapter_count: 5,
      },
      batch_preflight: {
        safe_batch_recovery_restore_confirmation: {
          status: 'ready',
          validation_chapter_nos: validationChapterNos,
          target_chapter_count: 5,
        },
      },
    })
    expect(model.productionLicense.modeLabel).toBe('恢复5章扩批')
    expect(model.productionLicense.summary).toContain('第50、51、52章')
  })

  test('records stability evidence after the restored five-chapter batch passes', () => {
    const validationChapterNos = [50, 51, 52]
    const restoreChapterNos = [53, 54, 55, 56, 57]
    const model = buildAutoCreationDirectorModel({
      planning: readySafeBatchPlanning({ futureRoute: futureRouteRange(58, 5) }),
      writing: readySafeBatchWriting({
        nextChapter: { ...baseWriting.nextChapter, id: 58, chapterNo: 58, title: '恢复扩批后58' },
        previousChapter: { chapterNo: 57, title: '恢复扩批57', wordCount: 3180, hasProse: true },
      }),
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 57 },
      chapters: [...[41, 42, 43, 44, 45, 46, 47, 48, 49], ...validationChapterNos, ...restoreChapterNos].map(chapterNo => ({
        id: chapterNo,
        chapter_no: chapterNo,
        title: `恢复稳定${chapterNo}`,
        chapter_text: '恢复稳定正文'.repeat(500),
      })),
      reviews: [
        ...strengthenedAcceptanceQualityReviews([41, 42, 43], 5161, '2026-06-09T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([44, 45, 46], 5171, '2026-06-10T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([47, 48, 49], 5181, '2026-06-11T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews(validationChapterNos, 5191, '2026-06-14T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews(restoreChapterNos, 5201, '2026-06-15T01:00:00.000Z'),
      ],
      runRecords: [
        strengthenedAcceptanceBatchRun({ id: 616, createdAt: '2026-06-09T00:00:00.000Z', chapterNos: [41, 42, 43] }),
        strengthenedAcceptanceBatchRun({ id: 617, createdAt: '2026-06-10T00:00:00.000Z', chapterNos: [44, 45, 46] }),
        strengthenedAcceptanceBatchRun({ id: 618, createdAt: '2026-06-11T00:00:00.000Z', chapterNos: [47, 48, 49] }),
        expansionStructureValidationBatchRun({
          id: 619,
          createdAt: '2026-06-14T00:00:00.000Z',
          chapterNos: validationChapterNos,
          source: 'safe_batch_recovery_validation_batch',
        }),
        restoredFiveChapterBatchRun({
          id: 620,
          createdAt: '2026-06-15T00:00:00.000Z',
          chapterNos: restoreChapterNos,
          validationChapterNos,
        }),
      ],
    } as any)

    const feedback = model.batchGuardrail.preflight.inputSnapshot.safe_batch_expansion_policy.expansion_feedback

    expect(feedback).toMatchObject({
      status: 'passed',
      target_chapter_count: 5,
      latest_chapter_nos: restoreChapterNos,
      stable_pass_streak: 1,
      recent_expanded_batch_count: 1,
      recovery_restore_stability_evidence: {
        status: 'passed',
        source: 'safe_batch_recovery_restore_five_batch',
        restore_chapter_nos: restoreChapterNos,
        validation_chapter_nos: validationChapterNos,
        stable_pass_streak: 1,
      },
    })
    expect(feedback.summary).toContain('恢复5章扩批稳定观察')
    expect(feedback.summary).toContain('第50、51、52章')
  })

  test('keeps the first restored five-chapter pass as an observation batch before defaulting', () => {
    const validationChapterNos = [50, 51, 52]
    const restoreChapterNos = [53, 54, 55, 56, 57]
    const model = buildAutoCreationDirectorModel({
      planning: readySafeBatchPlanning({ futureRoute: futureRouteRange(58, 5) }),
      writing: readySafeBatchWriting({
        nextChapter: { ...baseWriting.nextChapter, id: 58, chapterNo: 58, title: '恢复观察后58' },
        previousChapter: { chapterNo: 57, title: '恢复观察57', wordCount: 3180, hasProse: true },
      }),
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 57 },
      chapters: [...[41, 42, 43, 44, 45, 46, 47, 48, 49], ...validationChapterNos, ...restoreChapterNos].map(chapterNo => ({
        id: chapterNo,
        chapter_no: chapterNo,
        title: `恢复观察${chapterNo}`,
        chapter_text: '恢复观察正文'.repeat(500),
      })),
      reviews: [
        ...strengthenedAcceptanceQualityReviews([41, 42, 43], 5301, '2026-06-09T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([44, 45, 46], 5311, '2026-06-10T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([47, 48, 49], 5321, '2026-06-11T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews(validationChapterNos, 5331, '2026-06-14T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews(restoreChapterNos, 5341, '2026-06-15T01:00:00.000Z'),
      ],
      runRecords: [
        strengthenedAcceptanceBatchRun({ id: 640, createdAt: '2026-06-09T00:00:00.000Z', chapterNos: [41, 42, 43] }),
        strengthenedAcceptanceBatchRun({ id: 641, createdAt: '2026-06-10T00:00:00.000Z', chapterNos: [44, 45, 46] }),
        strengthenedAcceptanceBatchRun({ id: 642, createdAt: '2026-06-11T00:00:00.000Z', chapterNos: [47, 48, 49] }),
        expansionStructureValidationBatchRun({
          id: 643,
          createdAt: '2026-06-14T00:00:00.000Z',
          chapterNos: validationChapterNos,
          source: 'safe_batch_recovery_validation_batch',
        }),
        restoredFiveChapterBatchRun({
          id: 644,
          createdAt: '2026-06-15T00:00:00.000Z',
          chapterNos: restoreChapterNos,
          validationChapterNos,
        }),
      ],
    } as any)

    expect(model.batchGuardrail.safeChapterCount).toBe(5)
    expect(model.batchGuardrail.recommendedAction.label).toBe('继续5章观察批')
    expect(model.batchGuardrail.recommendedAction.payload).toMatchObject({
      source: 'safe_batch_recovery_restore_five_batch',
      safety_limit: 5,
      recovery_restore_stability_evidence: {
        status: 'observing',
        stable_pass_streak: 1,
        default_five_chapter_ready: false,
      },
    })
    expect(model.productionLicense.modeLabel).toBe('5章观察批')
    expect(model.productionLicense.summary).toContain('继续观察')
  })

  test('uses restored stability evidence to default back to five chapters after two stable passes', () => {
    const validationChapterNos = [50, 51, 52]
    const firstRestoreChapterNos = [53, 54, 55, 56, 57]
    const secondRestoreChapterNos = [58, 59, 60, 61, 62]
    const model = buildAutoCreationDirectorModel({
      planning: readySafeBatchPlanning({ futureRoute: futureRouteRange(63, 5) }),
      writing: readySafeBatchWriting({
        nextChapter: { ...baseWriting.nextChapter, id: 63, chapterNo: 63, title: '默认档后63' },
        previousChapter: { chapterNo: 62, title: '默认档62', wordCount: 3180, hasProse: true },
      }),
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 62 },
      chapters: [...[41, 42, 43, 44, 45, 46, 47, 48, 49], ...validationChapterNos, ...firstRestoreChapterNos, ...secondRestoreChapterNos].map(chapterNo => ({
        id: chapterNo,
        chapter_no: chapterNo,
        title: `默认档${chapterNo}`,
        chapter_text: '默认档正文'.repeat(500),
      })),
      reviews: [
        ...strengthenedAcceptanceQualityReviews([41, 42, 43], 5351, '2026-06-09T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([44, 45, 46], 5361, '2026-06-10T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([47, 48, 49], 5371, '2026-06-11T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews(validationChapterNos, 5381, '2026-06-14T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews(firstRestoreChapterNos, 5391, '2026-06-15T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews(secondRestoreChapterNos, 5401, '2026-06-16T01:00:00.000Z'),
      ],
      runRecords: [
        strengthenedAcceptanceBatchRun({ id: 645, createdAt: '2026-06-09T00:00:00.000Z', chapterNos: [41, 42, 43] }),
        strengthenedAcceptanceBatchRun({ id: 646, createdAt: '2026-06-10T00:00:00.000Z', chapterNos: [44, 45, 46] }),
        strengthenedAcceptanceBatchRun({ id: 647, createdAt: '2026-06-11T00:00:00.000Z', chapterNos: [47, 48, 49] }),
        expansionStructureValidationBatchRun({
          id: 648,
          createdAt: '2026-06-14T00:00:00.000Z',
          chapterNos: validationChapterNos,
          source: 'safe_batch_recovery_validation_batch',
        }),
        restoredFiveChapterBatchRun({
          id: 649,
          createdAt: '2026-06-15T00:00:00.000Z',
          chapterNos: firstRestoreChapterNos,
          validationChapterNos,
        }),
        restoredFiveChapterBatchRun({
          id: 650,
          createdAt: '2026-06-16T00:00:00.000Z',
          chapterNos: secondRestoreChapterNos,
          validationChapterNos,
        }),
      ],
    } as any)

    const feedback = model.batchGuardrail.preflight.inputSnapshot.safe_batch_expansion_policy.expansion_feedback

    expect(feedback.recovery_restore_stability_evidence).toMatchObject({
      status: 'passed',
      stable_pass_streak: 2,
      restore_chapter_nos: secondRestoreChapterNos,
      validation_chapter_nos: validationChapterNos,
    })
    expect(model.batchGuardrail.safeChapterCount).toBe(5)
    expect(model.batchGuardrail.recommendedAction.label).toBe('启动默认5章档位')
    expect(model.batchGuardrail.recommendedAction.payload).toMatchObject({
      source: 'auto_creation_safe_batch',
      safety_limit: 5,
      default_five_chapter_lane: {
        status: 'ready',
        stable_pass_streak: 2,
        default_five_chapter_ready: true,
      },
    })
    expect(model.productionLicense.modeLabel).toBe('默认5章档位')
    expect(model.productionLicense.reasons).toEqual(expect.arrayContaining([
      expect.stringContaining('恢复5章扩批连续 2 批稳定'),
    ]))
  })

  test('routes restored five-chapter same-segment relapse back to structure repair', () => {
    const validationChapterNos = [50, 51, 52]
    const restoreChapterNos = [53, 54, 55, 56, 57]
    const model = buildAutoCreationDirectorModel({
      planning: readySafeBatchPlanning({ futureRoute: futureRouteRange(58, 5) }),
      writing: readySafeBatchWriting({
        nextChapter: { ...baseWriting.nextChapter, id: 58, chapterNo: 58, title: '恢复复发后58' },
        previousChapter: { chapterNo: 57, title: '恢复复发57', wordCount: 3180, hasProse: true },
      }),
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 57 },
      chapters: [...[41, 42, 43, 44, 45, 46, 47, 48, 49], ...validationChapterNos, ...restoreChapterNos].map(chapterNo => ({
        id: chapterNo,
        chapter_no: chapterNo,
        title: `恢复复发${chapterNo}`,
        chapter_text: '恢复复发正文'.repeat(500),
      })),
      reviews: [
        ...strengthenedAcceptanceQualityReviews([41, 42, 43], 5211, '2026-06-09T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([44, 45, 46], 5221, '2026-06-10T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([47, 48, 49], 5231, '2026-06-11T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews(validationChapterNos, 5241, '2026-06-14T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews(restoreChapterNos, 5251, '2026-06-15T01:00:00.000Z'),
        {
          id: 5261,
          chapter_id: 55,
          review_type: 'chapter_core_drift',
          created_at: '2026-06-15T01:10:00.000Z',
          payload: JSON.stringify({ chapter_core_drift: { status: 'warn', drift_risks: ['恢复5章后中段再次偏离阵盘主线承诺'] } }),
        },
        {
          id: 5262,
          chapter_id: 56,
          review_type: 'reader_payoff_sync',
          created_at: '2026-06-15T01:11:00.000Z',
          payload: JSON.stringify({ reader_payoff_sync: { status: 'warn', debt_count: 1, missed: ['恢复5章后中段显性回报再次缺失'] } }),
        },
        {
          id: 5263,
          chapter_id: 56,
          review_type: 'reader_retention_sync',
          created_at: '2026-06-15T01:12:00.000Z',
          payload: JSON.stringify({ reader_retention_sync: { status: 'warn', missed_count: 1, missed: ['恢复5章后中段章末追读再次重复'] } }),
        },
      ],
      runRecords: [
        strengthenedAcceptanceBatchRun({ id: 625, createdAt: '2026-06-09T00:00:00.000Z', chapterNos: [41, 42, 43] }),
        strengthenedAcceptanceBatchRun({ id: 626, createdAt: '2026-06-10T00:00:00.000Z', chapterNos: [44, 45, 46] }),
        strengthenedAcceptanceBatchRun({ id: 627, createdAt: '2026-06-11T00:00:00.000Z', chapterNos: [47, 48, 49] }),
        expansionStructureValidationBatchRun({
          id: 628,
          createdAt: '2026-06-14T00:00:00.000Z',
          chapterNos: validationChapterNos,
          source: 'safe_batch_recovery_validation_batch',
        }),
        restoredFiveChapterBatchRun({
          id: 629,
          createdAt: '2026-06-15T00:00:00.000Z',
          chapterNos: restoreChapterNos,
          validationChapterNos,
        }),
      ],
    } as any)

    const policy = model.batchGuardrail.preflight.inputSnapshot.safe_batch_expansion_policy
    const structureTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'safe_batch_expansion_structure_repair')
    const roadmap = policy.safe_batch_recovery_roadmap

    expect(policy).toMatchObject({
      status: 'recovering',
      target_chapter_count: 3,
      expansion_feedback: {
        status: 'rollback_to_small_batch',
        repeated_hotspot_segment: {
          key: 'middle',
          label: '中段',
          source: 'safe_batch_recovery_restore_five_batch',
        },
      },
    })
    expect(policy.expansion_feedback.summary).toContain('恢复5章后中段再次复发')
    expect(roadmap.next_repair_layer.focus).toMatchObject({
      issue_type: 'safe_batch_expansion_structure_repair',
      task_center_filter_label: '扩批结构',
    })
    expect(structureTask).toMatchObject({
      issue_type: 'safe_batch_expansion_structure_repair',
      safe_batch_expansion_structure_review: {
        repeated_hotspot_segment: {
          key: 'middle',
          label: '中段',
          source: 'safe_batch_recovery_restore_five_batch',
        },
      },
    })
  })

  test('keeps small-batch recovery when the structure validation batch fails', () => {
    const model = buildAutoCreationDirectorModel({
      planning: readySafeBatchPlanning({ futureRoute: futureRouteRange(53, 5) }),
      writing: readySafeBatchWriting({
        nextChapter: { ...baseWriting.nextChapter, id: 53, chapterNo: 53, title: '结构验证后53' },
        previousChapter: { chapterNo: 52, title: '结构验证52', wordCount: 3180, hasProse: true },
      }),
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 52 },
      chapters: [41, 42, 43, 44, 45, 46, 47, 48, 49, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 50, 51, 52].map(chapterNo => ({
        id: chapterNo,
        chapter_no: chapterNo,
        title: `结构验证${chapterNo}`,
        chapter_text: '结构验证正文'.repeat(500),
      })),
      reviews: [
        ...strengthenedAcceptanceQualityReviews([41, 42, 43], 5051, '2026-06-09T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([44, 45, 46], 5061, '2026-06-10T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([47, 48, 49], 5071, '2026-06-11T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([8, 9, 10, 11, 12], 5081, '2026-06-12T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([13, 14, 15, 16, 17], 5091, '2026-06-13T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([50, 51, 52], 5101, '2026-06-14T01:00:00.000Z'),
        {
          id: 5111,
          chapter_id: 10,
          review_type: 'chapter_core_drift',
          created_at: '2026-06-12T01:10:00.000Z',
          payload: JSON.stringify({ chapter_core_drift: { status: 'warn', drift_risks: ['中段第一次偏离阵盘主线承诺'] } }),
        },
        {
          id: 5112,
          chapter_id: 11,
          review_type: 'reader_payoff_sync',
          created_at: '2026-06-12T01:11:00.000Z',
          payload: JSON.stringify({ reader_payoff_sync: { status: 'warn', debt_count: 1, missed: ['第一次中段回报没有显性兑现'] } }),
        },
        {
          id: 5113,
          chapter_id: 15,
          review_type: 'chapter_core_drift',
          created_at: '2026-06-13T01:10:00.000Z',
          payload: JSON.stringify({ chapter_core_drift: { status: 'warn', drift_risks: ['中段第二次偏离阵盘主线承诺'] } }),
        },
        {
          id: 5114,
          chapter_id: 16,
          review_type: 'reader_payoff_sync',
          created_at: '2026-06-13T01:11:00.000Z',
          payload: JSON.stringify({ reader_payoff_sync: { status: 'warn', debt_count: 1, missed: ['第二次中段回报没有显性兑现'] } }),
        },
        {
          id: 5115,
          chapter_id: 16,
          review_type: 'reader_retention_sync',
          created_at: '2026-06-13T01:12:00.000Z',
          payload: JSON.stringify({ reader_retention_sync: { status: 'warn', missed_count: 1, missed: ['第二次中段章末没有留下下一章必看问题'] } }),
        },
        {
          id: 5116,
          chapter_id: 10,
          review_type: 'prose_quality',
          created_at: '2026-06-13T02:28:00.000Z',
          payload: JSON.stringify({ score: 88, passed: true }),
        },
        {
          id: 5117,
          chapter_id: 11,
          review_type: 'prose_quality',
          created_at: '2026-06-13T02:29:00.000Z',
          payload: JSON.stringify({ score: 89, passed: true }),
        },
        {
          id: 5118,
          chapter_id: 15,
          review_type: 'prose_quality',
          created_at: '2026-06-13T02:30:00.000Z',
          payload: JSON.stringify({ score: 89, passed: true }),
        },
        {
          id: 5119,
          chapter_id: 16,
          review_type: 'prose_quality',
          created_at: '2026-06-13T02:31:00.000Z',
          payload: JSON.stringify({ score: 90, passed: true }),
        },
        {
          id: 5121,
          chapter_id: 51,
          review_type: 'chapter_core_drift',
          created_at: '2026-06-14T01:10:00.000Z',
          payload: JSON.stringify({ chapter_core_drift: { status: 'warn', drift_risks: ['验证批中段仍偏离阵盘主线承诺'] } }),
        },
        {
          id: 5122,
          chapter_id: 52,
          review_type: 'reader_payoff_sync',
          created_at: '2026-06-14T01:11:00.000Z',
          payload: JSON.stringify({ reader_payoff_sync: { status: 'warn', debt_count: 1, missed: ['验证批回报仍没有显性兑现'] } }),
        },
        {
          id: 5123,
          chapter_id: 52,
          review_type: 'reader_retention_sync',
          created_at: '2026-06-14T01:12:00.000Z',
          payload: JSON.stringify({ reader_retention_sync: { status: 'warn', missed_count: 1, missed: ['验证批章末追读问题仍重复'] } }),
        },
      ],
      runRecords: [
        strengthenedAcceptanceBatchRun({ id: 602, createdAt: '2026-06-09T00:00:00.000Z', chapterNos: [41, 42, 43] }),
        strengthenedAcceptanceBatchRun({ id: 603, createdAt: '2026-06-10T00:00:00.000Z', chapterNos: [44, 45, 46] }),
        strengthenedAcceptanceBatchRun({ id: 604, createdAt: '2026-06-11T00:00:00.000Z', chapterNos: [47, 48, 49] }),
        expandedSafeBatchRun({ id: 605, createdAt: '2026-06-12T00:00:00.000Z', chapterNos: [8, 9, 10, 11, 12] }),
        expandedSafeBatchRun({ id: 606, createdAt: '2026-06-13T00:00:00.000Z', chapterNos: [13, 14, 15, 16, 17] }),
        {
          id: 607,
          run_type: 'longform_production_repair',
          created_at: '2026-06-13T02:00:00.000Z',
          completed_at: '2026-06-13T02:20:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({ source: 'auto_creation_safe_batch_risk' }),
          output_ref: JSON.stringify({
            tasks: [{
              issue_type: 'safe_batch_expansion_structure_repair',
              task_status: 'resolved',
              chapter_no: 15,
              safe_batch_expansion_structure_review: {
                repeated_hotspot_segment: { key: 'middle', label: '中段', count: 2 },
                latest_chapter_nos: [13, 14, 15, 16, 17],
                affected_chapter_nos: [15, 16],
                structure_actions: ['重写中段固定职责：每批第3-4章必须完成主线转折、显性回报和章末追读。'],
              },
            },
            { issue_type: 'core_drift', task_status: 'resolved', chapter_no: 10, resolved_at: '2026-06-13T02:12:00.000Z' },
            { issue_type: 'reader_payoff_debt', task_status: 'resolved', chapter_no: 11, resolved_at: '2026-06-13T02:13:00.000Z' },
            { issue_type: 'reader_pull_missed', task_status: 'resolved', chapter_no: 11, resolved_at: '2026-06-13T02:14:00.000Z' },
            { issue_type: 'core_drift', task_status: 'resolved', chapter_no: 15, resolved_at: '2026-06-13T02:12:00.000Z' },
            { issue_type: 'reader_payoff_debt', task_status: 'resolved', chapter_no: 16, resolved_at: '2026-06-13T02:13:00.000Z' },
            { issue_type: 'reader_pull_missed', task_status: 'resolved', chapter_no: 16, resolved_at: '2026-06-13T02:14:00.000Z' }],
          }),
        },
        expansionStructureValidationBatchRun({ id: 608, createdAt: '2026-06-14T00:00:00.000Z', chapterNos: [50, 51, 52] }),
      ],
    } as any)

    const policy = model.batchGuardrail.preflight.inputSnapshot.safe_batch_expansion_policy
    const structureSignal = model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'batch_expansion_structure' as any)
    const structureTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'safe_batch_expansion_structure_repair')

    expect(model.batchGuardrail.safeChapterCount).toBe(0)
    expect(policy).toMatchObject({
      status: 'recovering',
      target_chapter_count: 3,
      expansion_feedback: {
        status: 'rollback_to_small_batch',
        expansion_structure_validation_result: {
          status: 'warn',
          validation_chapter_nos: [50, 51, 52],
          risk_count: 3,
        },
      },
    })
    expect(structureSignal).toMatchObject({
      status: 'warn',
      detail: expect.stringContaining('结构验证批未通过'),
    })
    expect(structureTask).toMatchObject({
      issue_type: 'safe_batch_expansion_structure_repair',
      safe_batch_expansion_structure_review: {
        repeated_hotspot_segment: { key: 'middle', label: '中段', count: 2 },
        validation_result: {
          risk_count: 3,
          failed_chapter_nos: [51, 52],
        },
        expansion_structure_validation_trend: {
          visible: true,
          status: 'warn',
          segment_key: 'middle',
          segment_label: '中段',
          validation_batch_count: 1,
          passed_batch_count: 0,
          failed_batch_count: 1,
          pass_rate: 0,
          latest_status: 'warn',
        },
      },
    })
  })

  test('summarizes expansion structure validation trend by repeated segment', () => {
    const chapterNos = [50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63]
    const model = buildAutoCreationDirectorModel({
      planning: readySafeBatchPlanning({ futureRoute: futureRouteRange(64, 5) }),
      writing: readySafeBatchWriting({
        nextChapter: { ...baseWriting.nextChapter, id: 64, chapterNo: 64, title: '结构趋势64' },
        previousChapter: { chapterNo: 63, title: '结构趋势63', wordCount: 3180, hasProse: true },
      }),
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 63 },
      chapters: chapterNos.map(chapterNo => ({
        id: chapterNo,
        chapter_no: chapterNo,
        title: `结构趋势${chapterNo}`,
        chapter_text: '结构趋势正文'.repeat(500),
      })),
      reviews: [
        ...strengthenedAcceptanceQualityReviews([50, 51, 52], 6201, '2026-06-14T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([53, 54, 55], 6211, '2026-06-15T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([56, 57, 58], 6221, '2026-06-16T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([59, 60, 61, 62, 63], 6231, '2026-06-17T01:00:00.000Z'),
        {
          id: 6241,
          chapter_id: 54,
          review_type: 'chapter_core_drift',
          created_at: '2026-06-15T01:10:00.000Z',
          payload: JSON.stringify({ chapter_core_drift: { status: 'warn', drift_risks: ['第二次验证批中段仍偏离主线承诺'] } }),
        },
        {
          id: 6242,
          chapter_id: 55,
          review_type: 'reader_payoff_sync',
          created_at: '2026-06-15T01:11:00.000Z',
          payload: JSON.stringify({ reader_payoff_sync: { status: 'warn', debt_count: 1, missed: ['第二次验证批中段没有显性兑现'] } }),
        },
        {
          id: 6243,
          chapter_id: 55,
          review_type: 'reader_retention_sync',
          created_at: '2026-06-15T01:12:00.000Z',
          payload: JSON.stringify({ reader_retention_sync: { status: 'warn', missed_count: 1, missed: ['第二次验证批章末追读问题重复'] } }),
        },
        {
          id: 6244,
          chapter_id: 61,
          review_type: 'chapter_core_drift',
          created_at: '2026-06-17T01:10:00.000Z',
          payload: JSON.stringify({ chapter_core_drift: { status: 'warn', drift_risks: ['恢复5章后中段再次偏离主线承诺'] } }),
        },
      ],
      runRecords: [
        expansionStructureValidationBatchRun({ id: 621, createdAt: '2026-06-14T00:00:00.000Z', chapterNos: [50, 51, 52] }),
        expansionStructureValidationBatchRun({ id: 622, createdAt: '2026-06-15T00:00:00.000Z', chapterNos: [53, 54, 55] }),
        expansionStructureValidationBatchRun({ id: 623, createdAt: '2026-06-16T00:00:00.000Z', chapterNos: [56, 57, 58] }),
        expandedSafeBatchRun({ id: 624, createdAt: '2026-06-17T00:00:00.000Z', chapterNos: [59, 60, 61, 62, 63] }),
      ],
    } as any)

    const policy = model.batchGuardrail.preflight.inputSnapshot.safe_batch_expansion_policy
    const trend = policy.expansion_feedback.expansion_structure_validation_trend

    expect(trend).toMatchObject({
      visible: true,
      status: 'warn',
      label: '扩批结构验证趋势',
      segment_key: 'middle',
      segment_label: '中段',
      validation_batch_count: 3,
      passed_batch_count: 2,
      failed_batch_count: 1,
      pass_rate: 67,
      latest_status: 'ok',
      latest_chapter_nos: [56, 57, 58],
      recurrence_after_restore: {
        visible: true,
        interval_batch_count: 1,
        interval_label: '恢复5章后第1个扩批批次复发',
        recurrence_chapter_nos: [59, 60, 61, 62, 63],
        repeated_hotspot_segment: { key: 'middle', label: '中段' },
      },
    })
    expect(trend.failure_reasons).toEqual([
      { key: 'core', label: '核心偏移', count: 1 },
      { key: 'payoff', label: '回报欠账', count: 1 },
      { key: 'reader_pull', label: '追读拉力', count: 1 },
    ])
    expect(trend.summary).toContain('中段验证通过率 67%')
    expect(trend.summary).toContain('恢复5章后第1个扩批批次复发')
  })

  test('summarizes structure repair effectiveness after trend-driven repair improves validation', () => {
    const chapterNos = [41, 42, 43, 44, 45, 46, 47, 48, 49, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74]
    const model = buildAutoCreationDirectorModel({
      planning: readySafeBatchPlanning({ futureRoute: futureRouteRange(75, 5) }),
      writing: readySafeBatchWriting({
        nextChapter: { ...baseWriting.nextChapter, id: 75, chapterNo: 75, title: '结构有效性75' },
        previousChapter: { chapterNo: 74, title: '结构有效性74', wordCount: 3200, hasProse: true },
      }),
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 74 },
      chapters: chapterNos.map(chapterNo => ({
        id: chapterNo,
        chapter_no: chapterNo,
        title: `结构有效性${chapterNo}`,
        chapter_text: '结构有效性正文'.repeat(500),
      })),
      reviews: [
        ...strengthenedAcceptanceQualityReviews([41, 42, 43], 6241, '2026-06-13T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([44, 45, 46], 6244, '2026-06-14T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([47, 48, 49], 6247, '2026-06-15T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([64, 65, 66], 6251, '2026-06-17T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([67, 68, 69], 6261, '2026-06-18T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([70, 71, 72, 73, 74], 6271, '2026-06-19T01:00:00.000Z'),
      ],
      runRecords: [
        strengthenedAcceptanceBatchRun({ id: 622, createdAt: '2026-06-13T00:00:00.000Z', chapterNos: [41, 42, 43] }),
        strengthenedAcceptanceBatchRun({ id: 623, createdAt: '2026-06-14T00:00:00.000Z', chapterNos: [44, 45, 46] }),
        strengthenedAcceptanceBatchRun({ id: 624, createdAt: '2026-06-15T00:00:00.000Z', chapterNos: [47, 48, 49] }),
        {
          id: 625,
          run_type: 'longform_production_repair',
          created_at: '2026-06-16T12:00:00.000Z',
          completed_at: '2026-06-16T12:30:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({ source: 'auto_creation_safe_batch_risk' }),
          output_ref: JSON.stringify({
            tasks: [{
              issue_type: 'safe_batch_expansion_structure_repair',
              task_status: 'resolved',
              chapter_no: 61,
              safe_batch_expansion_structure_review: {
                repeated_hotspot_segment: { key: 'middle', label: '中段', count: 3 },
                latest_chapter_nos: [59, 60, 61, 62, 63],
                affected_chapter_nos: [61],
                expansion_structure_validation_trend: {
                  visible: true,
                  status: 'warn',
                  label: '扩批结构验证趋势',
                  summary: '中段验证通过率 67%（2/3批），失败主因：核心偏移1、回报欠账1、追读拉力1，恢复5章后第1个扩批批次复发。',
                  segment_key: 'middle',
                  segment_label: '中段',
                  validation_batch_count: 3,
                  passed_batch_count: 2,
                  failed_batch_count: 1,
                  pass_rate: 67,
                  latest_status: 'ok',
                  latest_chapter_nos: [56, 57, 58],
                  failure_reasons: [
                    { key: 'core', label: '核心偏移', count: 1 },
                    { key: 'payoff', label: '回报欠账', count: 1 },
                    { key: 'reader_pull', label: '追读拉力', count: 1 },
                  ],
                  recurrence_after_restore: {
                    visible: true,
                    interval_batch_count: 1,
                    interval_label: '恢复5章后第1个扩批批次复发',
                    recurrence_chapter_nos: [59, 60, 61, 62, 63],
                  },
                },
              },
            }],
          }),
        },
        expansionStructureValidationBatchRun({ id: 626, createdAt: '2026-06-17T00:00:00.000Z', chapterNos: [64, 65, 66] }),
        expansionStructureValidationBatchRun({ id: 627, createdAt: '2026-06-18T00:00:00.000Z', chapterNos: [67, 68, 69] }),
        expandedSafeBatchRun({ id: 628, createdAt: '2026-06-19T00:00:00.000Z', chapterNos: [70, 71, 72, 73, 74] }),
      ],
    } as any)

    const policy = model.batchGuardrail.preflight.inputSnapshot.safe_batch_expansion_policy
    const effectiveness = policy.expansion_feedback.expansion_structure_repair_effectiveness
    const nextBatchBrief = model.batchGuardrail.nextBatchBrief

    expect(effectiveness).toMatchObject({
      visible: true,
      status: 'ok',
      label: '结构修复有效性',
      source_run_id: 625,
      segment_key: 'middle',
      segment_label: '中段',
      baseline_pass_rate: 67,
      current_pass_rate: 100,
      pass_rate_delta: 33,
      baseline_failure_reason_count: 3,
      current_failure_reason_count: 0,
      failure_reason_delta: -3,
      baseline_recurrence_interval_batch_count: 1,
      current_recurrence_interval_batch_count: 0,
      recommendation: 'restore_five_chapter',
    })
    expect(effectiveness.summary).toContain('通过率 67% -> 100%')
    expect(effectiveness.summary).toContain('失败主因 3 -> 0')
    expect(effectiveness.summary).toContain('暂无同段复发')
    expect(nextBatchBrief.expansionStructureDecision).toMatchObject({
      visible: true,
      label: '结构修复决策',
      recommendation: 'restore_five_chapter',
      targetChapterCount: 5,
      segmentLabel: '中段',
    })
    expect(nextBatchBrief.expansionStructureDecision.instruction).toContain('恢复 5 章')
    expect(nextBatchBrief.expansionStructureDecision.observationMetrics).toEqual(expect.arrayContaining([
      expect.stringContaining('通过率 67% -> 100%'),
      expect.stringContaining('失败主因 3 -> 0'),
    ]))
    expect(nextBatchBrief.startChecklist).toContainEqual(expect.objectContaining({
      key: 'expansion_structure',
      label: '结构修复决策',
      detail: expect.stringContaining('恢复 5 章'),
    }))
  })

  test('keeps small validation when structure repair effectiveness is improved but inconclusive', () => {
    const chapterNos = [41, 42, 43, 44, 45, 46, 47, 48, 49, 64, 65, 66, 67, 68, 69]
    const model = buildAutoCreationDirectorModel({
      planning: readySafeBatchPlanning({ futureRoute: futureRouteRange(70, 5) }),
      writing: readySafeBatchWriting({
        nextChapter: { ...baseWriting.nextChapter, id: 70, chapterNo: 70, title: '结构观察70' },
        previousChapter: { chapterNo: 69, title: '结构观察69', wordCount: 3200, hasProse: true },
      }),
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 69 },
      chapters: chapterNos.map(chapterNo => ({
        id: chapterNo,
        chapter_no: chapterNo,
        title: `结构观察${chapterNo}`,
        chapter_text: '结构观察正文'.repeat(500),
      })),
      reviews: [
        ...strengthenedAcceptanceQualityReviews([41, 42, 43], 6281, '2026-06-14T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([44, 45, 46], 6291, '2026-06-15T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([47, 48, 49], 6301, '2026-06-16T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([64, 65, 66], 6311, '2026-06-17T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([67, 68, 69], 6321, '2026-06-18T01:00:00.000Z'),
        {
          id: 6331,
          chapter_id: 65,
          review_type: 'chapter_core_drift',
          created_at: '2026-06-17T01:10:00.000Z',
          payload: JSON.stringify({ chapter_core_drift: { status: 'warn', drift_risks: ['第一轮验证批中段仍偏离阵盘主线承诺'] } }),
        },
        {
          id: 6332,
          chapter_id: 65,
          review_type: 'delivery_risk_convergence',
          created_at: '2026-06-17T01:20:00.000Z',
          payload: JSON.stringify({
            chapter_id: 65,
            chapter_no: 65,
            delivery_risk_convergence: { status: 'cleared', after_count: 0, label: '验证批风险已清零' },
          }),
        },
      ],
      runRecords: [
        strengthenedAcceptanceBatchRun({ id: 629, createdAt: '2026-06-14T00:00:00.000Z', chapterNos: [41, 42, 43] }),
        strengthenedAcceptanceBatchRun({ id: 630, createdAt: '2026-06-15T00:00:00.000Z', chapterNos: [44, 45, 46] }),
        strengthenedAcceptanceBatchRun({ id: 631, createdAt: '2026-06-16T00:00:00.000Z', chapterNos: [47, 48, 49] }),
        {
          id: 632,
          run_type: 'longform_production_repair',
          created_at: '2026-06-16T12:00:00.000Z',
          completed_at: '2026-06-16T12:30:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({ source: 'auto_creation_safe_batch_risk' }),
          output_ref: JSON.stringify({
            tasks: [{
              issue_type: 'safe_batch_expansion_structure_repair',
              task_status: 'resolved',
              chapter_no: 61,
              safe_batch_expansion_structure_review: {
                repeated_hotspot_segment: { key: 'middle', label: '中段', count: 3 },
                latest_chapter_nos: [59, 60, 61, 62, 63],
                affected_chapter_nos: [61],
                expansion_structure_validation_trend: {
                  visible: true,
                  status: 'warn',
                  label: '扩批结构验证趋势',
                  summary: '中段验证通过率 0%（0/2批），失败主因：核心偏移2、回报欠账1，恢复5章后第1个扩批批次复发。',
                  segment_key: 'middle',
                  segment_label: '中段',
                  validation_batch_count: 2,
                  passed_batch_count: 0,
                  failed_batch_count: 2,
                  pass_rate: 0,
                  latest_status: 'warn',
                  latest_chapter_nos: [56, 57, 58],
                  failure_reasons: [
                    { key: 'core', label: '核心偏移', count: 2 },
                    { key: 'payoff', label: '回报欠账', count: 1 },
                  ],
                  recurrence_after_restore: {
                    visible: true,
                    interval_batch_count: 1,
                    interval_label: '恢复5章后第1个扩批批次复发',
                    recurrence_chapter_nos: [59, 60, 61, 62, 63],
                  },
                },
              },
            }],
          }),
        },
        expansionStructureValidationBatchRun({ id: 633, createdAt: '2026-06-17T00:00:00.000Z', chapterNos: [64, 65, 66] }),
        expansionStructureValidationBatchRun({ id: 634, createdAt: '2026-06-18T00:00:00.000Z', chapterNos: [67, 68, 69] }),
      ],
    } as any)

    const policy = model.batchGuardrail.preflight.inputSnapshot.safe_batch_expansion_policy
    const effectiveness = policy.expansion_feedback.expansion_structure_repair_effectiveness
    const roadmap = policy.safe_batch_recovery_roadmap

    expect(effectiveness).toMatchObject({
      status: 'ok',
      recommendation: 'continue_small_validation',
      baseline_pass_rate: 0,
      current_pass_rate: 50,
      baseline_failure_reason_count: 3,
      current_failure_reason_count: 1,
    })
    expect(policy).toMatchObject({
      status: 'recovering',
      target_chapter_count: 3,
    })
    expect(policy.summary).toContain('结构修复有效性建议继续小批验证')
    expect(roadmap).toMatchObject({
      current_lane: 'small_batch',
      current_target_chapter_count: 3,
      current_status: 'recovering',
      next_repair_layer: {
        key: 'structure_decision_execution',
        status: 'pending',
      },
    })
    expect(roadmap.recommended_focus).toBeUndefined()
    expect(model.batchGuardrail.status).toBe('ready')
    expect(model.batchGuardrail.safeChapterCount).toBe(3)
    expect(model.batchGuardrail.recommendedAction).toMatchObject({
      key: 'start_safe_batch_generation',
      label: '启动3章验证批',
      payload: {
        source: 'safe_batch_recovery_validation_batch',
        safety_limit: 3,
      },
    })
    expect(model.batchGuardrail.recommendedAction.description).toContain('3章验证批')
    expect(model.productionLicense.status).toBe('batch_allowed')
    expect(model.productionLicense.modeLabel).toBe('3章验证批')
    expect(model.productionLicense.summary).toContain('验证批')
  })

})

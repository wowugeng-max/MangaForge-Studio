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

  test('feeds resolved default lane template redesign queue into the next validation batch brief', () => {
    const model = buildAutoCreationDirectorModel({
      planning: readySafeBatchPlanning({ futureRoute: futureRouteRange(96, 5) }),
      writing: readySafeBatchWriting({
        nextChapter: { ...baseWriting.nextChapter, id: 96, chapterNo: 96, title: '模板重构验证96' },
        previousChapter: { chapterNo: 95, title: '模板重构95', wordCount: 3200, hasProse: true },
      }),
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 95 },
      runRecords: [
        strengthenedAcceptanceBatchRun({ id: 660, createdAt: '2026-06-19T00:00:00.000Z', chapterNos: [41, 42, 43] }),
        strengthenedAcceptanceBatchRun({ id: 661, createdAt: '2026-06-20T00:00:00.000Z', chapterNos: [44, 45, 46] }),
        strengthenedAcceptanceBatchRun({ id: 662, createdAt: '2026-06-21T00:00:00.000Z', chapterNos: [47, 48, 49] }),
        {
          id: 663,
          run_type: 'longform_production_repair',
          created_at: '2026-06-24T02:00:00.000Z',
          completed_at: '2026-06-24T02:20:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({ source: 'auto_creation_safe_batch_risk' }),
          output_ref: JSON.stringify({
            tasks: [{
              issue_type: 'safe_batch_expansion_structure_repair',
              task_status: 'resolved',
              chapter_no: 94,
              safe_batch_expansion_structure_review: {
                repeated_hotspot_segment: { key: 'middle', label: '中段', count: 2 },
                latest_chapter_nos: [93, 94, 95],
                affected_chapter_nos: [94],
                default_five_chapter_lane_template_redesign_queue: {
                  visible: true,
                  status: 'resolved',
                  label: '默认档位模板重构队列',
                  source: 'default_five_chapter_lane_template_stability_profile',
                  summary: '默认档位模板已重构：回报密度失败 2 次已改为逐章显性结算。',
                  latest_chapter_nos: [93, 94, 95],
                  validation_batch_count: 2,
                  failed_batch_count: 2,
                  top_failed_requirement: {
                    key: 'default_lane_payoff_density',
                    label: '回报密度',
                    failed_count: 2,
                  },
                  redesigned_templates: [
                    {
                      key: 'default_lane_segment_duty',
                      label: '默认档位段位职责',
                      template: '新模板：第1章抛出规则压迫，第2章制造误导反转，第3章兑现阶段收益。',
                    },
                    {
                      key: 'default_lane_conflict_rotation',
                      label: '冲突轮换',
                      template: '新模板：规则压迫、人物对抗、信息误导按章轮换，不连续复用同一压力。',
                    },
                    {
                      key: 'default_lane_payoff_density',
                      label: '回报密度',
                      template: '新模板：每章必须有可见收益、反制结果或阶段结算，禁止连续两章只铺垫。',
                    },
                    {
                      key: 'default_lane_ending_hook_template',
                      label: '章末追读模板',
                      template: '新模板：最后300字必须落触发事件、读者问题和下一章风险。',
                    },
                  ],
                  validation_standard: [
                    '下一轮3章验证批必须逐章回填 default_lane_*_delivered。',
                    '连续2批模板全过后才能恢复默认5章档位。',
                  ],
                  required_receipts: [
                    'default_lane_segment_duty_delivered',
                    'default_lane_conflict_rotation_delivered',
                    'default_lane_payoff_density_delivered',
                    'default_lane_ending_hook_template_delivered',
                  ],
                },
                structure_actions: [
                  '升级默认档位模板重构：先重写四项模板，再做3章验证批。',
                ],
              },
            }],
          }),
        },
      ],
    } as any)

    const verification = model.batchGuardrail.nextBatchBrief.expansionStructureVerification
    const template = verification?.default_five_chapter_lane_template

    expect(model.batchGuardrail.safeChapterCount).toBe(3)
    expect(model.batchGuardrail.nextBatchBrief.chapterRangeLabel).toBe('第96-98章')
    expect(verification).toMatchObject({
      source: 'safe_batch_expansion_structure_repair',
      validation_chapter_nos: [96, 97, 98],
      repeated_hotspot_segment: { key: 'middle', label: '中段', count: 2 },
    })
    expect(template).toMatchObject({
      visible: true,
      status: 'fulfilled',
      source: 'safe_batch_expansion_structure_repair',
      redesign_source: 'default_five_chapter_lane_template_redesign_queue',
      source_run_id: 663,
      top_failed_requirement: {
        key: 'default_lane_payoff_density',
        label: '回报密度',
        failed_count: 2,
      },
      validation_standard: [
        '下一轮3章验证批必须逐章回填 default_lane_*_delivered。',
        '连续2批模板全过后才能恢复默认5章档位。',
      ],
      required_receipts: [
        'default_lane_segment_duty_delivered',
        'default_lane_conflict_rotation_delivered',
        'default_lane_payoff_density_delivered',
        'default_lane_ending_hook_template_delivered',
      ],
    })
    expect(template?.summary).toContain('回报密度失败 2 次')
    expect(template?.segment_duty_rewrite).toContain('第1章抛出规则压迫')
    expect(template?.conflict_rotation).toContain('按章轮换')
    expect(template?.payoff_density).toContain('每章必须有可见收益')
    expect(template?.ending_hook_template).toContain('最后300字')
    expect(template?.redesigned_templates).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'default_lane_payoff_density', template: expect.stringContaining('禁止连续两章只铺垫') }),
    ]))
    expect(template?.requirements).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'default_lane_payoff_density',
        status: 'fulfilled',
        verification_requirement: expect.stringContaining('default_lane_payoff_density_delivered'),
      }),
    ]))
    expect(model.batchGuardrail.preflight.inputSnapshot.safe_batch_expansion_structure_verification.default_five_chapter_lane_template).toMatchObject({
      redesign_source: 'default_five_chapter_lane_template_redesign_queue',
      required_receipts: expect.arrayContaining(['default_lane_payoff_density_delivered']),
    })
  })

  test('feeds production relapse template version proof into the next validation batch brief after repair', () => {
    const productionRelapseChapterNos = [109, 110, 111, 112, 113]
    const validationChapterNos = [114, 115, 116]
    const model = buildAutoCreationDirectorModel({
      planning: readySafeBatchPlanning({ futureRoute: futureRouteRange(114, 5) }),
      writing: readySafeBatchWriting({
        nextChapter: { ...baseWriting.nextChapter, id: 114, chapterNo: 114, title: '生产后验验证114' },
        previousChapter: { chapterNo: 113, title: '生产后验113', wordCount: 3200, hasProse: true },
      }),
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 113 },
      runRecords: [
        strengthenedAcceptanceBatchRun({ id: 681, createdAt: '2026-06-27T00:00:00.000Z', chapterNos: [90, 91, 92] }),
        strengthenedAcceptanceBatchRun({ id: 682, createdAt: '2026-06-28T00:00:00.000Z', chapterNos: [96, 97, 98] }),
        strengthenedAcceptanceBatchRun({ id: 683, createdAt: '2026-06-29T00:00:00.000Z', chapterNos: [104, 105, 106] }),
        {
          id: 684,
          run_type: 'longform_production_repair',
          created_at: '2026-06-30T02:00:00.000Z',
          completed_at: '2026-06-30T02:20:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({ source: 'auto_creation_safe_batch_risk' }),
          output_ref: JSON.stringify({
            tasks: [{
              issue_type: 'safe_batch_expansion_structure_repair',
              task_status: 'resolved',
              chapter_no: 112,
              safe_batch_expansion_structure_review: {
                repeated_hotspot_segment: { key: 'middle', label: '中段', count: 1 },
                latest_chapter_nos: productionRelapseChapterNos,
                affected_chapter_nos: [111, 112],
                default_five_chapter_lane_template_redesign_queue: {
                  visible: true,
                  status: 'resolved',
                  label: '默认档位模板生产复发队列',
                  source: 'default_five_chapter_lane_production_relapse',
                  recommendation: 'redesign_template_after_production_relapse',
                  summary: '默认档位模板版本 safe_batch_expansion_structure_repair:668 在真实5章生产复发，已按生产后验重构。',
                  template_version_id: 'safe_batch_expansion_structure_repair:668',
                  template_version: {
                    id: 'safe_batch_expansion_structure_repair:668',
                    status: 'relapsed',
                    pass_streak: 2,
                    required_pass_streak: 2,
                  },
                  production_relapse_count: 1,
                  production_relapse_review: {
                    template_version_id: 'safe_batch_expansion_structure_repair:668',
                    default_batch_chapter_nos: productionRelapseChapterNos,
                    restore_chapter_nos: [104, 105, 106, 107, 108],
                    validation_chapter_nos: [96, 97, 98],
                    failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
                    failed_requirements: [
                      { key: 'default_lane_segment_duty', label: '默认档位段位职责', failure_reason: '核心偏移' },
                      { key: 'default_lane_payoff_density', label: '回报密度', failure_reason: '回报欠账' },
                      { key: 'default_lane_ending_hook_template', label: '章末追读模板', failure_reason: '追读拉力' },
                    ],
                    summary: '第109-113章真实生产复发，当前模板版本必须证明核心、回报、追读三项后验修复。',
                  },
                  failed_requirements: [
                    { key: 'default_lane_segment_duty', label: '默认档位段位职责', failure_reason: '核心偏移', failed_count: 1 },
                    { key: 'default_lane_payoff_density', label: '回报密度', failure_reason: '回报欠账', failed_count: 1 },
                    { key: 'default_lane_ending_hook_template', label: '章末追读模板', failure_reason: '追读拉力', failed_count: 1 },
                  ],
                  redesigned_templates: [
                    { key: 'default_lane_segment_duty', label: '默认档位段位职责', template: '生产后验新模板：每章先标明本章在默认5章中的职责，并用主线选择压住核心。' },
                    { key: 'default_lane_payoff_density', label: '回报密度', template: '生产后验新模板：每章必须落一个可见收益、反制结果或阶段结算。' },
                    { key: 'default_lane_ending_hook_template', label: '章末追读模板', template: '生产后验新模板：最后300字必须留下新的风险问题和下一章必看理由。' },
                  ],
                  validation_standard: [
                    '下一轮3章验证批必须逐章回填 default_lane_*_delivered。',
                  ],
                  required_receipts: [
                    'default_lane_segment_duty_delivered',
                    'default_lane_conflict_rotation_delivered',
                    'default_lane_payoff_density_delivered',
                    'default_lane_ending_hook_template_delivered',
                  ],
                },
                structure_actions: [
                  '按真实生产复发重构当前默认档位模板版本，再回到3章验证批。',
                ],
              },
            }],
          }),
        },
      ],
    } as any)

    const verification = model.batchGuardrail.nextBatchBrief.expansionStructureVerification
    const template = verification?.default_five_chapter_lane_template

    expect(model.batchGuardrail.safeChapterCount).toBe(3)
    expect(model.batchGuardrail.recommendedAction).toMatchObject({
      key: 'start_safe_batch_generation',
      label: '启动生产后验验证批',
      payload: {
        source: 'safe_batch_production_relapse_validation_batch',
      },
    })
    expect(model.batchGuardrail.recommendedAction.description).toContain('production_relapse_verdict.status=passed')
    expect(model.batchGuardrail.recommendedAction.description).toContain('remaining_failure_reasons 为空')
    expect(model.productionLicense.modeLabel).toBe('生产后验验证批')
    expect(model.productionLicense.summary).toContain('真实生产复发章节')
    expect(model.productionLicense.summary).toContain('production_relapse_verdict.status=passed')
    expect(verification).toMatchObject({
      source: 'safe_batch_expansion_structure_repair',
      validation_chapter_nos: validationChapterNos,
    })
    expect(template).toMatchObject({
      template_version_id: 'safe_batch_expansion_structure_repair:668',
      production_relapse_count: 1,
      production_relapse_review: {
        template_version_id: 'safe_batch_expansion_structure_repair:668',
        default_batch_chapter_nos: productionRelapseChapterNos,
        restore_chapter_nos: [104, 105, 106, 107, 108],
        validation_chapter_nos: [96, 97, 98],
        failure_reasons: expect.arrayContaining(['核心偏移', '回报欠账', '追读拉力']),
        failed_requirements: expect.arrayContaining([
          expect.objectContaining({ key: 'default_lane_segment_duty', failure_reason: '核心偏移' }),
          expect.objectContaining({ key: 'default_lane_payoff_density', failure_reason: '回报欠账' }),
          expect.objectContaining({ key: 'default_lane_ending_hook_template', failure_reason: '追读拉力' }),
        ]),
      },
      validation_standard: expect.arrayContaining([
        '下一轮3章验证批必须逐章对照 template_version_id safe_batch_expansion_structure_repair:668 和真实生产复发章节。',
      ]),
    })
    expect(template?.summary).toContain('safe_batch_expansion_structure_repair:668')
    expect(template?.summary).toContain('第109、110、111、112、113章')
    expect(template?.requirements).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'default_lane_payoff_density',
        verification_requirement: expect.stringContaining('回报欠账'),
      }),
    ]))
    expect(model.batchGuardrail.preflight.inputSnapshot.safe_batch_expansion_structure_verification.default_five_chapter_lane_template).toMatchObject({
      template_version_id: 'safe_batch_expansion_structure_repair:668',
      production_relapse_review: {
        default_batch_chapter_nos: productionRelapseChapterNos,
      },
    })
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

  test('keeps default lane observing until the latest redesigned template version is stable', () => {
    const firstValidationChapterNos = [90, 91, 92]
    const secondValidationChapterNos = [96, 97, 98]
    const firstRestoreChapterNos = [99, 100, 101, 102, 103]
    const secondRestoreChapterNos = [104, 105, 106, 107, 108]
    const versionedTemplate = (sourceRunId: number, summary: string) => ({
      visible: true,
      status: 'fulfilled',
      label: '默认5章档位模板重构',
      source: 'safe_batch_expansion_structure_repair',
      redesign_source: 'default_five_chapter_lane_template_redesign_queue',
      source_run_id: sourceRunId,
      summary,
      redesigned_templates: [
        { key: 'default_lane_payoff_density', label: '回报密度', template: `版本${sourceRunId}：每章必须交付显性收益。` },
      ],
      validation_standard: [
        '下一轮3章验证批必须逐章回填 default_lane_*_delivered。',
        '连续2批模板全过后才能恢复默认5章档位。',
      ],
      required_receipts: [
        'default_lane_segment_duty_delivered',
        'default_lane_conflict_rotation_delivered',
        'default_lane_payoff_density_delivered',
        'default_lane_ending_hook_template_delivered',
      ],
      requirements: [
        { key: 'default_lane_segment_duty', label: '默认档位段位职责', status: 'fulfilled' },
        { key: 'default_lane_conflict_rotation', label: '冲突轮换', status: 'fulfilled' },
        { key: 'default_lane_payoff_density', label: '回报密度', status: 'fulfilled' },
        { key: 'default_lane_ending_hook_template', label: '章末追读模板', status: 'fulfilled' },
      ],
    })
    const chapterWithTemplateReceipts = (chapterNo: number) => ({
      id: chapterNo,
      chapter_no: chapterNo,
      title: `模板版本恢复${chapterNo}`,
      chapter_text: '模板版本恢复正文'.repeat(500),
      raw_payload: {
        generated_scene_breakdown: [{
          expansion_structure_decision_execution: {
            segment_role_delivered: true,
            observation_metrics_delivered: true,
            redesign_principles_delivered: true,
            default_lane_segment_duty_delivered: true,
            default_lane_conflict_rotation_delivered: true,
            default_lane_payoff_density_delivered: true,
            default_lane_ending_hook_template_delivered: true,
            evidence: [`第${chapterNo}章默认档位模板版本回执。`],
          },
        }],
      },
    })
    const model = buildAutoCreationDirectorModel({
      planning: readySafeBatchPlanning({ futureRoute: futureRouteRange(109, 5) }),
      writing: readySafeBatchWriting({
        nextChapter: { ...baseWriting.nextChapter, id: 109, chapterNo: 109, title: '模板版本观察109' },
        previousChapter: { chapterNo: 108, title: '模板版本观察108', wordCount: 3200, hasProse: true },
      }),
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 108 },
      chapters: [
        ...[41, 42, 43, 44, 45, 46, 47, 48, 49].map(chapterNo => ({
          id: chapterNo,
          chapter_no: chapterNo,
          title: `强化趋势${chapterNo}`,
          chapter_text: '强化趋势正文'.repeat(500),
        })),
        ...firstValidationChapterNos.map(chapterWithTemplateReceipts),
        ...secondValidationChapterNos.map(chapterWithTemplateReceipts),
        ...firstRestoreChapterNos.map(chapterNo => ({
          id: chapterNo,
          chapter_no: chapterNo,
          title: `恢复扩批${chapterNo}`,
          chapter_text: '恢复扩批正文'.repeat(500),
        })),
        ...secondRestoreChapterNos.map(chapterNo => ({
          id: chapterNo,
          chapter_no: chapterNo,
          title: `恢复扩批${chapterNo}`,
          chapter_text: '恢复扩批正文'.repeat(500),
        })),
      ],
      reviews: [
        ...strengthenedAcceptanceQualityReviews([41, 42, 43], 6641, '2026-06-19T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([44, 45, 46], 6651, '2026-06-20T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([47, 48, 49], 6661, '2026-06-21T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews(firstValidationChapterNos, 6671, '2026-06-22T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews(secondValidationChapterNos, 6681, '2026-06-23T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews(firstRestoreChapterNos, 6691, '2026-06-24T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews(secondRestoreChapterNos, 6701, '2026-06-25T01:00:00.000Z'),
      ],
      runRecords: [
        strengthenedAcceptanceBatchRun({ id: 664, createdAt: '2026-06-19T00:00:00.000Z', chapterNos: [41, 42, 43] }),
        strengthenedAcceptanceBatchRun({ id: 665, createdAt: '2026-06-20T00:00:00.000Z', chapterNos: [44, 45, 46] }),
        strengthenedAcceptanceBatchRun({ id: 666, createdAt: '2026-06-21T00:00:00.000Z', chapterNos: [47, 48, 49] }),
        defaultLaneTemplateValidationBatchRun({
          id: 667,
          createdAt: '2026-06-22T00:00:00.000Z',
          chapterNos: firstValidationChapterNos,
          template: versionedTemplate(667, '旧版本模板验证通过。'),
        }),
        defaultLaneTemplateValidationBatchRun({
          id: 668,
          createdAt: '2026-06-23T00:00:00.000Z',
          chapterNos: secondValidationChapterNos,
          template: versionedTemplate(668, '新版本模板验证通过，但仍只验证 1 批。'),
        }),
        restoredFiveChapterBatchRun({
          id: 669,
          createdAt: '2026-06-24T00:00:00.000Z',
          chapterNos: firstRestoreChapterNos,
          validationChapterNos: secondValidationChapterNos,
        }),
        restoredFiveChapterBatchRun({
          id: 670,
          createdAt: '2026-06-25T00:00:00.000Z',
          chapterNos: secondRestoreChapterNos,
          validationChapterNos: secondValidationChapterNos,
        }),
      ],
    } as any)

    const policy = model.batchGuardrail.preflight.inputSnapshot.safe_batch_expansion_policy
    const lane = model.batchGuardrail.recommendedAction.payload?.recovery_restore_stability_evidence

    expect(policy.expansion_feedback.default_five_chapter_lane_template_stability_profile).toMatchObject({
      status: 'ready',
      pass_streak: 2,
      latest_template_version_profile: {
        id: 'safe_batch_expansion_structure_repair:668',
        status: 'observing',
        pass_streak: 1,
        required_pass_streak: 2,
      },
    })
    expect(model.batchGuardrail.safeChapterCount).toBe(5)
    expect(model.batchGuardrail.recommendedAction.label).toBe('继续5章观察批')
    expect(model.batchGuardrail.recommendedAction.payload).toMatchObject({
      source: 'safe_batch_recovery_restore_five_batch',
      safety_limit: 5,
      recovery_restore_stability_evidence: {
        status: 'observing',
        default_five_chapter_ready: false,
        latest_template_version_profile: {
          id: 'safe_batch_expansion_structure_repair:668',
          pass_streak: 1,
          required_pass_streak: 2,
        },
      },
    })
    expect(lane?.summary).toContain('模板版本 safe_batch_expansion_structure_repair:668 连过 1/2')
    expect(model.productionLicense.modeLabel).toBe('5章观察批')
  })

  test('explains why a default five-chapter lane regresses before returning to validation', () => {
    const validationChapterNos = [50, 51, 52]
    const firstRestoreChapterNos = [53, 54, 55, 56, 57]
    const secondRestoreChapterNos = [58, 59, 60, 61, 62]
    const defaultLaneChapterNos = [63, 64, 65, 66, 67]
    const model = buildAutoCreationDirectorModel({
      planning: readySafeBatchPlanning({ futureRoute: futureRouteRange(68, 5) }),
      writing: readySafeBatchWriting({
        nextChapter: { ...baseWriting.nextChapter, id: 68, chapterNo: 68, title: '默认档复发后68' },
        previousChapter: { chapterNo: 67, title: '默认档复发67', wordCount: 3180, hasProse: true },
      }),
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 67 },
      chapters: [
        ...[41, 42, 43, 44, 45, 46, 47, 48, 49],
        ...validationChapterNos,
        ...firstRestoreChapterNos,
        ...secondRestoreChapterNos,
        ...defaultLaneChapterNos,
      ].map(chapterNo => ({
        id: chapterNo,
        chapter_no: chapterNo,
        title: `默认档复发${chapterNo}`,
        chapter_text: '默认档复发正文'.repeat(500),
      })),
      reviews: [
        ...strengthenedAcceptanceQualityReviews([41, 42, 43], 5411, '2026-06-09T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([44, 45, 46], 5421, '2026-06-10T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([47, 48, 49], 5431, '2026-06-11T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews(validationChapterNos, 5441, '2026-06-14T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews(firstRestoreChapterNos, 5451, '2026-06-15T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews(secondRestoreChapterNos, 5461, '2026-06-16T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews(defaultLaneChapterNos, 5471, '2026-06-17T01:00:00.000Z'),
        {
          id: 5472,
          chapter_id: 65,
          review_type: 'chapter_core_drift',
          created_at: '2026-06-17T01:10:00.000Z',
          payload: JSON.stringify({ chapter_core_drift: { status: 'warn', drift_risks: ['默认5章档位中段偏离阵盘主线承诺'] } }),
        },
        {
          id: 5473,
          chapter_id: 66,
          review_type: 'reader_payoff_sync',
          created_at: '2026-06-17T01:11:00.000Z',
          payload: JSON.stringify({ reader_payoff_sync: { status: 'warn', debt_count: 1, missed: ['默认5章档位中段显性回报缺失'] } }),
        },
        {
          id: 5474,
          chapter_id: 66,
          review_type: 'reader_retention_sync',
          created_at: '2026-06-17T01:12:00.000Z',
          payload: JSON.stringify({ reader_retention_sync: { status: 'warn', missed_count: 1, missed: ['默认5章档位中段章末追读重复'] } }),
        },
      ],
      runRecords: [
        strengthenedAcceptanceBatchRun({ id: 651, createdAt: '2026-06-09T00:00:00.000Z', chapterNos: [41, 42, 43] }),
        strengthenedAcceptanceBatchRun({ id: 652, createdAt: '2026-06-10T00:00:00.000Z', chapterNos: [44, 45, 46] }),
        strengthenedAcceptanceBatchRun({ id: 653, createdAt: '2026-06-11T00:00:00.000Z', chapterNos: [47, 48, 49] }),
        expansionStructureValidationBatchRun({
          id: 654,
          createdAt: '2026-06-14T00:00:00.000Z',
          chapterNos: validationChapterNos,
          source: 'safe_batch_recovery_validation_batch',
        }),
        restoredFiveChapterBatchRun({
          id: 655,
          createdAt: '2026-06-15T00:00:00.000Z',
          chapterNos: firstRestoreChapterNos,
          validationChapterNos,
        }),
        restoredFiveChapterBatchRun({
          id: 656,
          createdAt: '2026-06-16T00:00:00.000Z',
          chapterNos: secondRestoreChapterNos,
          validationChapterNos,
        }),
        defaultFiveChapterLaneBatchRun({
          id: 657,
          createdAt: '2026-06-17T00:00:00.000Z',
          chapterNos: defaultLaneChapterNos,
          restoreChapterNos: secondRestoreChapterNos,
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
        default_five_chapter_regression: {
          visible: true,
          status: 'regressed',
          label: '默认5章档位回退原因',
          default_batch_chapter_nos: defaultLaneChapterNos,
          restore_chapter_nos: secondRestoreChapterNos,
          validation_chapter_nos: validationChapterNos,
          stable_pass_streak: 2,
          repeated_hotspot_segment: {
            key: 'middle',
            label: '中段',
          },
          failure_reasons: expect.arrayContaining(['核心偏移', '回报欠账', '追读拉力']),
        },
      },
    })
    expect(policy.expansion_feedback.summary).toContain('默认5章档位回退原因')
    expect(roadmap.next_repair_layer.focus).toMatchObject({
      issue_type: 'safe_batch_expansion_structure_repair',
      task_center_filter_label: '扩批结构',
    })
    expect(structureTask).toMatchObject({
      issue_type: 'safe_batch_expansion_structure_repair',
      action_key: 'restore_default_lane_regression',
      safe_batch_expansion_structure_review: {
        default_five_chapter_regression: {
          status: 'regressed',
          default_batch_chapter_nos: defaultLaneChapterNos,
          validation_chapter_nos: validationChapterNos,
        },
      },
    })
    expect(structureTask?.message).toContain('默认5章档位失效')
    expect(structureTask?.action).toContain('3章验证批')
  })

  test('records template version relapse after default five-chapter production batch', () => {
    const firstValidationChapterNos = [90, 91, 92]
    const secondValidationChapterNos = [96, 97, 98]
    const firstRestoreChapterNos = [99, 100, 101, 102, 103]
    const secondRestoreChapterNos = [104, 105, 106, 107, 108]
    const defaultLaneChapterNos = [109, 110, 111, 112, 113]
    const templateVersionProfile = {
      id: 'safe_batch_expansion_structure_repair:668',
      label: '默认5章档位模板重构',
      source: 'safe_batch_expansion_structure_repair',
      redesign_source: 'default_five_chapter_lane_template_redesign_queue',
      source_run_id: 668,
      status: 'ready',
      latest_status: 'passed',
      validation_batch_count: 2,
      passed_batch_count: 2,
      failed_batch_count: 0,
      pass_streak: 2,
      required_pass_streak: 2,
      summary: '当前默认档位模板版本已连续2批验证通过。',
      redesigned_templates: [
        { key: 'default_lane_payoff_density', label: '回报密度', template: '每章必须显性结算收益。' },
      ],
    }
    const versionedTemplate = {
      visible: true,
      status: 'fulfilled',
      label: '默认5章档位模板重构',
      source: 'safe_batch_expansion_structure_repair',
      redesign_source: 'default_five_chapter_lane_template_redesign_queue',
      source_run_id: 668,
      summary: '默认档位模板新版本进入验证。',
      redesigned_templates: templateVersionProfile.redesigned_templates,
      validation_standard: ['连续2批模板全过后才能恢复默认5章档位。'],
      required_receipts: [
        'default_lane_segment_duty_delivered',
        'default_lane_conflict_rotation_delivered',
        'default_lane_payoff_density_delivered',
        'default_lane_ending_hook_template_delivered',
      ],
      requirements: [
        { key: 'default_lane_segment_duty', label: '默认档位段位职责', status: 'fulfilled' },
        { key: 'default_lane_conflict_rotation', label: '冲突轮换', status: 'fulfilled' },
        { key: 'default_lane_payoff_density', label: '回报密度', status: 'fulfilled' },
        { key: 'default_lane_ending_hook_template', label: '章末追读模板', status: 'fulfilled' },
      ],
    }
    const chapterWithTemplateReceipts = (chapterNo: number) => ({
      id: chapterNo,
      chapter_no: chapterNo,
      title: `版本后验${chapterNo}`,
      chapter_text: '版本后验正文'.repeat(500),
      raw_payload: {
        generated_scene_breakdown: [{
          expansion_structure_decision_execution: {
            segment_role_delivered: true,
            observation_metrics_delivered: true,
            redesign_principles_delivered: true,
            default_lane_segment_duty_delivered: true,
            default_lane_conflict_rotation_delivered: true,
            default_lane_payoff_density_delivered: true,
            default_lane_ending_hook_template_delivered: true,
            evidence: [`第${chapterNo}章默认档位模板版本回执。`],
          },
        }],
      },
    })
    const model = buildAutoCreationDirectorModel({
      planning: readySafeBatchPlanning({ futureRoute: futureRouteRange(114, 5) }),
      writing: readySafeBatchWriting({
        nextChapter: { ...baseWriting.nextChapter, id: 114, chapterNo: 114, title: '版本后验114' },
        previousChapter: { chapterNo: 113, title: '版本后验113', wordCount: 3200, hasProse: true },
      }),
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 113 },
      chapters: [
        ...[41, 42, 43, 44, 45, 46, 47, 48, 49].map(chapterNo => ({
          id: chapterNo,
          chapter_no: chapterNo,
          title: `强化趋势${chapterNo}`,
          chapter_text: '强化趋势正文'.repeat(500),
        })),
        ...firstValidationChapterNos.map(chapterWithTemplateReceipts),
        ...secondValidationChapterNos.map(chapterWithTemplateReceipts),
        ...firstRestoreChapterNos.map(chapterNo => ({
          id: chapterNo,
          chapter_no: chapterNo,
          title: `恢复扩批${chapterNo}`,
          chapter_text: '恢复扩批正文'.repeat(500),
        })),
        ...secondRestoreChapterNos.map(chapterNo => ({
          id: chapterNo,
          chapter_no: chapterNo,
          title: `恢复扩批${chapterNo}`,
          chapter_text: '恢复扩批正文'.repeat(500),
        })),
        ...defaultLaneChapterNos.map(chapterNo => ({
          id: chapterNo,
          chapter_no: chapterNo,
          title: `默认档版本后验${chapterNo}`,
          chapter_text: '默认档版本后验正文'.repeat(500),
        })),
      ],
      reviews: [
        ...strengthenedAcceptanceQualityReviews([41, 42, 43], 6711, '2026-06-19T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([44, 45, 46], 6721, '2026-06-20T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([47, 48, 49], 6731, '2026-06-21T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews(firstValidationChapterNos, 6741, '2026-06-22T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews(secondValidationChapterNos, 6751, '2026-06-23T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews(firstRestoreChapterNos, 6761, '2026-06-24T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews(secondRestoreChapterNos, 6771, '2026-06-25T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews(defaultLaneChapterNos, 6781, '2026-06-26T01:00:00.000Z'),
        {
          id: 6786,
          chapter_id: 111,
          review_type: 'chapter_core_drift',
          created_at: '2026-06-26T01:10:00.000Z',
          payload: JSON.stringify({ chapter_core_drift: { status: 'warn', drift_risks: ['当前模板版本默认档中段偏离主线承诺'] } }),
        },
        {
          id: 6787,
          chapter_id: 112,
          review_type: 'reader_payoff_sync',
          created_at: '2026-06-26T01:11:00.000Z',
          payload: JSON.stringify({ reader_payoff_sync: { status: 'warn', debt_count: 1, missed: ['当前模板版本默认档中段显性回报缺失'] } }),
        },
        {
          id: 6788,
          chapter_id: 112,
          review_type: 'reader_retention_sync',
          created_at: '2026-06-26T01:12:00.000Z',
          payload: JSON.stringify({ reader_retention_sync: { status: 'warn', missed_count: 1, missed: ['当前模板版本默认档中段章末追读重复'] } }),
        },
      ],
      runRecords: [
        strengthenedAcceptanceBatchRun({ id: 671, createdAt: '2026-06-19T00:00:00.000Z', chapterNos: [41, 42, 43] }),
        strengthenedAcceptanceBatchRun({ id: 672, createdAt: '2026-06-20T00:00:00.000Z', chapterNos: [44, 45, 46] }),
        strengthenedAcceptanceBatchRun({ id: 673, createdAt: '2026-06-21T00:00:00.000Z', chapterNos: [47, 48, 49] }),
        defaultLaneTemplateValidationBatchRun({
          id: 674,
          createdAt: '2026-06-22T00:00:00.000Z',
          chapterNos: firstValidationChapterNos,
          template: versionedTemplate,
        }),
        defaultLaneTemplateValidationBatchRun({
          id: 675,
          createdAt: '2026-06-23T00:00:00.000Z',
          chapterNos: secondValidationChapterNos,
          template: versionedTemplate,
        }),
        restoredFiveChapterBatchRun({
          id: 676,
          createdAt: '2026-06-24T00:00:00.000Z',
          chapterNos: firstRestoreChapterNos,
          validationChapterNos: secondValidationChapterNos,
        }),
        restoredFiveChapterBatchRun({
          id: 677,
          createdAt: '2026-06-25T00:00:00.000Z',
          chapterNos: secondRestoreChapterNos,
          validationChapterNos: secondValidationChapterNos,
        }),
        defaultFiveChapterLaneBatchRun({
          id: 678,
          createdAt: '2026-06-26T00:00:00.000Z',
          chapterNos: defaultLaneChapterNos,
          restoreChapterNos: secondRestoreChapterNos,
          validationChapterNos: secondValidationChapterNos,
          templateVersionProfile,
        }),
      ],
    } as any)

    const feedback = model.batchGuardrail.preflight.inputSnapshot.safe_batch_expansion_policy.expansion_feedback
    const regression = feedback.default_five_chapter_regression
    const profile = feedback.default_five_chapter_lane_template_stability_profile
    const structureTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'safe_batch_expansion_structure_repair')
    const redesignQueue = structureTask?.safe_batch_expansion_structure_review.default_five_chapter_lane_template_redesign_queue

    expect(regression).toMatchObject({
      template_version_id: 'safe_batch_expansion_structure_repair:668',
      template_version: {
        id: 'safe_batch_expansion_structure_repair:668',
        status: 'ready',
      },
      template_version_failed_requirements: expect.arrayContaining([
        expect.objectContaining({ key: 'default_lane_segment_duty', failure_reason: '核心偏移' }),
        expect.objectContaining({ key: 'default_lane_payoff_density', failure_reason: '回报欠账' }),
        expect.objectContaining({ key: 'default_lane_ending_hook_template', failure_reason: '追读拉力' }),
      ]),
    })
    expect(regression.summary).toContain('版本 safe_batch_expansion_structure_repair:668')
    expect(profile.latest_template_version_profile).toMatchObject({
      id: 'safe_batch_expansion_structure_repair:668',
      status: 'relapsed',
      production_relapse_count: 1,
      latest_production_relapse: {
        default_batch_chapter_nos: defaultLaneChapterNos,
        failure_reasons: expect.arrayContaining(['核心偏移', '回报欠账', '追读拉力']),
      },
    })
    expect(redesignQueue).toMatchObject({
      source: 'default_five_chapter_lane_production_relapse',
      template_version: {
        id: 'safe_batch_expansion_structure_repair:668',
      },
      production_relapse_count: 1,
      production_relapse_review: {
        template_version_id: 'safe_batch_expansion_structure_repair:668',
        default_batch_chapter_nos: defaultLaneChapterNos,
        failure_reasons: expect.arrayContaining(['核心偏移', '回报欠账', '追读拉力']),
        failed_requirements: expect.arrayContaining([
          expect.objectContaining({ key: 'default_lane_segment_duty', failure_reason: '核心偏移' }),
          expect.objectContaining({ key: 'default_lane_payoff_density', failure_reason: '回报欠账' }),
          expect.objectContaining({ key: 'default_lane_ending_hook_template', failure_reason: '追读拉力' }),
        ]),
      },
      failed_requirements: expect.arrayContaining([
        expect.objectContaining({ key: 'default_lane_payoff_density', failure_reason: '回报欠账' }),
      ]),
    })
    expect(structureTask?.message).toContain('safe_batch_expansion_structure_repair:668')
  })

  test('feeds default five-chapter regression evidence into the next validation batch brief after repair', () => {
    const validationChapterNos = [50, 51, 52]
    const firstRestoreChapterNos = [53, 54, 55, 56, 57]
    const secondRestoreChapterNos = [58, 59, 60, 61, 62]
    const defaultLaneChapterNos = [63, 64, 65, 66, 67]
    const nextValidationChapterNos = [68, 69, 70]
    const defaultRegression = {
      visible: true,
      status: 'regressed',
      label: '默认5章档位回退原因',
      source: 'default_five_chapter_lane',
      stable_pass_streak: 2,
      required_stable_pass_streak: 2,
      default_batch_chapter_nos: defaultLaneChapterNos,
      restore_chapter_nos: secondRestoreChapterNos,
      validation_chapter_nos: validationChapterNos,
      repeated_hotspot_segment: { key: 'middle', label: '中段', count: 1, chapter_nos: [65, 66], risk_count: 3 },
      failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
      summary: '默认5章档位回退原因：连续 2 批恢复稳定后，第63、64、65、66、67章默认档位在中段复发。',
    }
    const model = buildAutoCreationDirectorModel({
      planning: readySafeBatchPlanning({ futureRoute: futureRouteRange(68, 5) }),
      writing: readySafeBatchWriting({
        nextChapter: { ...baseWriting.nextChapter, id: 68, chapterNo: 68, title: '默认档回检68' },
        previousChapter: { chapterNo: 67, title: '默认档复发67', wordCount: 3180, hasProse: true },
      }),
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 67 },
      chapters: [
        ...[41, 42, 43, 44, 45, 46, 47, 48, 49],
        ...validationChapterNos,
        ...firstRestoreChapterNos,
        ...secondRestoreChapterNos,
        ...defaultLaneChapterNos,
      ].map(chapterNo => ({
        id: chapterNo,
        chapter_no: chapterNo,
        title: `默认档回检${chapterNo}`,
        chapter_text: '默认档回检正文'.repeat(500),
      })),
      reviews: [
        ...strengthenedAcceptanceQualityReviews([41, 42, 43], 5481, '2026-06-09T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([44, 45, 46], 5491, '2026-06-10T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([47, 48, 49], 5501, '2026-06-11T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews(validationChapterNos, 5511, '2026-06-14T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews(firstRestoreChapterNos, 5521, '2026-06-15T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews(secondRestoreChapterNos, 5531, '2026-06-16T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews(defaultLaneChapterNos, 5541, '2026-06-17T01:00:00.000Z'),
        {
          id: 5542,
          chapter_id: 65,
          review_type: 'chapter_core_drift',
          created_at: '2026-06-17T01:10:00.000Z',
          payload: JSON.stringify({ chapter_core_drift: { status: 'warn', drift_risks: ['默认5章档位中段偏离阵盘主线承诺'] } }),
        },
        {
          id: 5543,
          chapter_id: 66,
          review_type: 'reader_payoff_sync',
          created_at: '2026-06-17T01:11:00.000Z',
          payload: JSON.stringify({ reader_payoff_sync: { status: 'warn', debt_count: 1, missed: ['默认5章档位中段显性回报缺失'] } }),
        },
        {
          id: 5544,
          chapter_id: 66,
          review_type: 'reader_retention_sync',
          created_at: '2026-06-17T01:12:00.000Z',
          payload: JSON.stringify({ reader_retention_sync: { status: 'warn', missed_count: 1, missed: ['默认5章档位中段章末追读重复'] } }),
        },
        {
          id: 5545,
          chapter_id: 65,
          review_type: 'prose_quality',
          created_at: '2026-06-17T02:28:00.000Z',
          payload: JSON.stringify({ score: 88, passed: true }),
        },
        {
          id: 5546,
          chapter_id: 66,
          review_type: 'prose_quality',
          created_at: '2026-06-17T02:29:00.000Z',
          payload: JSON.stringify({ score: 89, passed: true }),
        },
      ],
      runRecords: [
        strengthenedAcceptanceBatchRun({ id: 658, createdAt: '2026-06-09T00:00:00.000Z', chapterNos: [41, 42, 43] }),
        strengthenedAcceptanceBatchRun({ id: 659, createdAt: '2026-06-10T00:00:00.000Z', chapterNos: [44, 45, 46] }),
        strengthenedAcceptanceBatchRun({ id: 660, createdAt: '2026-06-11T00:00:00.000Z', chapterNos: [47, 48, 49] }),
        expansionStructureValidationBatchRun({
          id: 661,
          createdAt: '2026-06-14T00:00:00.000Z',
          chapterNos: validationChapterNos,
          source: 'safe_batch_recovery_validation_batch',
        }),
        restoredFiveChapterBatchRun({
          id: 662,
          createdAt: '2026-06-15T00:00:00.000Z',
          chapterNos: firstRestoreChapterNos,
          validationChapterNos,
        }),
        restoredFiveChapterBatchRun({
          id: 663,
          createdAt: '2026-06-16T00:00:00.000Z',
          chapterNos: secondRestoreChapterNos,
          validationChapterNos,
        }),
        defaultFiveChapterLaneBatchRun({
          id: 664,
          createdAt: '2026-06-17T00:00:00.000Z',
          chapterNos: defaultLaneChapterNos,
          restoreChapterNos: secondRestoreChapterNos,
          validationChapterNos,
        }),
        {
          id: 665,
          run_type: 'longform_production_repair',
          created_at: '2026-06-17T02:00:00.000Z',
          completed_at: '2026-06-17T02:20:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({ source: 'auto_creation_safe_batch_risk' }),
          output_ref: JSON.stringify({
            tasks: [
              {
                issue_type: 'safe_batch_expansion_structure_repair',
                task_status: 'resolved',
                action_key: 'restore_default_lane_regression',
                chapter_no: 65,
                safe_batch_expansion_structure_review: {
                  default_five_chapter_regression: defaultRegression,
                  repeated_hotspot_segment: { key: 'middle', label: '中段', count: 1 },
                  latest_chapter_nos: defaultLaneChapterNos,
                  affected_chapter_nos: [65, 66],
                  structure_actions: [
                    '默认档位回退：先把中段失效原因写入任务书，下一轮回到3章验证批。',
                    '重写中段固定职责：每批第3-4章必须完成主线转折、显性回报和章末追读。',
                  ],
                },
              },
              { issue_type: 'core_drift', task_status: 'resolved', chapter_no: 65, resolved_at: '2026-06-17T02:12:00.000Z' },
              { issue_type: 'reader_payoff_debt', task_status: 'resolved', chapter_no: 66, resolved_at: '2026-06-17T02:13:00.000Z' },
              { issue_type: 'reader_pull_missed', task_status: 'resolved', chapter_no: 66, resolved_at: '2026-06-17T02:14:00.000Z' },
            ],
          }),
        },
      ],
    } as any)

    const verification = model.batchGuardrail.nextBatchBrief.expansionStructureVerification

    expect(model.batchGuardrail.safeChapterCount).toBe(3)
    expect(model.batchGuardrail.nextBatchBrief.chapterRangeLabel).toBe('第68-70章')
    expect(verification).toMatchObject({
      source: 'safe_batch_expansion_structure_repair',
      repeated_hotspot_segment: {
        key: 'middle',
        label: '中段',
      },
      validation_chapter_nos: nextValidationChapterNos,
      default_five_chapter_regression: {
        status: 'regressed',
        default_batch_chapter_nos: defaultLaneChapterNos,
        restore_chapter_nos: secondRestoreChapterNos,
        validation_chapter_nos: validationChapterNos,
        failure_reasons: expect.arrayContaining(['核心偏移', '回报欠账', '追读拉力']),
      },
    })
    expect(verification?.fixed_segment_role).toContain('默认档位回退')
    expect(verification?.explicit_payoff).toContain('显性回报')
    expect(verification?.ending_hook_requirement).toContain('章末追读')
    expect(model.batchGuardrail.preflight.inputSnapshot.safe_batch_expansion_structure_verification).toMatchObject({
      validation_chapter_nos: nextValidationChapterNos,
      default_five_chapter_regression: {
        default_batch_chapter_nos: defaultLaneChapterNos,
      },
    })
  })

  test('marks default five-chapter recovery verdict when validation clears original failure dimensions', () => {
    const originalValidationChapterNos = [50, 51, 52]
    const restoreChapterNos = [58, 59, 60, 61, 62]
    const defaultLaneChapterNos = [63, 64, 65, 66, 67]
    const validationChapterNos = [68, 69, 70]
    const defaultRegression = {
      visible: true,
      status: 'regressed',
      label: '默认5章档位回退原因',
      source: 'default_five_chapter_lane',
      stable_pass_streak: 2,
      required_stable_pass_streak: 2,
      default_batch_chapter_nos: defaultLaneChapterNos,
      restore_chapter_nos: restoreChapterNos,
      validation_chapter_nos: originalValidationChapterNos,
      repeated_hotspot_segment: { key: 'middle', label: '中段', count: 1, chapter_nos: [65, 66], risk_count: 3 },
      failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
      summary: '默认5章档位回退原因：连续 2 批恢复稳定后，第63、64、65、66、67章默认档位在中段复发。',
    }
    const model = buildAutoCreationDirectorModel({
      planning: readySafeBatchPlanning({ futureRoute: futureRouteRange(71, 5) }),
      writing: readySafeBatchWriting({
        nextChapter: { ...baseWriting.nextChapter, id: 71, chapterNo: 71, title: '默认档恢复后71' },
        previousChapter: { chapterNo: 70, title: '默认档验证70', wordCount: 3180, hasProse: true },
      }),
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 70 },
      chapters: [
        ...[41, 42, 43, 44, 45, 46, 47, 48, 49],
        ...validationChapterNos,
      ].map(chapterNo => ({
        id: chapterNo,
        chapter_no: chapterNo,
        title: `默认档恢复${chapterNo}`,
        chapter_text: '默认档恢复正文'.repeat(500),
      })),
      reviews: [
        ...strengthenedAcceptanceQualityReviews([41, 42, 43], 5551, '2026-06-09T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([44, 45, 46], 5561, '2026-06-10T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([47, 48, 49], 5571, '2026-06-11T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews(validationChapterNos, 5581, '2026-06-18T01:00:00.000Z'),
      ],
      runRecords: [
        strengthenedAcceptanceBatchRun({ id: 666, createdAt: '2026-06-09T00:00:00.000Z', chapterNos: [41, 42, 43] }),
        strengthenedAcceptanceBatchRun({ id: 667, createdAt: '2026-06-10T00:00:00.000Z', chapterNos: [44, 45, 46] }),
        strengthenedAcceptanceBatchRun({ id: 668, createdAt: '2026-06-11T00:00:00.000Z', chapterNos: [47, 48, 49] }),
        defaultRegressionValidationBatchRun({
          id: 669,
          createdAt: '2026-06-18T00:00:00.000Z',
          chapterNos: validationChapterNos,
          defaultRegression,
        }),
      ],
    } as any)

    const result = model.batchGuardrail.preflight.inputSnapshot.safe_batch_expansion_policy.expansion_feedback.expansion_structure_validation_result

    expect(result).toMatchObject({
      status: 'ok',
      validation_chapter_nos: validationChapterNos,
      risk_count: 0,
      default_five_chapter_recovery_verdict: {
        visible: true,
        status: 'passed',
        label: '默认档位恢复判定',
        default_batch_chapter_nos: defaultLaneChapterNos,
        restore_chapter_nos: restoreChapterNos,
        previous_validation_chapter_nos: originalValidationChapterNos,
        validation_chapter_nos: validationChapterNos,
        failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
        cleared_failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
        remaining_failure_reasons: [],
      },
    })
    expect(result.default_five_chapter_recovery_verdict.summary).toContain('核心偏移、回报欠账、追读拉力已清零')
    expect(model.batchGuardrail.recommendedAction.payload?.recovery_restore_confirmation).toMatchObject({
      default_five_chapter_recovery_verdict: {
        status: 'passed',
        validation_chapter_nos: validationChapterNos,
        cleared_failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
      },
    })
    expect(model.batchGuardrail.preflight.inputSnapshot.safe_batch_recovery_restore_confirmation).toMatchObject({
      default_five_chapter_recovery_verdict: {
        status: 'passed',
        validation_chapter_nos: validationChapterNos,
      },
    })
  })

  test('flags recovery verdict relapse when default five-chapter lane repeats cleared dimensions', () => {
    const originalValidationChapterNos = [50, 51, 52]
    const previousRestoreChapterNos = [58, 59, 60, 61, 62]
    const originalDefaultLaneChapterNos = [63, 64, 65, 66, 67]
    const recoveryValidationChapterNos = [68, 69, 70]
    const restoreChapterNos = [71, 72, 73, 74, 75]
    const defaultLaneChapterNos = [76, 77, 78, 79, 80]
    const recoveryVerdict = {
      visible: true,
      status: 'passed',
      label: '默认档位恢复判定',
      summary: '默认档位恢复判定：核心偏移、回报欠账、追读拉力已清零。',
      default_batch_chapter_nos: originalDefaultLaneChapterNos,
      restore_chapter_nos: previousRestoreChapterNos,
      previous_validation_chapter_nos: originalValidationChapterNos,
      validation_chapter_nos: recoveryValidationChapterNos,
      failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
      cleared_failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
      remaining_failure_reasons: [],
      failure_reason_statuses: [
        { reason: '核心偏移', status: 'cleared', risk_count: 0 },
        { reason: '回报欠账', status: 'cleared', risk_count: 0 },
        { reason: '追读拉力', status: 'cleared', risk_count: 0 },
      ],
    }
    const model = buildAutoCreationDirectorModel({
      planning: readySafeBatchPlanning({ futureRoute: futureRouteRange(81, 5) }),
      writing: readySafeBatchWriting({
        nextChapter: { ...baseWriting.nextChapter, id: 81, chapterNo: 81, title: '恢复判定失效后81' },
        previousChapter: { chapterNo: 80, title: '恢复判定失效80', wordCount: 3180, hasProse: true },
      }),
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 80 },
      chapters: [
        ...[41, 42, 43, 44, 45, 46, 47, 48, 49],
        ...recoveryValidationChapterNos,
        ...restoreChapterNos,
        ...defaultLaneChapterNos,
      ].map(chapterNo => ({
        id: chapterNo,
        chapter_no: chapterNo,
        title: `恢复判定失效${chapterNo}`,
        chapter_text: '恢复判定失效正文'.repeat(500),
      })),
      reviews: [
        ...strengthenedAcceptanceQualityReviews([41, 42, 43], 5591, '2026-06-09T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([44, 45, 46], 5601, '2026-06-10T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([47, 48, 49], 5611, '2026-06-11T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews(recoveryValidationChapterNos, 5621, '2026-06-18T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews(restoreChapterNos, 5631, '2026-06-19T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews(defaultLaneChapterNos, 5641, '2026-06-20T01:00:00.000Z'),
        {
          id: 5651,
          chapter_id: 78,
          review_type: 'chapter_core_drift',
          created_at: '2026-06-20T01:10:00.000Z',
          payload: JSON.stringify({ chapter_core_drift: { status: 'warn', drift_risks: ['恢复判定后默认档中段核心再次偏移'] } }),
        },
        {
          id: 5652,
          chapter_id: 79,
          review_type: 'reader_payoff_sync',
          created_at: '2026-06-20T01:11:00.000Z',
          payload: JSON.stringify({ reader_payoff_sync: { status: 'warn', debt_count: 1, missed: ['恢复判定后默认档中段回报再次欠账'] } }),
        },
        {
          id: 5653,
          chapter_id: 79,
          review_type: 'reader_retention_sync',
          created_at: '2026-06-20T01:12:00.000Z',
          payload: JSON.stringify({ reader_retention_sync: { status: 'warn', missed_count: 1, missed: ['恢复判定后默认档中段章末追读再次失效'] } }),
        },
      ],
      runRecords: [
        strengthenedAcceptanceBatchRun({ id: 670, createdAt: '2026-06-09T00:00:00.000Z', chapterNos: [41, 42, 43] }),
        strengthenedAcceptanceBatchRun({ id: 671, createdAt: '2026-06-10T00:00:00.000Z', chapterNos: [44, 45, 46] }),
        strengthenedAcceptanceBatchRun({ id: 672, createdAt: '2026-06-11T00:00:00.000Z', chapterNos: [47, 48, 49] }),
        defaultRegressionValidationBatchRun({
          id: 673,
          createdAt: '2026-06-18T00:00:00.000Z',
          chapterNos: recoveryValidationChapterNos,
          defaultRegression: {
            visible: true,
            status: 'regressed',
            label: '默认5章档位回退原因',
            default_batch_chapter_nos: originalDefaultLaneChapterNos,
            restore_chapter_nos: previousRestoreChapterNos,
            validation_chapter_nos: originalValidationChapterNos,
            repeated_hotspot_segment: { key: 'middle', label: '中段', count: 1, chapter_nos: [65, 66], risk_count: 3 },
            failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
          },
        }),
        restoredFiveChapterBatchRun({
          id: 674,
          createdAt: '2026-06-19T00:00:00.000Z',
          chapterNos: restoreChapterNos,
          validationChapterNos: recoveryValidationChapterNos,
          defaultFiveChapterRecoveryVerdict: recoveryVerdict,
        }),
        defaultFiveChapterLaneBatchRun({
          id: 675,
          createdAt: '2026-06-20T00:00:00.000Z',
          chapterNos: defaultLaneChapterNos,
          restoreChapterNos,
          validationChapterNos: recoveryValidationChapterNos,
          defaultFiveChapterRecoveryVerdict: recoveryVerdict,
        }),
      ],
    } as any)

    const policy = model.batchGuardrail.preflight.inputSnapshot.safe_batch_expansion_policy
    const structureTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'safe_batch_expansion_structure_repair')

    expect(policy.expansion_feedback).toMatchObject({
      status: 'rollback_to_small_batch',
      default_five_chapter_recovery_verdict_relapse: {
        visible: true,
        status: 'relapsed',
        label: '恢复判定失效',
        source: 'default_five_chapter_recovery_verdict',
        validation_chapter_nos: recoveryValidationChapterNos,
        relapse_batch_chapter_nos: defaultLaneChapterNos,
        relapsed_failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
        failure_reason_statuses: [
          { reason: '核心偏移', status: 'relapsed', risk_count: 1 },
          { reason: '回报欠账', status: 'relapsed', risk_count: 1 },
          { reason: '追读拉力', status: 'relapsed', risk_count: 1 },
        ],
      },
    })
    expect(policy.expansion_feedback.summary).toContain('恢复判定失效 -> 回到3章验证批')
    expect(policy.expansion_feedback.default_five_chapter_regression.default_five_chapter_recovery_verdict_relapse).toMatchObject({
      relapsed_failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
    })
    expect(structureTask).toMatchObject({
      safe_batch_expansion_structure_review: {
        default_five_chapter_recovery_verdict_relapse: {
          status: 'relapsed',
          relapsed_failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
        },
      },
    })
    expect(structureTask?.action).toContain('恢复判定失效')
    expect(structureTask?.action).toContain('3章验证批')
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

  test('checks default lane template receipts during recovery validation batches', () => {
    const validationChapterNos = [90, 91, 92]
    const model = buildAutoCreationDirectorModel({
      planning: readySafeBatchPlanning({ futureRoute: futureRouteRange(93, 5) }),
      writing: readySafeBatchWriting({
        nextChapter: { ...baseWriting.nextChapter, id: 93, chapterNo: 93, title: '模板验证后93' },
        previousChapter: { chapterNo: 92, title: '模板验证92', wordCount: 3200, hasProse: true },
      }),
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 92 },
      chapters: [
        ...[41, 42, 43, 44, 45, 46, 47, 48, 49].map(chapterNo => ({
          id: chapterNo,
          chapter_no: chapterNo,
          title: `强化趋势${chapterNo}`,
          chapter_text: '强化趋势正文'.repeat(500),
        })),
        ...validationChapterNos.map(chapterNo => ({
          id: chapterNo,
          chapter_no: chapterNo,
          title: `模板验证${chapterNo}`,
          chapter_text: '模板验证正文'.repeat(500),
          raw_payload: {
            generated_scene_breakdown: [{
              expansion_structure_decision_execution: {
                segment_role_delivered: true,
                observation_metrics_delivered: true,
                redesign_principles_delivered: true,
                default_lane_segment_duty_delivered: true,
                default_lane_conflict_rotation_delivered: true,
                default_lane_payoff_density_delivered: chapterNo !== 91,
                default_lane_ending_hook_template_delivered: true,
                evidence: [`第${chapterNo}章默认档位模板回执。`],
              },
            }],
          },
        })),
      ],
      reviews: [
        ...strengthenedAcceptanceQualityReviews([41, 42, 43], 6461, '2026-06-19T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([44, 45, 46], 6471, '2026-06-20T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([47, 48, 49], 6481, '2026-06-21T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews(validationChapterNos, 6491, '2026-06-22T01:00:00.000Z'),
      ],
      runRecords: [
        strengthenedAcceptanceBatchRun({ id: 646, createdAt: '2026-06-19T00:00:00.000Z', chapterNos: [41, 42, 43] }),
        strengthenedAcceptanceBatchRun({ id: 647, createdAt: '2026-06-20T00:00:00.000Z', chapterNos: [44, 45, 46] }),
        strengthenedAcceptanceBatchRun({ id: 648, createdAt: '2026-06-21T00:00:00.000Z', chapterNos: [47, 48, 49] }),
        defaultLaneTemplateValidationBatchRun({
          id: 649,
          createdAt: '2026-06-22T00:00:00.000Z',
          chapterNos: validationChapterNos,
        }),
      ],
    } as any)

    const policy = model.batchGuardrail.preflight.inputSnapshot.safe_batch_expansion_policy
    const validationResult = policy.expansion_feedback.expansion_structure_validation_result
    const templateVerdict = validationResult.default_five_chapter_lane_template_verdict
    const structureTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'safe_batch_expansion_structure_repair')

    expect(validationResult).toMatchObject({
      status: 'warn',
      risk_count: 1,
      validation_chapter_nos: validationChapterNos,
    })
    expect(templateVerdict).toMatchObject({
      visible: true,
      status: 'failed',
      missing_count: 1,
      missing_requirements: [
        {
          key: 'default_lane_payoff_density',
          label: '回报密度',
          chapter_nos: [91],
        },
      ],
    })
    expect(templateVerdict.summary).toContain('第91章缺回报密度')
    expect(structureTask).toMatchObject({
      issue_type: 'safe_batch_expansion_structure_repair',
      message: expect.stringContaining('默认档位模板回检未通过'),
      action: expect.stringContaining('第91章缺回报密度'),
      safe_batch_expansion_structure_review: {
        default_five_chapter_lane_template_repair: {
          visible: true,
          label: '默认档位模板验证缺项',
          missing_requirements: [
            {
              key: 'default_lane_payoff_density',
              label: '回报密度',
              chapter_nos: [91],
            },
          ],
        },
      },
    })
  })

  test('tracks redesigned default lane template version in validation verdicts', () => {
    const validationChapterNos = [96, 97, 98]
    const versionedTemplate = {
      visible: true,
      status: 'fulfilled',
      label: '默认5章档位模板重构',
      source: 'safe_batch_expansion_structure_repair',
      redesign_source: 'default_five_chapter_lane_template_redesign_queue',
      source_run_id: 663,
      summary: '默认档位模板已重构：回报密度失败 2 次已改为逐章显性结算。',
      segment_duty_rewrite: '新模板：第1章抛出规则压迫，第2章制造误导反转，第3章兑现阶段收益。',
      conflict_rotation: '新模板：规则压迫、人物对抗、信息误导按章轮换。',
      payoff_density: '新模板：每章必须有可见收益、反制结果或阶段结算。',
      ending_hook_template: '新模板：最后300字必须落触发事件、读者问题和下一章风险。',
      redesigned_templates: [
        { key: 'default_lane_payoff_density', label: '回报密度', template: '新模板：每章必须有可见收益、反制结果或阶段结算。' },
      ],
      validation_standard: [
        '下一轮3章验证批必须逐章回填 default_lane_*_delivered。',
        '连续2批模板全过后才能恢复默认5章档位。',
      ],
      required_receipts: [
        'default_lane_segment_duty_delivered',
        'default_lane_conflict_rotation_delivered',
        'default_lane_payoff_density_delivered',
        'default_lane_ending_hook_template_delivered',
      ],
      requirements: [
        { key: 'default_lane_segment_duty', label: '默认档位段位职责', status: 'fulfilled' },
        { key: 'default_lane_conflict_rotation', label: '冲突轮换', status: 'fulfilled' },
        { key: 'default_lane_payoff_density', label: '回报密度', status: 'fulfilled' },
        { key: 'default_lane_ending_hook_template', label: '章末追读模板', status: 'fulfilled' },
      ],
    }
    const model = buildAutoCreationDirectorModel({
      planning: readySafeBatchPlanning({ futureRoute: futureRouteRange(99, 5) }),
      writing: readySafeBatchWriting({
        nextChapter: { ...baseWriting.nextChapter, id: 99, chapterNo: 99, title: '模板版本后99' },
        previousChapter: { chapterNo: 98, title: '模板版本98', wordCount: 3200, hasProse: true },
      }),
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 98 },
      chapters: [
        ...[41, 42, 43, 44, 45, 46, 47, 48, 49].map(chapterNo => ({
          id: chapterNo,
          chapter_no: chapterNo,
          title: `强化趋势${chapterNo}`,
          chapter_text: '强化趋势正文'.repeat(500),
        })),
        ...validationChapterNos.map(chapterNo => ({
          id: chapterNo,
          chapter_no: chapterNo,
          title: `模板版本${chapterNo}`,
          chapter_text: '模板版本正文'.repeat(500),
          raw_payload: {
            generated_scene_breakdown: [{
              expansion_structure_decision_execution: {
                segment_role_delivered: true,
                observation_metrics_delivered: true,
                redesign_principles_delivered: true,
                default_lane_segment_duty_delivered: true,
                default_lane_conflict_rotation_delivered: true,
                default_lane_payoff_density_delivered: true,
                default_lane_ending_hook_template_delivered: true,
                evidence: [`第${chapterNo}章默认档位模板版本回执。`],
              },
            }],
          },
        })),
      ],
      reviews: [
        ...strengthenedAcceptanceQualityReviews([41, 42, 43], 6601, '2026-06-19T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([44, 45, 46], 6611, '2026-06-20T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([47, 48, 49], 6621, '2026-06-21T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews(validationChapterNos, 6631, '2026-06-25T01:00:00.000Z'),
      ],
      runRecords: [
        strengthenedAcceptanceBatchRun({ id: 660, createdAt: '2026-06-19T00:00:00.000Z', chapterNos: [41, 42, 43] }),
        strengthenedAcceptanceBatchRun({ id: 661, createdAt: '2026-06-20T00:00:00.000Z', chapterNos: [44, 45, 46] }),
        strengthenedAcceptanceBatchRun({ id: 662, createdAt: '2026-06-21T00:00:00.000Z', chapterNos: [47, 48, 49] }),
        {
          ...defaultLaneTemplateValidationBatchRun({
            id: 663,
            createdAt: '2026-06-25T00:00:00.000Z',
            chapterNos: validationChapterNos,
          }),
          input_ref: JSON.stringify({
            source: 'safe_batch_recovery_validation_batch',
            safety_limit: validationChapterNos.length,
            batch_preflight: {
              safe_chapter_count: validationChapterNos.length,
              allowed_chapter_nos: validationChapterNos,
              safe_batch_expansion_structure_verification: {
                ...expansionStructureVerification(validationChapterNos),
                source: 'safe_batch_expansion_structure_repair',
                default_five_chapter_lane_template: versionedTemplate,
              },
            },
            next_batch_brief: {
              chapter_range_label: '第96-98章',
              expansionStructureVerification: {
                ...expansionStructureVerification(validationChapterNos),
                source: 'safe_batch_expansion_structure_repair',
                default_five_chapter_lane_template: versionedTemplate,
              },
            },
          }),
        },
      ],
    } as any)

    const policy = model.batchGuardrail.preflight.inputSnapshot.safe_batch_expansion_policy
    const verdict = policy.expansion_feedback.expansion_structure_validation_result.default_five_chapter_lane_template_verdict
    const profile = policy.expansion_feedback.default_five_chapter_lane_template_stability_profile

    expect(verdict).toMatchObject({
      status: 'passed',
      template_version: {
        id: 'safe_batch_expansion_structure_repair:663',
        source: 'safe_batch_expansion_structure_repair',
        redesign_source: 'default_five_chapter_lane_template_redesign_queue',
        source_run_id: 663,
        summary: expect.stringContaining('回报密度失败 2 次'),
        redesigned_templates: expect.arrayContaining([
          expect.objectContaining({ key: 'default_lane_payoff_density', template: expect.stringContaining('可见收益') }),
        ]),
        validation_standard: expect.arrayContaining([
          '连续2批模板全过后才能恢复默认5章档位。',
        ]),
        required_receipts: expect.arrayContaining([
          'default_lane_payoff_density_delivered',
        ]),
      },
    })
    expect(verdict.summary).toContain('版本 safe_batch_expansion_structure_repair:663')
    expect(profile).toMatchObject({
      latest_template_version_profile: {
        id: 'safe_batch_expansion_structure_repair:663',
        source_run_id: 663,
        latest_status: 'passed',
        validation_batch_count: 1,
        passed_batch_count: 1,
        failed_batch_count: 0,
        pass_streak: 1,
      },
      template_version_profiles: expect.arrayContaining([
        expect.objectContaining({
          id: 'safe_batch_expansion_structure_repair:663',
          status: 'observing',
          validation_batch_count: 1,
          passed_batch_count: 1,
          failed_batch_count: 0,
        }),
      ]),
    })
    expect(profile.summary).toContain('版本 safe_batch_expansion_structure_repair:663')
  })

  test('marks production relapse dimensions in default lane template validation verdicts', () => {
    const validationChapterNos = [114, 115, 116]
    const productionRelapseChapterNos = [109, 110, 111, 112, 113]
    const versionedTemplate = {
      visible: true,
      status: 'fulfilled',
      label: '默认档位模板生产复发重构',
      source: 'safe_batch_expansion_structure_repair',
      redesign_source: 'default_five_chapter_lane_template_redesign_queue',
      source_run_id: 684,
      template_version_id: 'safe_batch_expansion_structure_repair:668',
      summary: '默认档位模板版本 safe_batch_expansion_structure_repair:668 在真实5章生产复发，已按生产后验重构。',
      production_relapse_count: 1,
      production_relapse_review: {
        template_version_id: 'safe_batch_expansion_structure_repair:668',
        default_batch_chapter_nos: productionRelapseChapterNos,
        restore_chapter_nos: [104, 105, 106, 107, 108],
        validation_chapter_nos: [96, 97, 98],
        failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
        failed_requirements: [
          { key: 'default_lane_segment_duty', label: '默认档位段位职责', failure_reason: '核心偏移' },
          { key: 'default_lane_payoff_density', label: '回报密度', failure_reason: '回报欠账' },
          { key: 'default_lane_ending_hook_template', label: '章末追读模板', failure_reason: '追读拉力' },
        ],
      },
      redesigned_templates: [
        { key: 'default_lane_segment_duty', label: '默认档位段位职责', template: '生产后验新模板：每章先标明本章在默认5章中的职责，并用主线选择压住核心。' },
        { key: 'default_lane_payoff_density', label: '回报密度', template: '生产后验新模板：每章必须落一个可见收益、反制结果或阶段结算。' },
        { key: 'default_lane_ending_hook_template', label: '章末追读模板', template: '生产后验新模板：最后300字必须留下新的风险问题和下一章必看理由。' },
      ],
      required_receipts: [
        'default_lane_segment_duty_delivered',
        'default_lane_conflict_rotation_delivered',
        'default_lane_payoff_density_delivered',
        'default_lane_ending_hook_template_delivered',
      ],
      requirements: [
        { key: 'default_lane_segment_duty', label: '默认档位段位职责', status: 'fulfilled' },
        { key: 'default_lane_conflict_rotation', label: '冲突轮换', status: 'fulfilled' },
        { key: 'default_lane_payoff_density', label: '回报密度', status: 'fulfilled' },
        { key: 'default_lane_ending_hook_template', label: '章末追读模板', status: 'fulfilled' },
      ],
    }
    const model = buildAutoCreationDirectorModel({
      planning: readySafeBatchPlanning({ futureRoute: futureRouteRange(117, 5) }),
      writing: readySafeBatchWriting({
        nextChapter: { ...baseWriting.nextChapter, id: 117, chapterNo: 117, title: '生产后验验证后117' },
        previousChapter: { chapterNo: 116, title: '生产后验验证116', wordCount: 3200, hasProse: true },
      }),
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 116 },
      chapters: [
        ...[41, 42, 43, 44, 45, 46, 47, 48, 49].map(chapterNo => ({
          id: chapterNo,
          chapter_no: chapterNo,
          title: `强化趋势${chapterNo}`,
          chapter_text: '强化趋势正文'.repeat(500),
        })),
        ...validationChapterNos.map(chapterNo => ({
          id: chapterNo,
          chapter_no: chapterNo,
          title: `生产后验验证${chapterNo}`,
          chapter_text: '生产后验验证正文'.repeat(500),
          raw_payload: {
            generated_scene_breakdown: [{
              expansion_structure_decision_execution: {
                segment_role_delivered: true,
                observation_metrics_delivered: true,
                redesign_principles_delivered: true,
                default_lane_segment_duty_delivered: true,
                default_lane_conflict_rotation_delivered: true,
                default_lane_payoff_density_delivered: true,
                default_lane_ending_hook_template_delivered: true,
                evidence: [`第${chapterNo}章默认档位模板生产后验回执。`],
              },
            }],
          },
        })),
      ],
      reviews: [
        ...strengthenedAcceptanceQualityReviews([41, 42, 43], 6841, '2026-06-27T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([44, 45, 46], 6851, '2026-06-28T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([47, 48, 49], 6861, '2026-06-29T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews(validationChapterNos, 6871, '2026-06-30T01:00:00.000Z'),
        {
          id: 6874,
          chapter_id: 114,
          review_type: 'chapter_core_drift',
          created_at: '2026-06-30T01:10:00.000Z',
          payload: JSON.stringify({ chapter_core_drift: { status: 'warn', drift_risks: ['生产后验验证仍偏离主线承诺'] } }),
        },
        {
          id: 6875,
          chapter_id: 115,
          review_type: 'reader_payoff_sync',
          created_at: '2026-06-30T01:11:00.000Z',
          payload: JSON.stringify({ reader_payoff_sync: { status: 'warn', debt_count: 1, missed: ['生产后验验证仍有显性回报欠账'] } }),
        },
        {
          id: 6876,
          chapter_id: 116,
          review_type: 'reader_retention_sync',
          created_at: '2026-06-30T01:12:00.000Z',
          payload: JSON.stringify({ reader_retention_sync: { status: 'warn', missed_count: 1, missed: ['生产后验验证章末追读仍失效'] } }),
        },
      ],
      runRecords: [
        strengthenedAcceptanceBatchRun({ id: 684, createdAt: '2026-06-27T00:00:00.000Z', chapterNos: [41, 42, 43] }),
        strengthenedAcceptanceBatchRun({ id: 685, createdAt: '2026-06-28T00:00:00.000Z', chapterNos: [44, 45, 46] }),
        strengthenedAcceptanceBatchRun({ id: 686, createdAt: '2026-06-29T00:00:00.000Z', chapterNos: [47, 48, 49] }),
        defaultLaneTemplateValidationBatchRun({
          id: 687,
          createdAt: '2026-06-30T00:00:00.000Z',
          chapterNos: validationChapterNos,
          template: versionedTemplate,
        }),
      ],
    } as any)

    const policy = model.batchGuardrail.preflight.inputSnapshot.safe_batch_expansion_policy
    const validationResult = policy.expansion_feedback.expansion_structure_validation_result
    const verdict = validationResult.default_five_chapter_lane_template_verdict
    const profile = policy.expansion_feedback.default_five_chapter_lane_template_stability_profile
    const structureTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'safe_batch_expansion_structure_repair')

    expect(verdict).toMatchObject({
      status: 'failed',
      missing_count: 0,
      production_failed_count: 3,
      production_relapse_verdict: {
        status: 'failed',
        template_version_id: 'safe_batch_expansion_structure_repair:668',
        default_batch_chapter_nos: productionRelapseChapterNos,
        validation_chapter_nos: validationChapterNos,
      },
    })
    const productionRelapseVerdict = verdict.production_relapse_verdict
    expect(productionRelapseVerdict.remaining_failure_reasons).toContain('核心偏移')
    expect(productionRelapseVerdict.remaining_failure_reasons).toContain('回报欠账')
    expect(productionRelapseVerdict.remaining_failure_reasons).toContain('追读拉力')
    expect(productionRelapseVerdict.failed_requirements.some((item: any) => item.key === 'default_lane_segment_duty' && item.failure_reason === '核心偏移')).toBe(true)
    expect(productionRelapseVerdict.failed_requirements.some((item: any) => item.key === 'default_lane_payoff_density' && item.failure_reason === '回报欠账')).toBe(true)
    expect(productionRelapseVerdict.failed_requirements.some((item: any) => item.key === 'default_lane_ending_hook_template' && item.failure_reason === '追读拉力')).toBe(true)
    expect(verdict.summary).toContain('生产后验仍复发')
    expect(verdict.summary).toContain('核心偏移、回报欠账、追读拉力')
    const latestTemplateVersionProfile = profile.latest_template_version_profile
    expect(latestTemplateVersionProfile).toMatchObject({
      id: 'safe_batch_expansion_structure_repair:668',
      status: 'relapsed',
      production_validation_failed_count: 1,
    })
    expect(latestTemplateVersionProfile.latest_production_relapse_verdict).toMatchObject({
      status: 'failed',
    })
    expect(latestTemplateVersionProfile.latest_production_relapse_verdict.remaining_failure_reasons)
      .toContain('核心偏移')
    expect(latestTemplateVersionProfile.latest_production_relapse_verdict.remaining_failure_reasons)
      .toContain('回报欠账')
    expect(latestTemplateVersionProfile.latest_production_relapse_verdict.remaining_failure_reasons)
      .toContain('追读拉力')
    const templateVersionRoadmapNode = policy.safe_batch_recovery_roadmap.route_nodes.find((node: any) => node.key === 'default_lane_template_version')
    expect(templateVersionRoadmapNode.detail).toContain('生产后验仍复发')
    expect(policy.safe_batch_recovery_roadmap.next_repair_layer).toMatchObject({
      key: 'default_lane_template_version',
      action_label: '修生产后验',
      focus: {
        task_center_filter_label: '生产后验仍复发',
        requirement_key: 'default_lane_template',
        template_version_id: 'safe_batch_expansion_structure_repair:668',
      },
    })
    const templateRepair = structureTask?.safe_batch_expansion_structure_review.default_five_chapter_lane_template_repair
    expect(templateRepair).toMatchObject({
      production_relapse_verdict: {
        status: 'failed',
        template_version_id: 'safe_batch_expansion_structure_repair:668',
      },
    })
    expect(templateRepair.production_failed_requirements.some((item: any) => item.key === 'default_lane_payoff_density' && item.failure_reason === '回报欠账')).toBe(true)
  })

  test('passes production relapse verdict when validation clears production failure dimensions', () => {
    const validationChapterNos = [124, 125, 126]
    const productionRelapseChapterNos = [119, 120, 121, 122, 123]
    const versionedTemplate = {
      visible: true,
      status: 'fulfilled',
      label: '默认档位模板生产复发重构',
      source: 'safe_batch_expansion_structure_repair',
      redesign_source: 'default_five_chapter_lane_template_redesign_queue',
      source_run_id: 694,
      template_version_id: 'safe_batch_expansion_structure_repair:694',
      summary: '默认档位模板版本 safe_batch_expansion_structure_repair:694 在真实5章生产复发，已按生产后验重构。',
      production_relapse_review: {
        template_version_id: 'safe_batch_expansion_structure_repair:694',
        default_batch_chapter_nos: productionRelapseChapterNos,
        restore_chapter_nos: [114, 115, 116, 117, 118],
        validation_chapter_nos: [106, 107, 108],
        failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
        failed_requirements: [
          { key: 'default_lane_segment_duty', label: '默认档位段位职责', failure_reason: '核心偏移' },
          { key: 'default_lane_payoff_density', label: '回报密度', failure_reason: '回报欠账' },
          { key: 'default_lane_ending_hook_template', label: '章末追读模板', failure_reason: '追读拉力' },
        ],
      },
      requirements: [
        { key: 'default_lane_segment_duty', label: '默认档位段位职责', status: 'fulfilled' },
        { key: 'default_lane_conflict_rotation', label: '冲突轮换', status: 'fulfilled' },
        { key: 'default_lane_payoff_density', label: '回报密度', status: 'fulfilled' },
        { key: 'default_lane_ending_hook_template', label: '章末追读模板', status: 'fulfilled' },
      ],
    }
    const model = buildAutoCreationDirectorModel({
      planning: readySafeBatchPlanning({ futureRoute: futureRouteRange(127, 5) }),
      writing: readySafeBatchWriting({
        nextChapter: { ...baseWriting.nextChapter, id: 127, chapterNo: 127, title: '生产后验通过后127' },
        previousChapter: { chapterNo: 126, title: '生产后验通过126', wordCount: 3200, hasProse: true },
      }),
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 126 },
      chapters: [
        ...[41, 42, 43, 44, 45, 46, 47, 48, 49].map(chapterNo => ({
          id: chapterNo,
          chapter_no: chapterNo,
          title: `强化趋势${chapterNo}`,
          chapter_text: '强化趋势正文'.repeat(500),
        })),
        ...validationChapterNos.map(chapterNo => ({
          id: chapterNo,
          chapter_no: chapterNo,
          title: `生产后验通过${chapterNo}`,
          chapter_text: '生产后验通过正文'.repeat(500),
          raw_payload: {
            generated_scene_breakdown: [{
              expansion_structure_decision_execution: {
                segment_role_delivered: true,
                observation_metrics_delivered: true,
                redesign_principles_delivered: true,
                default_lane_segment_duty_delivered: true,
                default_lane_conflict_rotation_delivered: true,
                default_lane_payoff_density_delivered: true,
                default_lane_ending_hook_template_delivered: true,
                evidence: [`第${chapterNo}章默认档位模板生产后验已修复。`],
              },
            }],
          },
        })),
      ],
      reviews: [
        ...strengthenedAcceptanceQualityReviews([41, 42, 43], 6941, '2026-07-01T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([44, 45, 46], 6951, '2026-07-02T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([47, 48, 49], 6961, '2026-07-03T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews(validationChapterNos, 6971, '2026-07-04T01:00:00.000Z'),
      ],
      runRecords: [
        strengthenedAcceptanceBatchRun({ id: 694, createdAt: '2026-07-01T00:00:00.000Z', chapterNos: [41, 42, 43] }),
        strengthenedAcceptanceBatchRun({ id: 695, createdAt: '2026-07-02T00:00:00.000Z', chapterNos: [44, 45, 46] }),
        strengthenedAcceptanceBatchRun({ id: 696, createdAt: '2026-07-03T00:00:00.000Z', chapterNos: [47, 48, 49] }),
        defaultLaneTemplateValidationBatchRun({
          id: 697,
          createdAt: '2026-07-04T00:00:00.000Z',
          chapterNos: validationChapterNos,
          template: versionedTemplate,
        }),
      ],
    } as any)

    const policy = model.batchGuardrail.preflight.inputSnapshot.safe_batch_expansion_policy
    const verdict = policy.expansion_feedback.expansion_structure_validation_result.default_five_chapter_lane_template_verdict

    expect(verdict).toMatchObject({
      status: 'passed',
      production_failed_count: 0,
      production_relapse_verdict: {
        status: 'passed',
        template_version_id: 'safe_batch_expansion_structure_repair:694',
        default_batch_chapter_nos: productionRelapseChapterNos,
        validation_chapter_nos: validationChapterNos,
        remaining_failure_reasons: [],
      },
    })
    expect(verdict.production_relapse_verdict.cleared_failure_reasons).toContain('核心偏移')
    expect(verdict.production_relapse_verdict.cleared_failure_reasons).toContain('回报欠账')
    expect(verdict.production_relapse_verdict.cleared_failure_reasons).toContain('追读拉力')
    expect(verdict.summary).toContain('生产后验已修复')
    const templateVersionRoadmapNode = policy.safe_batch_recovery_roadmap.route_nodes.find((node: any) => node.key === 'default_lane_template_version')
    expect(templateVersionRoadmapNode.detail).toContain('生产后验已修复')
  })

  test('routes passed production relapse validation to a single five-chapter observation command on the director front page', () => {
    const validationChapterNos = [124, 125, 126]
    const productionRelapseChapterNos = [119, 120, 121, 122, 123]
    const versionedTemplate = {
      visible: true,
      status: 'fulfilled',
      label: '默认档位模板生产复发重构',
      source: 'safe_batch_expansion_structure_repair',
      redesign_source: 'default_five_chapter_lane_template_redesign_queue',
      source_run_id: 704,
      template_version_id: 'safe_batch_expansion_structure_repair:704',
      summary: '默认档位模板版本 safe_batch_expansion_structure_repair:704 在真实5章生产复发，已按生产后验重构。',
      production_relapse_review: {
        template_version_id: 'safe_batch_expansion_structure_repair:704',
        default_batch_chapter_nos: productionRelapseChapterNos,
        restore_chapter_nos: [114, 115, 116, 117, 118],
        validation_chapter_nos: [106, 107, 108],
        failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
        failed_requirements: [
          { key: 'default_lane_segment_duty', label: '默认档位段位职责', failure_reason: '核心偏移' },
          { key: 'default_lane_payoff_density', label: '回报密度', failure_reason: '回报欠账' },
          { key: 'default_lane_ending_hook_template', label: '章末追读模板', failure_reason: '追读拉力' },
        ],
      },
      requirements: [
        { key: 'default_lane_segment_duty', label: '默认档位段位职责', status: 'fulfilled' },
        { key: 'default_lane_conflict_rotation', label: '冲突轮换', status: 'fulfilled' },
        { key: 'default_lane_payoff_density', label: '回报密度', status: 'fulfilled' },
        { key: 'default_lane_ending_hook_template', label: '章末追读模板', status: 'fulfilled' },
      ],
    }
    const model = buildAutoCreationDirectorModel({
      planning: readySafeBatchPlanning({ futureRoute: futureRouteRange(127, 5) }),
      writing: readySafeBatchWriting({
        nextChapter: { ...baseWriting.nextChapter, id: 127, chapterNo: 127, title: '生产后验通过后127' },
        previousChapter: { chapterNo: 126, title: '生产后验通过126', wordCount: 3200, hasProse: true },
      }),
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 126 },
      chapters: [
        ...[41, 42, 43, 44, 45, 46, 47, 48, 49].map(chapterNo => ({
          id: chapterNo,
          chapter_no: chapterNo,
          title: `强化趋势${chapterNo}`,
          chapter_text: '强化趋势正文'.repeat(500),
        })),
        ...validationChapterNos.map(chapterNo => ({
          id: chapterNo,
          chapter_no: chapterNo,
          title: `生产后验通过${chapterNo}`,
          chapter_text: '生产后验通过正文'.repeat(500),
          raw_payload: {
            generated_scene_breakdown: [{
              expansion_structure_decision_execution: {
                segment_role_delivered: true,
                observation_metrics_delivered: true,
                redesign_principles_delivered: true,
                default_lane_segment_duty_delivered: true,
                default_lane_conflict_rotation_delivered: true,
                default_lane_payoff_density_delivered: true,
                default_lane_ending_hook_template_delivered: true,
                evidence: [`第${chapterNo}章默认档位模板生产后验已修复。`],
              },
            }],
          },
        })),
      ],
      reviews: [
        ...strengthenedAcceptanceQualityReviews([41, 42, 43], 7041, '2026-07-01T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([44, 45, 46], 7051, '2026-07-02T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([47, 48, 49], 7061, '2026-07-03T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews(validationChapterNos, 7071, '2026-07-04T01:00:00.000Z'),
      ],
      runRecords: [
        strengthenedAcceptanceBatchRun({ id: 704, createdAt: '2026-07-01T00:00:00.000Z', chapterNos: [41, 42, 43] }),
        strengthenedAcceptanceBatchRun({ id: 705, createdAt: '2026-07-02T00:00:00.000Z', chapterNos: [44, 45, 46] }),
        strengthenedAcceptanceBatchRun({ id: 706, createdAt: '2026-07-03T00:00:00.000Z', chapterNos: [47, 48, 49] }),
        defaultLaneTemplateValidationBatchRun({
          id: 707,
          createdAt: '2026-07-04T00:00:00.000Z',
          chapterNos: validationChapterNos,
          template: versionedTemplate,
        }),
      ],
    } as any)

    expect(model.batchGuardrail.recommendedAction).toMatchObject({
      key: 'start_safe_batch_generation',
      label: '进入5章观察批',
      payload: {
        source: 'safe_batch_production_relapse_review_cta',
        safety_limit: 5,
        production_relapse_review_cta: {
          kind: 'enter_five_chapter_observation',
          label: '进入5章观察批',
          remaining_failure_reasons: [],
          cleared_failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
        },
      },
    })
    expect(model.batchGuardrail.recommendedAction.payload?.production_relapse_cta_execution).toMatchObject({
      source: 'safe_batch_production_relapse_review_cta',
      kind: 'enter_five_chapter_observation',
      label: '进入5章观察批',
      template_version_id: 'safe_batch_expansion_structure_repair:704',
      cleared_failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
      remaining_failure_reasons: [],
      target_chapter_count: 5,
    })
    expect(model.batchGuardrail.recommendedAction.payload?.batch_preflight?.production_relapse_cta_execution).toMatchObject({
      source: 'safe_batch_production_relapse_review_cta',
      template_version_id: 'safe_batch_expansion_structure_repair:704',
      cleared_failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
      remaining_failure_reasons: [],
    })
    expect(model.productionLicense.modeLabel).toBe('5章观察批')
    expect(model.productionLicense.summary).toContain('生产后验已修复')
    expect(model.productionLicense.summary).toContain('5章观察')
    expect(model.todayCommandDeck.actionLabel).toBe('进入5章观察批')
    expect(model.todayCommandDeck.summary).toContain('生产后验已修复')
    expect(model.todayCommandDeck.releaseRationale.primaryReason).toContain('5章观察')
  })

  test('routes failed production relapse validation to a single repair command on the director front page', () => {
    const validationChapterNos = [134, 135, 136]
    const productionRelapseChapterNos = [129, 130, 131, 132, 133]
    const versionedTemplate = {
      visible: true,
      status: 'fulfilled',
      label: '默认档位模板生产复发重构',
      source: 'safe_batch_expansion_structure_repair',
      redesign_source: 'default_five_chapter_lane_template_redesign_queue',
      source_run_id: 714,
      template_version_id: 'safe_batch_expansion_structure_repair:714',
      summary: '默认档位模板版本 safe_batch_expansion_structure_repair:714 在真实5章生产复发，已按生产后验重构。',
      production_relapse_review: {
        template_version_id: 'safe_batch_expansion_structure_repair:714',
        default_batch_chapter_nos: productionRelapseChapterNos,
        restore_chapter_nos: [124, 125, 126, 127, 128],
        validation_chapter_nos: [116, 117, 118],
        failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
        failed_requirements: [
          { key: 'default_lane_segment_duty', label: '默认档位段位职责', failure_reason: '核心偏移' },
          { key: 'default_lane_payoff_density', label: '回报密度', failure_reason: '回报欠账' },
          { key: 'default_lane_ending_hook_template', label: '章末追读模板', failure_reason: '追读拉力' },
        ],
      },
      requirements: [
        { key: 'default_lane_segment_duty', label: '默认档位段位职责', status: 'fulfilled' },
        { key: 'default_lane_conflict_rotation', label: '冲突轮换', status: 'fulfilled' },
        { key: 'default_lane_payoff_density', label: '回报密度', status: 'fulfilled' },
        { key: 'default_lane_ending_hook_template', label: '章末追读模板', status: 'fulfilled' },
      ],
    }
    const model = buildAutoCreationDirectorModel({
      planning: readySafeBatchPlanning({ futureRoute: futureRouteRange(137, 5) }),
      writing: readySafeBatchWriting({
        nextChapter: { ...baseWriting.nextChapter, id: 137, chapterNo: 137, title: '生产后验失败后137' },
        previousChapter: { chapterNo: 136, title: '生产后验失败136', wordCount: 3200, hasProse: true },
      }),
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 136 },
      chapters: [
        ...[41, 42, 43, 44, 45, 46, 47, 48, 49].map(chapterNo => ({
          id: chapterNo,
          chapter_no: chapterNo,
          title: `强化趋势${chapterNo}`,
          chapter_text: '强化趋势正文'.repeat(500),
        })),
        ...validationChapterNos.map(chapterNo => ({
          id: chapterNo,
          chapter_no: chapterNo,
          title: `生产后验失败${chapterNo}`,
          chapter_text: '生产后验失败正文'.repeat(500),
          raw_payload: {
            generated_scene_breakdown: [{
              expansion_structure_decision_execution: {
                segment_role_delivered: true,
                observation_metrics_delivered: true,
                redesign_principles_delivered: true,
                default_lane_segment_duty_delivered: true,
                default_lane_conflict_rotation_delivered: true,
                default_lane_payoff_density_delivered: true,
                default_lane_ending_hook_template_delivered: true,
                evidence: [`第${chapterNo}章默认档位模板生产后验仍需复盘。`],
              },
            }],
          },
        })),
      ],
      reviews: [
        ...strengthenedAcceptanceQualityReviews([41, 42, 43], 7141, '2026-07-05T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([44, 45, 46], 7151, '2026-07-06T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([47, 48, 49], 7161, '2026-07-07T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews(validationChapterNos, 7171, '2026-07-08T01:00:00.000Z'),
        {
          id: 7174,
          chapter_id: 135,
          review_type: 'reader_payoff_sync',
          created_at: '2026-07-08T01:11:00.000Z',
          payload: JSON.stringify({ reader_payoff_sync: { status: 'warn', debt_count: 1, missed: ['生产后验验证仍有显性回报欠账'] } }),
        },
      ],
      runRecords: [
        strengthenedAcceptanceBatchRun({ id: 714, createdAt: '2026-07-05T00:00:00.000Z', chapterNos: [41, 42, 43] }),
        strengthenedAcceptanceBatchRun({ id: 715, createdAt: '2026-07-06T00:00:00.000Z', chapterNos: [44, 45, 46] }),
        strengthenedAcceptanceBatchRun({ id: 716, createdAt: '2026-07-07T00:00:00.000Z', chapterNos: [47, 48, 49] }),
        defaultLaneTemplateValidationBatchRun({
          id: 717,
          createdAt: '2026-07-08T00:00:00.000Z',
          chapterNos: validationChapterNos,
          template: versionedTemplate,
        }),
      ],
    } as any)

    expect(model.batchGuardrail.recommendedAction).toMatchObject({
      key: 'open_task_center',
      label: '修生产后验',
      payload: {
        source: 'safe_batch_production_relapse_review_cta',
        production_relapse_review_cta: {
          kind: 'repair_production_relapse',
          label: '修生产后验',
          remaining_failure_reasons: ['回报欠账'],
        },
      },
    })
    expect(model.productionLicense.modeLabel).toBe('生产后验待修')
    expect(model.productionLicense.summary).toContain('回报欠账')
    expect(model.productionLicense.summary).not.toContain('核心偏移')
    expect(model.productionLicense.summary).not.toContain('追读拉力')
    expect(model.todayCommandDeck.actionLabel).toBe('修生产后验')
    expect(model.todayCommandDeck.summary).toContain('回报欠账')
    expect(model.todayCommandDeck.summary).not.toContain('核心偏移')
  })

  test('accumulates default lane template verdicts into a stability profile', () => {
    const failedValidationChapterNos = [90, 91, 92]
    const passedValidationChapterNos = [93, 94, 95]
    const chapterWithTemplateReceipts = (chapterNo: number, payoffDelivered = true) => ({
      id: chapterNo,
      chapter_no: chapterNo,
      title: `模板稳定${chapterNo}`,
      chapter_text: '模板稳定正文'.repeat(500),
      raw_payload: {
        generated_scene_breakdown: [{
          expansion_structure_decision_execution: {
            segment_role_delivered: true,
            observation_metrics_delivered: true,
            redesign_principles_delivered: true,
            default_lane_segment_duty_delivered: true,
            default_lane_conflict_rotation_delivered: true,
            default_lane_payoff_density_delivered: payoffDelivered,
            default_lane_ending_hook_template_delivered: true,
            evidence: [`第${chapterNo}章默认档位模板回执。`],
          },
        }],
      },
    })
    const model = buildAutoCreationDirectorModel({
      planning: readySafeBatchPlanning({ futureRoute: futureRouteRange(96, 5) }),
      writing: readySafeBatchWriting({
        nextChapter: { ...baseWriting.nextChapter, id: 96, chapterNo: 96, title: '模板稳定后96' },
        previousChapter: { chapterNo: 95, title: '模板稳定95', wordCount: 3200, hasProse: true },
      }),
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 95 },
      chapters: [
        ...[41, 42, 43, 44, 45, 46, 47, 48, 49].map(chapterNo => ({
          id: chapterNo,
          chapter_no: chapterNo,
          title: `强化趋势${chapterNo}`,
          chapter_text: '强化趋势正文'.repeat(500),
        })),
        ...failedValidationChapterNos.map(chapterNo => chapterWithTemplateReceipts(chapterNo, chapterNo !== 91)),
        ...passedValidationChapterNos.map(chapterNo => chapterWithTemplateReceipts(chapterNo, true)),
      ],
      reviews: [
        ...strengthenedAcceptanceQualityReviews([41, 42, 43], 6501, '2026-06-19T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([44, 45, 46], 6511, '2026-06-20T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([47, 48, 49], 6521, '2026-06-21T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews(failedValidationChapterNos, 6531, '2026-06-22T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews(passedValidationChapterNos, 6541, '2026-06-23T01:00:00.000Z'),
      ],
      runRecords: [
        strengthenedAcceptanceBatchRun({ id: 650, createdAt: '2026-06-19T00:00:00.000Z', chapterNos: [41, 42, 43] }),
        strengthenedAcceptanceBatchRun({ id: 651, createdAt: '2026-06-20T00:00:00.000Z', chapterNos: [44, 45, 46] }),
        strengthenedAcceptanceBatchRun({ id: 652, createdAt: '2026-06-21T00:00:00.000Z', chapterNos: [47, 48, 49] }),
        defaultLaneTemplateValidationBatchRun({
          id: 653,
          createdAt: '2026-06-22T00:00:00.000Z',
          chapterNos: failedValidationChapterNos,
        }),
        defaultLaneTemplateValidationBatchRun({
          id: 654,
          createdAt: '2026-06-23T00:00:00.000Z',
          chapterNos: passedValidationChapterNos,
        }),
      ],
    } as any)

    const policy = model.batchGuardrail.preflight.inputSnapshot.safe_batch_expansion_policy
    const profile = policy.expansion_feedback.default_five_chapter_lane_template_stability_profile

    expect(profile).toMatchObject({
      visible: true,
      status: 'observing',
      label: '默认档位模板稳定性',
      latest_status: 'passed',
      validation_batch_count: 2,
      passed_batch_count: 1,
      failed_batch_count: 1,
      pass_streak: 1,
      required_pass_streak: 2,
      recommendation: 'continue_validation',
      latest_chapter_nos: passedValidationChapterNos,
      failed_requirement_count: 1,
      requirements: expect.arrayContaining([
        expect.objectContaining({
          key: 'default_lane_payoff_density',
          label: '回报密度',
          passed_count: 1,
          failed_count: 1,
          latest_status: 'fulfilled',
        }),
      ]),
    })
    expect(profile.summary).toContain('继续3章观察')
    expect(profile.summary).toContain('回报密度')
    expect(policy).toMatchObject({
      status: 'recovering',
      target_chapter_count: 3,
    })
    expect(model.batchGuardrail.safeChapterCount).toBe(3)
    expect(model.batchGuardrail.recommendedAction.label).toBe('启动3章验证批')
  })

  test('turns repeated default lane template stability failures into a redesign queue', () => {
    const firstValidationChapterNos = [90, 91, 92]
    const secondValidationChapterNos = [93, 94, 95]
    const chapterWithTemplateReceipts = (chapterNo: number, payoffDelivered = true) => ({
      id: chapterNo,
      chapter_no: chapterNo,
      title: `模板重构${chapterNo}`,
      chapter_text: '模板重构正文'.repeat(500),
      raw_payload: {
        generated_scene_breakdown: [{
          expansion_structure_decision_execution: {
            segment_role_delivered: true,
            observation_metrics_delivered: true,
            redesign_principles_delivered: true,
            default_lane_segment_duty_delivered: true,
            default_lane_conflict_rotation_delivered: true,
            default_lane_payoff_density_delivered: payoffDelivered,
            default_lane_ending_hook_template_delivered: true,
            evidence: [`第${chapterNo}章默认档位模板回执。`],
          },
        }],
      },
    })
    const model = buildAutoCreationDirectorModel({
      planning: readySafeBatchPlanning({ futureRoute: futureRouteRange(96, 5) }),
      writing: readySafeBatchWriting({
        nextChapter: { ...baseWriting.nextChapter, id: 96, chapterNo: 96, title: '模板重构后96' },
        previousChapter: { chapterNo: 95, title: '模板重构95', wordCount: 3200, hasProse: true },
      }),
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 95 },
      chapters: [
        ...[41, 42, 43, 44, 45, 46, 47, 48, 49].map(chapterNo => ({
          id: chapterNo,
          chapter_no: chapterNo,
          title: `强化趋势${chapterNo}`,
          chapter_text: '强化趋势正文'.repeat(500),
        })),
        ...firstValidationChapterNos.map(chapterNo => chapterWithTemplateReceipts(chapterNo, chapterNo !== 91)),
        ...secondValidationChapterNos.map(chapterNo => chapterWithTemplateReceipts(chapterNo, chapterNo !== 94)),
      ],
      reviews: [
        ...strengthenedAcceptanceQualityReviews([41, 42, 43], 6551, '2026-06-19T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([44, 45, 46], 6561, '2026-06-20T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([47, 48, 49], 6571, '2026-06-21T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews(firstValidationChapterNos, 6581, '2026-06-22T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews(secondValidationChapterNos, 6591, '2026-06-23T01:00:00.000Z'),
      ],
      runRecords: [
        strengthenedAcceptanceBatchRun({ id: 655, createdAt: '2026-06-19T00:00:00.000Z', chapterNos: [41, 42, 43] }),
        strengthenedAcceptanceBatchRun({ id: 656, createdAt: '2026-06-20T00:00:00.000Z', chapterNos: [44, 45, 46] }),
        strengthenedAcceptanceBatchRun({ id: 657, createdAt: '2026-06-21T00:00:00.000Z', chapterNos: [47, 48, 49] }),
        defaultLaneTemplateValidationBatchRun({
          id: 658,
          createdAt: '2026-06-22T00:00:00.000Z',
          chapterNos: firstValidationChapterNos,
        }),
        defaultLaneTemplateValidationBatchRun({
          id: 659,
          createdAt: '2026-06-23T00:00:00.000Z',
          chapterNos: secondValidationChapterNos,
        }),
      ],
    } as any)

    const policy = model.batchGuardrail.preflight.inputSnapshot.safe_batch_expansion_policy
    const profile = policy.expansion_feedback.default_five_chapter_lane_template_stability_profile
    const structureTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'safe_batch_expansion_structure_repair')

    expect(profile).toMatchObject({
      status: 'redesign',
      recommendation: 'escalate_template_redesign',
      latest_status: 'failed',
      pass_streak: 0,
      top_failed_requirement: expect.objectContaining({
        key: 'default_lane_payoff_density',
        label: '回报密度',
        failed_count: 2,
      }),
    })
    expect(policy).toMatchObject({
      status: 'recovering',
      target_chapter_count: 1,
      safe_batch_recovery_roadmap: {
        next_repair_layer: {
          key: 'default_lane_template_version',
          status: 'warn',
          action_label: '重构当前模板版本',
          focus: {
            requirement_key: 'default_lane_template',
            task_center_filter_label: '当前模板版本',
          },
        },
      },
    })
    expect(model.batchGuardrail.recommendedAction).toMatchObject({
      key: 'open_task_center',
      label: '重构当前模板版本',
      payload: {
        safeBatchRecoveryFocus: {
          layerKey: 'default_lane_template_version',
          requirementKey: 'default_lane_template',
          taskCenterFilterLabel: '当前模板版本',
        },
      },
    })
    expect(structureTask).toMatchObject({
      issue_type: 'safe_batch_expansion_structure_repair',
      message: expect.stringContaining('默认档位模板稳定性'),
      action: expect.stringContaining('升级默认档位模板重构'),
      safe_batch_expansion_structure_review: {
        default_five_chapter_lane_template_redesign_queue: {
          visible: true,
          status: 'redesign',
          source: 'default_five_chapter_lane_template_stability_profile',
          recommendation: 'escalate_template_redesign',
          top_failed_requirement: {
            key: 'default_lane_payoff_density',
            label: '回报密度',
            failed_count: 2,
          },
          redesign_requirements: expect.arrayContaining([
            expect.objectContaining({ key: 'default_lane_payoff_density', label: '回报密度' }),
          ]),
        },
      },
    })
    expect(structureTask?.safe_batch_expansion_structure_review.default_five_chapter_lane_template_redesign_queue.summary).toContain('回报密度失败 2 次')
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

  test('downgrades to structure redesign when repair effectiveness regresses', () => {
    const chapterNos = [41, 42, 43, 44, 45, 46, 47, 48, 49, 64, 65, 66]
    const model = buildAutoCreationDirectorModel({
      planning: readySafeBatchPlanning({ futureRoute: futureRouteRange(67, 5) }),
      writing: readySafeBatchWriting({
        nextChapter: { ...baseWriting.nextChapter, id: 67, chapterNo: 67, title: '结构重构67' },
        previousChapter: { chapterNo: 66, title: '结构重构66', wordCount: 3200, hasProse: true },
      }),
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 66 },
      chapters: chapterNos.map(chapterNo => ({
        id: chapterNo,
        chapter_no: chapterNo,
        title: `结构重构${chapterNo}`,
        chapter_text: '结构重构正文'.repeat(500),
      })),
      reviews: [
        ...strengthenedAcceptanceQualityReviews([41, 42, 43], 6341, '2026-06-14T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([44, 45, 46], 6351, '2026-06-15T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([47, 48, 49], 6361, '2026-06-16T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([64, 65, 66], 6371, '2026-06-17T01:00:00.000Z'),
        {
          id: 6381,
          chapter_id: 65,
          review_type: 'chapter_core_drift',
          created_at: '2026-06-17T01:10:00.000Z',
          payload: JSON.stringify({ chapter_core_drift: { status: 'warn', drift_risks: ['修复后中段仍偏离阵盘主线承诺'] } }),
        },
        {
          id: 6382,
          chapter_id: 66,
          review_type: 'reader_payoff_sync',
          created_at: '2026-06-17T01:11:00.000Z',
          payload: JSON.stringify({ reader_payoff_sync: { status: 'warn', debt_count: 1, missed: ['修复后中段回报仍没有显性兑现'] } }),
        },
        {
          id: 6383,
          chapter_id: 66,
          review_type: 'reader_retention_sync',
          created_at: '2026-06-17T01:12:00.000Z',
          payload: JSON.stringify({ reader_retention_sync: { status: 'warn', missed_count: 1, missed: ['修复后中段章末追读问题仍重复'] } }),
        },
      ],
      runRecords: [
        strengthenedAcceptanceBatchRun({ id: 635, createdAt: '2026-06-14T00:00:00.000Z', chapterNos: [41, 42, 43] }),
        strengthenedAcceptanceBatchRun({ id: 636, createdAt: '2026-06-15T00:00:00.000Z', chapterNos: [44, 45, 46] }),
        strengthenedAcceptanceBatchRun({ id: 637, createdAt: '2026-06-16T00:00:00.000Z', chapterNos: [47, 48, 49] }),
        {
          id: 638,
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
        expansionStructureValidationBatchRun({ id: 639, createdAt: '2026-06-17T00:00:00.000Z', chapterNos: [64, 65, 66] }),
      ],
    } as any)

    const policy = model.batchGuardrail.preflight.inputSnapshot.safe_batch_expansion_policy
    const effectiveness = policy.expansion_feedback.expansion_structure_repair_effectiveness

    expect(effectiveness).toMatchObject({
      status: 'warn',
      recommendation: 'escalate_structure_redesign',
      baseline_pass_rate: 67,
      current_pass_rate: 0,
      baseline_failure_reason_count: 3,
      current_failure_reason_count: 3,
    })
    expect(policy).toMatchObject({
      status: 'recovering',
      target_chapter_count: 1,
    })
    expect(policy.summary).toContain('结构修复有效性要求升级批次设计重构')
    expect(policy.summary).toContain('回到单章治理')
  })

  test('escalates default lane redesign after repeated recovery verdict relapse dimensions', () => {
    const validationChapterNos = [81, 82, 83]
    const restoreChapterNos = [76, 77, 78, 79, 80]
    const defaultLaneChapterNos = [84, 85, 86, 87, 88]
    const recoveryVerdict = {
      visible: true,
      status: 'passed',
      label: '默认档位恢复判定',
      summary: '默认档位恢复判定：核心偏移、回报欠账、追读拉力已清零。',
      default_batch_chapter_nos: [71, 72, 73, 74, 75],
      restore_chapter_nos: restoreChapterNos,
      previous_validation_chapter_nos: [68, 69, 70],
      validation_chapter_nos: validationChapterNos,
      failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
      cleared_failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
      remaining_failure_reasons: [],
      failure_reason_statuses: [
        { reason: '核心偏移', status: 'cleared', risk_count: 0 },
        { reason: '回报欠账', status: 'cleared', risk_count: 0 },
        { reason: '追读拉力', status: 'cleared', risk_count: 0 },
      ],
    }
    const model = buildAutoCreationDirectorModel({
      planning: readySafeBatchPlanning({ futureRoute: futureRouteRange(89, 5) }),
      writing: readySafeBatchWriting({
        nextChapter: { ...baseWriting.nextChapter, id: 89, chapterNo: 89, title: '默认档重构89' },
        previousChapter: { chapterNo: 88, title: '默认档重构88', wordCount: 3200, hasProse: true },
      }),
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 88 },
      chapters: [
        ...[41, 42, 43, 44, 45, 46, 47, 48, 49],
        ...validationChapterNos,
        ...defaultLaneChapterNos,
      ].map(chapterNo => ({
        id: chapterNo,
        chapter_no: chapterNo,
        title: `默认档重构${chapterNo}`,
        chapter_text: '默认档重构正文'.repeat(500),
      })),
      reviews: [
        ...strengthenedAcceptanceQualityReviews([41, 42, 43], 6391, '2026-06-19T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([44, 45, 46], 6401, '2026-06-20T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([47, 48, 49], 6411, '2026-06-21T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews(validationChapterNos, 6421, '2026-06-22T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews(defaultLaneChapterNos, 6431, '2026-06-23T01:00:00.000Z'),
        {
          id: 6441,
          chapter_id: 86,
          review_type: 'chapter_core_drift',
          created_at: '2026-06-23T01:10:00.000Z',
          payload: JSON.stringify({ chapter_core_drift: { status: 'warn', drift_risks: ['默认档恢复判定后中段核心再次偏移'] } }),
        },
        {
          id: 6442,
          chapter_id: 87,
          review_type: 'reader_payoff_sync',
          created_at: '2026-06-23T01:11:00.000Z',
          payload: JSON.stringify({ reader_payoff_sync: { status: 'warn', debt_count: 1, missed: ['默认档恢复判定后中段回报再次欠账'] } }),
        },
        {
          id: 6443,
          chapter_id: 87,
          review_type: 'reader_retention_sync',
          created_at: '2026-06-23T01:12:00.000Z',
          payload: JSON.stringify({ reader_retention_sync: { status: 'warn', missed_count: 1, missed: ['默认档恢复判定后中段追读再次失效'] } }),
        },
      ],
      runRecords: [
        strengthenedAcceptanceBatchRun({ id: 640, createdAt: '2026-06-19T00:00:00.000Z', chapterNos: [41, 42, 43] }),
        strengthenedAcceptanceBatchRun({ id: 641, createdAt: '2026-06-20T00:00:00.000Z', chapterNos: [44, 45, 46] }),
        strengthenedAcceptanceBatchRun({ id: 642, createdAt: '2026-06-21T00:00:00.000Z', chapterNos: [47, 48, 49] }),
        {
          id: 643,
          run_type: 'longform_production_repair',
          created_at: '2026-06-21T12:00:00.000Z',
          completed_at: '2026-06-21T12:30:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({ source: 'auto_creation_safe_batch_risk' }),
          output_ref: JSON.stringify({
            tasks: [{
              issue_type: 'safe_batch_expansion_structure_repair',
              task_status: 'resolved',
              chapter_no: 78,
              safe_batch_expansion_structure_review: {
                repeated_hotspot_segment: { key: 'middle', label: '中段', count: 1 },
                latest_chapter_nos: [76, 77, 78, 79, 80],
                affected_chapter_nos: [78, 79],
                default_five_chapter_recovery_verdict_relapse: {
                  visible: true,
                  status: 'relapsed',
                  label: '恢复判定失效',
                  relapsed_failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
                },
                expansion_structure_validation_trend: {
                  visible: true,
                  status: 'warn',
                  label: '扩批结构验证趋势',
                  summary: '中段验证通过率 100%（1/1批），恢复判定失效 1 次。',
                  segment_key: 'middle',
                  segment_label: '中段',
                  validation_batch_count: 1,
                  passed_batch_count: 1,
                  failed_batch_count: 0,
                  pass_rate: 100,
                  latest_status: 'ok',
                  latest_chapter_nos: [68, 69, 70],
                  failure_reasons: [],
                  recurrence_after_restore: {
                    visible: false,
                    interval_batch_count: 0,
                    interval_label: '恢复5章后暂无同段复发',
                    recurrence_chapter_nos: [],
                  },
                  default_five_chapter_recovery_verdict_relapse_trend: {
                    visible: true,
                    relapse_count: 1,
                    relapsed_failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
                    repeated_failure_reasons: [
                      { reason: '核心偏移', count: 1 },
                      { reason: '回报欠账', count: 1 },
                      { reason: '追读拉力', count: 1 },
                    ],
                    latest_relapse_chapter_nos: [76, 77, 78, 79, 80],
                    summary: '恢复判定失效 1 次：核心偏移、回报欠账、追读拉力。',
                  },
                },
              },
            }],
          }),
        },
        expansionStructureValidationBatchRun({
          id: 644,
          createdAt: '2026-06-22T00:00:00.000Z',
          chapterNos: validationChapterNos,
          source: 'safe_batch_recovery_validation_batch',
        }),
        defaultFiveChapterLaneBatchRun({
          id: 645,
          createdAt: '2026-06-23T00:00:00.000Z',
          chapterNos: defaultLaneChapterNos,
          restoreChapterNos,
          validationChapterNos,
          defaultFiveChapterRecoveryVerdict: recoveryVerdict,
        }),
      ],
    } as any)

    const policy = model.batchGuardrail.preflight.inputSnapshot.safe_batch_expansion_policy
    const effectiveness = policy.expansion_feedback.expansion_structure_repair_effectiveness
    const nextBatchBrief = model.batchGuardrail.nextBatchBrief

    expect(effectiveness).toMatchObject({
      status: 'warn',
      recommendation: 'escalate_structure_redesign',
      baseline_pass_rate: 100,
      current_pass_rate: 100,
      baseline_failure_reason_count: 0,
      current_failure_reason_count: 0,
      default_five_chapter_recovery_verdict_relapse_trend: {
        visible: true,
        baseline_relapse_count: 1,
        current_relapse_count: 1,
        repeated_relapse_count: 2,
        repeated_failure_reasons: [
          { reason: '核心偏移', count: 2 },
          { reason: '回报欠账', count: 2 },
          { reason: '追读拉力', count: 2 },
        ],
        recommendation: 'escalate_structure_redesign',
      },
    })
    expect(effectiveness.summary).toContain('连续 2 次恢复判定失效')
    expect(policy).toMatchObject({
      status: 'recovering',
      target_chapter_count: 1,
    })
    expect(policy.summary).toContain('默认档位结构重构')
    expect(nextBatchBrief.expansionStructureDecision).toMatchObject({
      visible: true,
      recommendation: 'escalate_structure_redesign',
      targetChapterCount: 1,
      defaultFiveChapterLaneRedesign: {
        reason: 'repeated_recovery_verdict_relapse',
        relapseCount: 2,
        repeatedFailureReasons: ['核心偏移', '回报欠账', '追读拉力'],
        segmentDutyRewrite: expect.stringContaining('段位职责'),
        conflictRotation: expect.stringContaining('冲突轮换'),
        payoffDensity: expect.stringContaining('回报密度'),
        endingHookTemplate: expect.stringContaining('章末追读模板'),
      },
    })
    expect(nextBatchBrief.expansionStructureDecision.instruction).toContain('默认 5 章档位')
    expect(nextBatchBrief.expansionStructureDecision.instruction).toContain('连续恢复判定失效')
    expect(nextBatchBrief.expansionStructureDecision.observationMetrics).toEqual(expect.arrayContaining([
      expect.stringContaining('恢复判定连续失效 2 次'),
      expect.stringContaining('核心偏移'),
      expect.stringContaining('回报欠账'),
      expect.stringContaining('追读拉力'),
    ]))
  })

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

  test('limits safe batching to consecutive ready writing queue chapters', () => {
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
          sceneCards: [{ title: '压迫升级', goal: '执事逼主角交阵盘' }],
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
          readyCount: 2,
          blockedCount: 1,
          draftedCount: 0,
          planRepair: {
            visible: true,
            label: '补齐队列计划',
            chapterCount: 1,
            missingCount: 2,
            chapterNos: [9],
            intent: { source: 'writing_queue_batch_plan_repair', chapter_nos: [9] },
          },
          items: [
            { id: 8, chapterNo: 8, title: '试炼前夜', sourceLabel: '滚动规划', status: 'ready_to_draft', statusLabel: '可开写', actionLabel: '开写', actionHint: '', missingPlanFields: [], missingPlanLabels: [], repairIntent: null, goal: '拿到资格', conflict: '执事阻拦', endingHook: '阵盘裂纹', wordCount: 0 },
            { id: 9, chapterNo: 9, title: '阵盘裂纹', sourceLabel: '滚动规划', status: 'needs_plan', statusLabel: '缺计划', actionLabel: '补计划', actionHint: '', missingPlanFields: ['conflict'], missingPlanLabels: ['核心冲突'], repairIntent: { source: 'writing_queue_plan_repair', chapter_no: 9 }, goal: '阵盘异常', conflict: '', endingHook: '内门关注', wordCount: 0 },
            { id: 10, chapterNo: 10, title: '外门震动', sourceLabel: '滚动规划', status: 'ready_to_draft', statusLabel: '可开写', actionLabel: '开写', actionHint: '', missingPlanFields: [], missingPlanLabels: [], repairIntent: null, goal: '宗门震动', conflict: '旧秩序压制', endingHook: '苛刻条件', wordCount: 0 },
          ],
        },
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.batchGuardrail.status).toBe('caution')
    expect(model.batchGuardrail.safeChapterCount).toBe(1)
    expect(model.batchGuardrail.guardrails.find(item => item.label === '写作队列放行')?.status).toBe('warn')
    expect(model.batchGuardrail.guardrails.find(item => item.label === '写作队列放行')?.detail).toContain('连续可写 1 章')
    expect(model.batchGuardrail.releaseWindow.allowedChapters.map(chapter => chapter.chapterNo)).toEqual([8])
    expect(model.batchGuardrail.releaseWindow.blockedChapters.map(chapter => chapter.chapterNo)).toEqual([9])
    expect(model.batchGuardrail.releaseWindow.blockedChapters[0]?.reason).toContain('缺计划')
    expect(model.batchGuardrail.releaseWindow.summary).toContain('第8章')
    expect(model.batchGuardrail.releaseWindow.summary).toContain('第9章')
    expect(model.batchGuardrail.preflight.visible).toBe(true)
    expect(model.batchGuardrail.preflight.status).toBe('caution')
    expect(model.batchGuardrail.preflight.allowedChapterNos).toEqual([8])
    expect(model.batchGuardrail.preflight.blockedChapterNos).toEqual([9])
    expect(model.batchGuardrail.preflight.warnings.join('；')).toContain('第9章')
    expect(model.batchGuardrail.preflight.inputSnapshot).toMatchObject({
      source: 'auto_creation_safe_batch_preflight',
      safe_chapter_count: 1,
      allowed_chapter_nos: [8],
      blocked_chapter_nos: [9],
      chapter_range_label: '第8章',
    })
    expect(model.batchGuardrail.nextBatchBrief.chapterRangeLabel).toBe('第8章')
    expect(model.batchGuardrail.recommendedAction.key).toBe('update_rolling_plan')
    expect(model.batchGuardrail.recommendedAction.payload?.source).toBe('writing_queue_batch_plan_repair')
  })

  test('downgrades safe batching when serial release inventory is below the buffer line', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        serialReleaseDesk: {
          status: 'needs_buffer',
          score: 60,
          label: '存稿不足',
          summary: '当前可发布 1 章，约 0 天，低于 3 天安全线。',
          dailyTargetChapters: 2,
          minBufferDays: 3,
          lastPublishedChapter: 7,
          publishableChapters: 1,
          bufferDays: 0,
          primaryAction: {
            key: 'enter_chapter_writing',
            label: '补存稿',
            reason: '当前可发布 1 章，约 0 天，低于最低 3 天存稿。',
          },
          pipeline: [],
          releaseWindow: [
            { chapterNo: 8, title: '试炼前夜', wordCount: 3100, status: 'publishable', riskTags: [] },
            { chapterNo: 9, title: '阵盘裂纹', wordCount: 0, status: 'drafting', riskTags: [] },
          ],
          riskChapters: [],
          nextActions: ['至少再完成 5 章，恢复 3 天安全垫。'],
        },
        futureRoute: [
          { chapterNo: 8, title: '试炼前夜', chapterTask: '主角拿到试炼资格', conflict: '执事设局阻拦', endingHook: '阵盘亮起第二道裂纹', mainlineProgress: '主角从被动挨压转为主动入局' },
          { chapterNo: 9, title: '阵盘裂纹', chapterTask: '阵盘异常暴露主角潜力', conflict: '同门围堵试探底牌', endingHook: '内门执事点名关注', mainlineProgress: '宗门高层第一次注意主角' },
          { chapterNo: 10, title: '外门震动', chapterTask: '试炼结果引发宗门震动', conflict: '旧秩序压制新晋黑马', endingHook: '内门招揽提出苛刻条件', mainlineProgress: '打开内门势力线' },
        ],
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

    expect(model.batchGuardrail.status).toBe('caution')
    expect(model.batchGuardrail.safeChapterCount).toBe(1)
    expect(model.batchGuardrail.guardrails.find(item => item.label === '连载库存')?.status).toBe('warn')
    expect(model.batchGuardrail.guardrails.find(item => item.label === '连载库存')?.detail).toContain('低于 3 天安全线')
    expect(model.productionLicense.status).toBe('single_chapter')
    expect(model.productionLicense.modeLabel).toBe('单章生产')
    expect(model.todayCommandDeck.qualityGates.find(item => item.key === 'serial_safety')?.status).toBe('warn')
    expect(model.todayCommandDeck.qualityGates.find(item => item.key === 'serial_safety')?.detail).toContain('低于 3 天安全线')
  })

  test('blocks safe batching when the serial release window contains chapters needing revision', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        serialReleaseDesk: {
          status: 'blocked',
          score: 48,
          label: '发布阻塞',
          summary: '发布窗口有 1 章存在风险，暂不建议直接发布。',
          dailyTargetChapters: 2,
          minBufferDays: 3,
          lastPublishedChapter: 7,
          publishableChapters: 2,
          bufferDays: 1,
          primaryAction: {
            key: 'open_quality_revision',
            label: '修复发布窗口',
            reason: '发布窗口内第 8 章存在质检风险，先修订再发。',
          },
          pipeline: [],
          releaseWindow: [
            { chapterNo: 8, title: '试炼前夜', wordCount: 3100, status: 'needs_revision', riskTags: ['读者拉力不足'] },
            { chapterNo: 9, title: '阵盘裂纹', wordCount: 3200, status: 'publishable', riskTags: [] },
          ],
          riskChapters: [
            { chapterNo: 8, title: '试炼前夜', riskTags: ['读者拉力不足'] },
          ],
          nextActions: ['先处理发布窗口内的质检风险，再恢复发稿节奏。'],
        },
        futureRoute: [
          { chapterNo: 8, title: '试炼前夜', chapterTask: '主角拿到试炼资格', conflict: '执事设局阻拦', endingHook: '阵盘亮起第二道裂纹', mainlineProgress: '主角从被动挨压转为主动入局' },
          { chapterNo: 9, title: '阵盘裂纹', chapterTask: '阵盘异常暴露主角潜力', conflict: '同门围堵试探底牌', endingHook: '内门执事点名关注', mainlineProgress: '宗门高层第一次注意主角' },
          { chapterNo: 10, title: '外门震动', chapterTask: '试炼结果引发宗门震动', conflict: '旧秩序压制新晋黑马', endingHook: '内门招揽提出苛刻条件', mainlineProgress: '打开内门势力线' },
        ],
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

    expect(model.batchGuardrail.status).toBe('blocked')
    expect(model.batchGuardrail.safeChapterCount).toBe(0)
    expect(model.batchGuardrail.guardrails.find(item => item.label === '连载库存')?.status).toBe('block')
    expect(model.batchGuardrail.guardrails.find(item => item.label === '连载库存')?.detail).toContain('发布窗口有 1 章存在风险')
    expect(model.batchGuardrail.recommendedAction.key).toBe('open_quality_revision')
    expect(model.productionLicense.status).toBe('blocked')
    expect(model.productionLicense.nextAction.key).toBe('open_quality_revision')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'batch_release')?.status).toBe('blocked')
  })

  test('downgrades safe batching when the next batch brief is too vague for multi-chapter production', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        futureRoute: [
          { chapterNo: 8, title: '试炼前夜' },
          { chapterNo: 9, title: '阵盘裂纹' },
          { chapterNo: 10, title: '外门震动' },
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
    })

    expect(model.batchGuardrail.status).toBe('caution')
    expect(model.batchGuardrail.safeChapterCount).toBe(1)
    expect(model.batchGuardrail.recommendedAction.key).toBe('update_rolling_plan')
    expect(model.batchGuardrail.recommendedAction.label).toBe('补齐批次任务书')
    expect(model.batchGuardrail.recommendedAction.modelCall).toBe(true)
    expect(model.batchGuardrail.guardrails.find(item => item.label === '批次任务书')?.status).toBe('warn')
    expect(model.batchGuardrail.guardrails.find(item => item.label === '批次任务书')?.detail).toContain('逐章职责')
    expect(model.batchGuardrail.nextBatchBrief.chapterRangeLabel).toBe('第8章')
    expect(model.batchGuardrail.nextBatchBrief.chapters.map(item => item.chapterNo)).toEqual([8])
    expect(model.batchGuardrail.summary).toContain('下一批任务书')
    expect(model.batchGuardrail.briefRepair.visible).toBe(true)
    expect(model.batchGuardrail.briefRepair.status).toBe('warn')
    expect(model.batchGuardrail.briefRepair.title).toBe('补齐下一批任务书')
    expect(model.batchGuardrail.briefRepair.action.label).toBe('补齐批次任务书')
    expect(model.batchGuardrail.briefRepair.action.payload?.source).toBe('batch_brief_repair')
    expect(model.batchGuardrail.briefRepair.action.payload?.missing_items).toContain('缺逐章职责：第9章、第10章')
    expect(model.batchGuardrail.briefRepair.action.payload?.next_batch_brief?.chapterRangeLabel).toBe('第8-10章')
    expect(model.batchGuardrail.briefRepair.missingItems).toEqual([
      '缺逐章职责：第9章、第10章',
      '缺冲突落点：第9章、第10章',
      '缺章末钩子：第9章、第10章',
      '缺主线推进：第9章、第10章',
    ])
    expect(model.batchGuardrail.briefRecovery.visible).toBe(false)
  })

  test('downgrades safe batching when recent 10 chapters show fatigue risk', () => {
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
        recentFatigueRadar: {
          ...basePlanning.recentFatigueRadar,
          status: 'needs_attention',
          score: 61,
          label: '疲劳风险 61',
          summary: '近10章存在 3 类同质化风险：冲突变化、回报变化、钩子变化。',
          actionKey: 'update_rolling_plan',
          signals: [
            { key: 'conflict_variety', label: '冲突变化', status: 'warn', score: 58, count: 7, detail: '近10章「执事压迫」出现 7 次，冲突来源变化不足。', actionKey: 'update_rolling_plan' },
            { key: 'payoff_variety', label: '回报变化', status: 'warn', score: 64, count: 6, detail: '近10章「打脸」出现 6 次，回报形态变化不足。', actionKey: 'update_rolling_plan' },
            { key: 'hook_variety', label: '钩子变化', status: 'warn', score: 62, count: 6, detail: '近10章「试炼将至」出现 6 次，章末问题变化不足。', actionKey: 'update_rolling_plan' },
            { key: 'scene_freshness', label: '场面新鲜度', status: 'ok', score: 82, count: 0, detail: '场面有轮换。', actionKey: 'enter_chapter_writing' },
          ],
          nextActions: ['下一批章节要更换压迫来源、回报形态、章末问题或可视化场面，避免十章连续同质化。'],
        },
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
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.batchGuardrail.status).toBe('caution')
    expect(model.batchGuardrail.safeChapterCount).toBe(1)
    expect(model.batchGuardrail.recommendedAction.key).toBe('update_rolling_plan')
    expect(model.batchGuardrail.guardrails.find(item => item.label === '近10章疲劳')?.status).toBe('warn')
    expect(model.batchGuardrail.guardrails.find(item => item.label === '近10章疲劳')?.detail).toContain('同质化')
    expect(model.batchGuardrail.summary).toContain('近10章疲劳')
    expect(model.pipeline.find(step => step.key === 'batch_guardrail')?.status).toBe('warning')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'batch_release')?.status).toBe('pending')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'batch_release')?.badges).toContain('安全 1章')
  })

  test('surfaces IP scene coverage gaps in safe batching fatigue guardrail', () => {
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
        recentFatigueRadar: {
          ...basePlanning.recentFatigueRadar,
          status: 'needs_attention',
          score: 70,
          label: '疲劳风险 70',
          summary: '近10章存在 1 类同质化风险：场面新鲜度。',
          actionKey: 'update_rolling_plan',
          signals: [
            { key: 'conflict_variety', label: '冲突变化', status: 'ok', score: 86, count: 0, detail: '冲突来源轮换正常。', actionKey: 'enter_chapter_writing' },
            { key: 'payoff_variety', label: '回报变化', status: 'ok', score: 84, count: 0, detail: '回报形态轮换正常。', actionKey: 'enter_chapter_writing' },
            { key: 'hook_variety', label: '钩子变化', status: 'ok', score: 83, count: 0, detail: '章末问题轮换正常。', actionKey: 'enter_chapter_writing' },
            {
              key: 'scene_freshness',
              label: '场面新鲜度',
              status: 'warn',
              score: 60,
              count: 9,
              detail: 'IP场面覆盖 1/10，强场面空窗偏长。已沉淀：玻璃门内外对峙',
              actionKey: 'update_rolling_plan',
            },
          ],
          nextActions: ['下一批章节要补标志性场面。'],
        },
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
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    const fatigueGuardrail = model.batchGuardrail.guardrails.find(item => item.label === '近10章疲劳')

    expect(model.batchGuardrail.status).toBe('caution')
    expect(model.batchGuardrail.safeChapterCount).toBe(1)
    expect(model.batchGuardrail.recommendedAction.key).toBe('update_rolling_plan')
    expect(model.batchGuardrail.recommendedAction.payload?.recent_fatigue_radar).toBeTruthy()
    expect(fatigueGuardrail?.status).toBe('warn')
    expect(fatigueGuardrail?.detail).toContain('IP场面覆盖 1/10')
    expect(fatigueGuardrail?.detail).toContain('玻璃门内外对峙')
    expect(model.batchGuardrail.recommendedAction.description).toContain('IP场面覆盖 1/10')
    expect(model.batchGuardrail.summary).toContain('IP场面覆盖 1/10')
  })

  test('downgrades safe batching when story pressure ladder is weak', () => {
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
            conflict: '执事继续阻拦',
            endingHook: '执事再次加码',
            mainlineProgress: '外门压迫线继续',
            riskTags: [],
          },
          {
            chapterNo: 10,
            title: '外门震动',
            chapterTask: '试炼结果引发宗门震动',
            conflict: '执事仍旧阻拦',
            endingHook: '执事继续施压',
            mainlineProgress: '外门压迫线继续',
            riskTags: [],
          },
        ],
        storyPressureLadder: {
          ...basePlanning.storyPressureLadder,
          status: 'needs_attention',
          score: 62,
          label: '压力待升 62',
          summary: '未来章节存在 2 项故事压力风险：压力源、赌注升级。',
          actionKey: 'update_rolling_plan',
          pressureSources: [{ label: '执事阻拦', count: 3, chapters: [8, 9, 10], riskLevel: 'warn' }],
          signals: [
            { key: 'pressure_source', label: '压力源', status: 'warn', score: 62, count: 3, detail: '未来3章「执事阻拦」出现 3 次，压力源过于集中。', actionKey: 'update_rolling_plan' },
            { key: 'conflict_escalation', label: '冲突升级', status: 'ok', score: 82, count: 0, detail: '未来章节能看到压力加码或冲突升级。', actionKey: 'enter_chapter_writing' },
            { key: 'stakes_growth', label: '赌注升级', status: 'warn', score: 58, count: 2, detail: '未来章节缺少可感知赌注，读者可能觉得主角只是顺路过关。', actionKey: 'update_rolling_plan' },
            { key: 'reversal_pressure', label: '反转逼迫', status: 'ok', score: 82, count: 0, detail: '未来章节有反转或逼迫。', actionKey: 'enter_chapter_writing' },
          ],
          nextActions: ['下一批章节要明确压力源、升级赌注和反转逼迫，保证故事持续往前拱。'],
        },
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
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.batchGuardrail.status).toBe('caution')
    expect(model.batchGuardrail.safeChapterCount).toBe(1)
    expect(model.batchGuardrail.recommendedAction.key).toBe('update_rolling_plan')
    expect(model.batchGuardrail.recommendedAction.payload?.source).toBe('story_pressure_repair')
    expect(model.batchGuardrail.guardrails.find(item => item.label === '故事压力阶梯')?.status).toBe('warn')
    expect(model.batchGuardrail.guardrails.find(item => item.label === '故事压力阶梯')?.detail).toContain('压力风险')
    expect(model.batchGuardrail.summary).toContain('故事压力')
    expect(model.batchGuardrail.preflight.warnings.join('；')).toContain('故事压力阶梯')
  })

  test('downgrades safe batching when the current story unit is incomplete', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        storyUnitWorkshop: {
          ...basePlanning.storyUnitWorkshop,
          status: 'needs_attention',
          score: 66,
          label: '单元待补 66',
          summary: '当前剧情单元缺少完整事件包：本剧情单元仍缺：小高潮/回报、出单元钩子。',
          actionKey: 'update_rolling_plan',
          currentUnit: {
            ...basePlanning.storyUnitWorkshop.currentUnit,
            status: 'needs_attention',
            score: 66,
            summary: '本剧情单元仍缺：小高潮/回报、出单元钩子。',
            signals: [
              { key: 'entry_hook', label: '入口钩子', status: 'ok', score: 88, count: 1, detail: '第8章有入口钩子。', actionKey: 'enter_chapter_writing' },
              { key: 'pressure_escalation', label: '压力升级', status: 'ok', score: 88, count: 2, detail: '本单元有压力升级。', actionKey: 'enter_chapter_writing' },
              { key: 'mini_climax_payoff', label: '小高潮/回报', status: 'warn', score: 62, count: 1, detail: '本单元缺少小高潮或读者回报。', actionKey: 'update_rolling_plan' },
              { key: 'setup_and_storyline', label: '伏笔/剧情线', status: 'ok', score: 88, count: 1, detail: '本单元有剧情线调度。', actionKey: 'enter_chapter_writing' },
              { key: 'exit_hook', label: '出单元钩子', status: 'warn', score: 62, count: 1, detail: '单元最后一章缺少出单元钩子。', actionKey: 'update_rolling_plan' },
            ],
          },
          nextActions: ['先补齐当前剧情单元的入口钩子、压力升级、小高潮回报、伏笔/剧情线和出单元钩子，再扩大批量连写。'],
        },
      },
      writing: {
        ...baseWriting,
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '试炼前夜', goal: '以试炼资格引爆外门矛盾' }],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.batchGuardrail.status).toBe('caution')
    expect(model.batchGuardrail.safeChapterCount).toBe(1)
    expect(model.batchGuardrail.recommendedAction.key).toBe('update_rolling_plan')
    expect(model.batchGuardrail.recommendedAction.payload?.source).toBe('story_unit_repair')
    expect(model.batchGuardrail.guardrails.find(item => item.label === '剧情单元')?.status).toBe('warn')
    expect(model.batchGuardrail.guardrails.find(item => item.label === '剧情单元')?.detail).toContain('小高潮')
    expect(model.batchGuardrail.summary).toContain('剧情单元')
    expect(model.batchGuardrail.preflight.warnings.join('；')).toContain('剧情单元')
  })

  test('downgrades safe batching when million-word capacity is too shallow for an epic target', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          writtenWords: 48000,
          targetWords: 10000000,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        storylineBoard: {
          ...basePlanning.storylineBoard,
          total: 3,
          summary: '只有主线和两条支线，十万字后容易耗尽冲突。',
        },
        volumeBeatBudget: {
          ...basePlanning.volumeBeatBudget,
          plannedChapterCount: 22,
          totalChapters: 40,
          score: 86,
          status: 'ready',
        },
      },
      writing: {
        ...baseWriting,
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '试炼前夜', goal: '以试炼资格引爆外门矛盾' }],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.longformCapacity.status).toBe('caution')
    expect(model.longformCapacity.targetBandLabel).toBe('1000万字级')
    expect(model.longformCapacity.signals.find(signal => signal.key === 'storyline_pool')?.status).toBe('warn')
    expect(model.longformCapacity.fuelQueue.map(item => item.label)).toEqual(['补剧情线池', '延长当前卷跑道'])
    expect(model.longformCapacity.fuelQueue[0]?.actionKey).toBe('open_story_assets')
    expect(model.longformCapacity.fuelQueue[0]?.modelCall).toBe(false)
    expect(model.batchGuardrail.status).toBe('caution')
    expect(model.batchGuardrail.safeChapterCount).toBe(1)
    expect(model.batchGuardrail.guardrails.find(item => item.label === '百万字产能')?.status).toBe('warn')
    expect(model.pipeline.find(step => step.key === 'longform_capacity')?.status).toBe('warning')
    expect(model.metrics.longformCapacityScore).toBeLessThan(80)
  })

  test('blocks continuous production when longform canon state is stale', () => {
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
        readiness: {
          blockers: [],
          warnings: [
            { key: 'story_state_stale', status: 'warning', label: '故事状态可能滞后', detail: '建议同步最近已写章节的状态机。', actionKey: 'update_canon' },
          ],
          checks: [],
        },
        readinessChecks: [
          { key: 'story_state_stale', status: 'warning', label: '故事状态可能滞后', detail: '建议同步最近已写章节的状态机。', actionKey: 'update_canon' },
        ],
        primaryActionKey: 'update_canon',
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '同步故事状态',
          primaryActionKey: 'update_canon',
        },
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '试炼前夜', goal: '以试炼资格引爆外门矛盾' }],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
      },
      activeTasks: [],
      selectedModelId: 12,
    } as any)

    expect(model.status).toBe('needs_governance')
    expect(model.statusLabel).toBe('长线记忆待同步')
    expect(model.mainAction.key).toBe('update_canon')
    expect(model.batchGuardrail.status).toBe('blocked')
    expect(model.batchGuardrail.safeChapterCount).toBe(0)
    expect(model.batchGuardrail.guardrails.find(item => item.label === '长线记忆')?.status).toBe('block')
    expect(model.batchGuardrail.guardrails.find(item => item.label === '长线记忆')?.detail).toContain('故事状态可能滞后')
    expect(model.dailyBattlePlan.currentStepKey).toBe('fuel_materials')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'fuel_materials')?.status).toBe('active')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'fuel_materials')?.action.key).toBe('update_canon')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'chapter_work')?.status).toBe('pending')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'batch_release')?.status).toBe('blocked')
  })

})

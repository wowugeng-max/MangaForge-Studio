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

describe('buildAutoCreationDirectorModel expansion/structure b', () => {
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

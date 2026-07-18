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

describe('buildAutoCreationDirectorModel expansion/default-lane a b', () => {
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
})

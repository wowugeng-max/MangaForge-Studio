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

describe('buildAutoCreationDirectorModel expansion/default-lane a a', () => {
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
})

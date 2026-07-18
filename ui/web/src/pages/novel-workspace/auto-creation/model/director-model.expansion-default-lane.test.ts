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

describe('buildAutoCreationDirectorModel expansion/default-lane', () => {
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

})

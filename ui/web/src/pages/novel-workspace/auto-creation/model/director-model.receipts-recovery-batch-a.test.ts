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

describe('buildAutoCreationDirectorModel receipts/gates/recovery-batch a', () => {
  test('routes single-chapter governance recheck misses into recovery evidence repair tasks', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        futureRoute: [
          { chapterNo: 8, title: '试炼前夜', role: '当前章', coreHook: '阵盘裂纹被执事看见', status: 'ready' },
          { chapterNo: 9, title: '钟声复验', role: '下一章', coreHook: '用修后证据反制执事', status: 'ready' },
        ],
      } as any,
      writing: {
        ...baseWriting,
        chapterAcceptanceDesk: {
          ...baseWriting.chapterAcceptanceDesk,
          deliveryRiskQueue: {
            totalCount: 2,
            label: '待修复 2',
            priorityLabel: '优先验恢复依据',
            items: ['验恢复依据：恢复依据缺口 2'],
          },
        },
      } as any,
      selectedModelId: 12,
      reviews: [
        {
          id: 305,
          chapter_id: 8,
          review_type: 'governance_recheck_sync',
          created_at: '2026-06-04T01:05:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            governance_recheck_sync: {
              status: 'warn',
              label: '恢复依据缺口 2',
              missed_count: 2,
              failed_evidence: ['第42章对白交锋已补回样章节奏'],
              watch_items: ['下一章继续观察样章策略命中率'],
              summary: '单章交稿没有继承治理复查记忆。',
            },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.totalOpen).toBe(2)
    expect(model.deliveryRiskGate.highOpen).toBe(2)
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('恢复依据')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('恢复依据第8章：第42章对白交锋已补回样章节奏')
    expect(model.mainAction.key).toBe('create_delivery_risk_repair')
    expect(model.serialCockpit.riskQueue.find(item => item.key === 'delivery_risks')?.detail).toBe('优先验恢复依据')
  })

  test('turns failed recovery evidence into a batch repair task', () => {
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
        nextChapter: { ...baseWriting.nextChapter, id: 44, chapterNo: 44, title: '证据复盘后续' },
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '证据复盘', goal: '确认上一批恢复依据是否兑现' }],
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
      storyState: { last_updated_chapter: 43 },
      chapters: [
        { id: 41, chapter_no: 41, title: '证据复盘一', chapter_text: '证据复盘一'.repeat(500) },
        { id: 42, chapter_no: 42, title: '证据复盘二', chapter_text: '证据复盘二'.repeat(500) },
        { id: 43, chapter_no: 43, title: '证据复盘三', chapter_text: '证据复盘三'.repeat(500) },
      ],
      reviews: [
        { id: 4101, chapter_id: 41, review_type: 'prose_quality', created_at: '2026-06-03T01:00:00.000Z', payload: JSON.stringify({ score: 84, passed: true }) },
        { id: 4102, chapter_id: 42, review_type: 'prose_quality', created_at: '2026-06-03T01:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 4103, chapter_id: 43, review_type: 'prose_quality', created_at: '2026-06-03T01:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
        {
          id: 4104,
          chapter_id: 42,
          review_type: 'style_sample_sync',
          created_at: '2026-06-03T01:03:00.000Z',
          payload: JSON.stringify({
            style_sample_sync: {
              status: 'warn',
              label: '风格缺口 2',
              missed_count: 2,
              missed: [
                { label: '对白比例', text: '样章重审后仍没有把对白交锋写成推进。' },
                { label: '叙述节奏', text: '样章重审后仍缺短段落压迫节奏。' },
              ],
              copied_phrases: [],
            },
          }),
        },
      ],
      runRecords: [
        {
          id: 410,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-03T00:00:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({
            source: 'auto_creation_safe_batch',
            safety_limit: 3,
            batch_preflight: {
              recovery_evidence: [
                '样章任务书复检通过 1 项',
                '第42章样章已重审',
              ],
            },
          }),
          output_ref: JSON.stringify({
            total: 3,
            success: 3,
            failed: 0,
            chapters: [
              { id: 41, chapter_no: 41, title: '证据复盘一', status: 'success', score: 84, word_count: 3180 },
              { id: 42, chapter_no: 42, title: '证据复盘二', status: 'success', score: 85, word_count: 3090 },
              { id: 43, chapter_no: 43, title: '证据复盘三', status: 'success', score: 86, word_count: 3021 },
            ],
          }),
        },
      ],
    } as any)

    expect(model.batchReviewQueue.status).toBe('risk')
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'recovery_evidence')?.detail).toContain('样章任务书复检通过 1 项')
    expect(model.batchReviewQueue.riskRadar.repairTasks.map((task: any) => task.issue_type)).toContain('recovery_evidence_mismatch')
    const recoveryTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'recovery_evidence_mismatch')
    expect(recoveryTask?.recovery_evidence_review?.failed_evidence).toContain('样章任务书复检通过 1 项')
    expect(recoveryTask?.recovery_evidence_review?.failed_evidence).toContain('第42章样章已重审')
    expect(recoveryTask?.recovery_evidence_review?.failed_items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        evidence: '样章任务书复检通过 1 项',
        source: 'recovery_evidence',
        source_label: '恢复放行依据',
        source_action_label: '按批次修订',
      }),
      expect.objectContaining({
        evidence: '第42章样章已重审',
        source: 'recovery_evidence',
        source_label: '恢复放行依据',
        source_action_label: '按批次修订',
      }),
    ]))
    expect(model.batchReviewQueue.handoff.riskLabels).toContain('恢复依据')
  })

  test('turns missed governance recheck memory into a batch repair task', () => {
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
        nextChapter: { ...baseWriting.nextChapter, id: 44, chapterNo: 44, title: '治理复查后续' },
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '治理复查', goal: '确认治理复查记忆是否进入下一批验收' }],
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
      storyState: { last_updated_chapter: 43 },
      chapters: [
        { id: 41, chapter_no: 41, title: '治理复查一', chapter_text: '治理复查一'.repeat(500) },
        { id: 42, chapter_no: 42, title: '治理复查二', chapter_text: '治理复查二'.repeat(500) },
        { id: 43, chapter_no: 43, title: '治理复查三', chapter_text: '治理复查三'.repeat(500) },
      ],
      reviews: [
        { id: 4201, chapter_id: 41, review_type: 'prose_quality', created_at: '2026-06-04T01:00:00.000Z', payload: JSON.stringify({ score: 84, passed: true }) },
        { id: 4202, chapter_id: 42, review_type: 'prose_quality', created_at: '2026-06-04T01:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 4203, chapter_id: 43, review_type: 'prose_quality', created_at: '2026-06-04T01:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
        {
          id: 4204,
          chapter_id: 42,
          review_type: 'style_sample_sync',
          created_at: '2026-06-04T01:03:00.000Z',
          payload: JSON.stringify({
            style_sample_sync: {
              status: 'warn',
              label: '风格缺口 2',
              missed_count: 2,
              missed: [
                { label: '对白交锋', text: '治理复查记忆要求的对白交锋仍没有写成推进。' },
                { label: '样章节奏', text: '下一批观察项要求的样章策略命中率仍未达标。' },
              ],
              copied_phrases: [],
            },
          }),
        },
      ],
      runRecords: [
        {
          id: 420,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-04T00:00:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({
            source: 'auto_creation_safe_batch',
            safety_limit: 3,
            batch_preflight: {
              governance_recheck_memory: {
                status: 'closed',
                label: '治理复查已记录',
                evidence: [
                  '第42章对白交锋已补回样章节奏',
                ],
                watch_items: [
                  '下一批继续观察样章策略命中率',
                ],
                storyline_decision_task_count: 0,
              },
            },
          }),
          output_ref: JSON.stringify({
            total: 3,
            success: 3,
            failed: 0,
            chapters: [
              { id: 41, chapter_no: 41, title: '治理复查一', status: 'success', score: 84, word_count: 3180 },
              { id: 42, chapter_no: 42, title: '治理复查二', status: 'success', score: 85, word_count: 3090 },
              { id: 43, chapter_no: 43, title: '治理复查三', status: 'success', score: 86, word_count: 3021 },
            ],
          }),
        },
      ],
    } as any)

    const recoverySignal = model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'recovery_evidence')
    const recoveryTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'recovery_evidence_mismatch')

    expect(model.batchReviewQueue.status).toBe('risk')
    expect(recoverySignal?.detail).toContain('第42章对白交锋已补回样章节奏')
    expect(recoverySignal?.detail).toContain('下一批继续观察样章策略命中率')
    expect(recoveryTask?.recovery_evidence_review?.failed_evidence).toContain('第42章对白交锋已补回样章节奏')
    expect(recoveryTask?.recovery_evidence_review?.failed_evidence).toContain('下一批继续观察样章策略命中率')
    expect(recoveryTask?.recovery_evidence_review?.failed_items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        evidence: '第42章对白交锋已补回样章节奏',
        source: 'governance_recheck_memory',
        source_label: '治理复查记忆',
        source_detail: '治理复查记忆 · 修后证据',
        source_action_label: '治理复查台',
      }),
      expect.objectContaining({
        evidence: '下一批继续观察样章策略命中率',
        source: 'governance_recheck_memory',
        source_label: '治理复查记忆',
        source_detail: '治理复查记忆 · 观察项',
        source_action_label: '治理复查台',
      }),
    ]))
    expect(model.batchReviewQueue.handoff.riskLabels).toContain('恢复依据')
  })

  test('turns cleared recovery evidence production gate sources into batch repair tasks when the batch stops inheriting them', () => {
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
        nextChapter: { ...baseWriting.nextChapter, id: 44, chapterNo: 44, title: '闸门复盘后续' },
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '闸门复盘', goal: '确认入口闸门解除来源是否被本批继承' }],
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
      storyState: { last_updated_chapter: 43 },
      chapters: [
        { id: 41, chapter_no: 41, title: '闸门复盘一', chapter_text: '闸门复盘一'.repeat(500) },
        { id: 42, chapter_no: 42, title: '闸门复盘二', chapter_text: '闸门复盘二'.repeat(500) },
        { id: 43, chapter_no: 43, title: '闸门复盘三', chapter_text: '闸门复盘三'.repeat(500) },
      ],
      reviews: [
        { id: 4301, chapter_id: 41, review_type: 'prose_quality', created_at: '2026-06-05T01:00:00.000Z', payload: JSON.stringify({ score: 84, passed: true }) },
        { id: 4302, chapter_id: 42, review_type: 'prose_quality', created_at: '2026-06-05T01:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 4303, chapter_id: 43, review_type: 'prose_quality', created_at: '2026-06-05T01:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
        {
          id: 4304,
          chapter_id: 42,
          review_type: 'style_sample_sync',
          created_at: '2026-06-05T01:03:00.000Z',
          payload: JSON.stringify({
            style_sample_sync: {
              status: 'warn',
              label: '风格缺口 2',
              missed_count: 2,
              missed: [
                { label: '对白交锋', text: '入口闸门解除后，本批仍没有继承单章治理复查的对白交锋证据。' },
                { label: '样章节奏', text: '入口闸门解除后，本批仍没有继承批次恢复复查的样章节奏证据。' },
              ],
              copied_phrases: [],
            },
          }),
        },
      ],
      runRecords: [
        {
          id: 430,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-05T00:00:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({
            source: 'auto_creation_safe_batch',
            safety_limit: 3,
            batch_preflight: {
              recovery_evidence_production_gate: {
                status: 'ok',
                label: '恢复依据生产闸门',
                source_count: 2,
                sources: [
                  {
                    source: 'single_chapter_governance_recheck',
                    label: '单章治理复查',
                    status: 'cleared',
                    status_label: '生产阻断已解除',
                    residual_evidence: [],
                    task_count: 1,
                  },
                  {
                    source: 'safe_batch_recovery_recheck',
                    label: '批次恢复复查',
                    status: 'cleared',
                    status_label: '生产阻断已解除',
                    residual_evidence: [],
                    task_count: 1,
                  },
                ],
              },
            },
          }),
          output_ref: JSON.stringify({
            total: 3,
            success: 3,
            failed: 0,
            chapters: [
              { id: 41, chapter_no: 41, title: '闸门复盘一', status: 'success', score: 84, word_count: 3180 },
              { id: 42, chapter_no: 42, title: '闸门复盘二', status: 'success', score: 85, word_count: 3090 },
              { id: 43, chapter_no: 43, title: '闸门复盘三', status: 'success', score: 86, word_count: 3021 },
            ],
          }),
        },
      ],
    } as any)

    const recoverySignal = model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'recovery_evidence')
    const recoveryTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'recovery_evidence_mismatch')

    expect(model.batchReviewQueue.status).toBe('risk')
    expect(recoverySignal?.detail).toContain('单章治理复查：生产阻断已解除')
    expect(recoverySignal?.detail).toContain('批次恢复复查：生产阻断已解除')
    expect(recoveryTask?.recovery_evidence_review?.failed_evidence).toContain('单章治理复查：生产阻断已解除')
    expect(recoveryTask?.recovery_evidence_review?.failed_evidence).toContain('批次恢复复查：生产阻断已解除')
    expect(recoveryTask?.recovery_evidence_review?.failed_items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        evidence: '单章治理复查：生产阻断已解除',
        source: 'recovery_evidence_production_gate',
        source_label: '入口生产闸门',
        source_detail: '单章治理复查 · 生产阻断已解除',
        source_action_label: '复检单章',
      }),
      expect.objectContaining({
        evidence: '批次恢复复查：生产阻断已解除',
        source: 'recovery_evidence_production_gate',
        source_label: '入口生产闸门',
        source_detail: '批次恢复复查 · 生产阻断已解除',
        source_action_label: '复盘批次',
      }),
    ]))
    expect(model.batchReviewQueue.handoff.riskLabels).toContain('恢复依据')
  })

  test('turns release summary evidence into batch repair tasks when the batch stops inheriting it', () => {
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
        nextChapter: { ...baseWriting.nextChapter, id: 44, chapterNo: 44, title: '放行摘要后续' },
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '放行摘要复盘', goal: '确认安全连写放行摘要是否被本批继承' }],
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
      storyState: { last_updated_chapter: 43 },
      chapters: [
        { id: 41, chapter_no: 41, title: '放行摘要一', chapter_text: '放行摘要一'.repeat(500) },
        { id: 42, chapter_no: 42, title: '放行摘要二', chapter_text: '放行摘要二'.repeat(500) },
        { id: 43, chapter_no: 43, title: '放行摘要三', chapter_text: '放行摘要三'.repeat(500) },
      ],
      reviews: [
        { id: 4401, chapter_id: 41, review_type: 'prose_quality', created_at: '2026-06-05T01:00:00.000Z', payload: JSON.stringify({ score: 84, passed: true }) },
        { id: 4402, chapter_id: 42, review_type: 'prose_quality', created_at: '2026-06-05T01:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 4403, chapter_id: 43, review_type: 'prose_quality', created_at: '2026-06-05T01:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
        {
          id: 4404,
          chapter_id: 42,
          review_type: 'style_sample_sync',
          created_at: '2026-06-05T01:03:00.000Z',
          payload: JSON.stringify({
            style_sample_sync: {
              status: 'warn',
              label: '风格缺口 3',
              missed_count: 3,
              missed: [
                { label: '治理队列闭环', text: '恢复依据治理队列已闭环，但本批没有继承其放行摘要。' },
                { label: '单章复查', text: '本批仍没有继承单章治理复查解除后的对白交锋。' },
                { label: '批次复查', text: '本批仍没有继承批次恢复复查解除后的样章节奏。' },
              ],
              copied_phrases: [],
            },
          }),
        },
      ],
      runRecords: [
        {
          id: 440,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-05T00:00:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({
            source: 'auto_creation_safe_batch',
            safety_limit: 3,
            batch_preflight: {
              recovery_evidence_release_summary: {
                status: 'released',
                source: 'recovery_evidence_governance_queue',
                summary: '恢复依据治理队列已闭环，可恢复 3 章安全连写。',
                safe_chapter_count: 3,
                allowed_chapter_nos: [41, 42, 43],
                next_batch_label: '第41-43章',
                cleared_source_count: 2,
                cleared_sources: [
                  {
                    source: 'single_chapter_governance_recheck',
                    label: '单章治理复查',
                    status: 'cleared',
                    status_label: '生产阻断已解除',
                  },
                  {
                    source: 'safe_batch_recovery_recheck',
                    label: '批次恢复复查',
                    status: 'cleared',
                    status_label: '生产阻断已解除',
                  },
                ],
                evidence: [
                  '恢复依据治理队列已闭环',
                  '单章治理复查：生产阻断已解除',
                  '批次恢复复查：生产阻断已解除',
                ],
              },
            },
          }),
          output_ref: JSON.stringify({
            total: 3,
            success: 3,
            failed: 0,
            chapters: [
              { id: 41, chapter_no: 41, title: '放行摘要一', status: 'success', score: 84, word_count: 3180 },
              { id: 42, chapter_no: 42, title: '放行摘要二', status: 'success', score: 85, word_count: 3090 },
              { id: 43, chapter_no: 43, title: '放行摘要三', status: 'success', score: 86, word_count: 3021 },
            ],
          }),
        },
      ],
    } as any)

    const recoverySignal = model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'recovery_evidence')
    const recoveryTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'recovery_evidence_mismatch')

    expect(model.batchReviewQueue.status).toBe('risk')
    expect(recoverySignal?.detail).toContain('恢复依据治理队列已闭环')
    expect(recoveryTask?.recovery_evidence_review?.failed_evidence).toContain('恢复依据治理队列已闭环')
    expect(recoveryTask?.recovery_evidence_review?.failed_items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        evidence: '恢复依据治理队列已闭环',
        source: 'recovery_evidence_release_summary',
        source_label: '安全连写放行摘要',
        source_action_label: '治理复查台',
      }),
      expect.objectContaining({
        evidence: '单章治理复查：生产阻断已解除',
        source: 'recovery_evidence_release_summary',
        source_label: '安全连写放行摘要',
        source_detail: expect.stringContaining('单章治理复查'),
        source_action_label: '复检单章',
      }),
      expect.objectContaining({
        evidence: '批次恢复复查：生产阻断已解除',
        source: 'recovery_evidence_release_summary',
        source_label: '安全连写放行摘要',
        source_detail: expect.stringContaining('批次恢复复查'),
        source_action_label: '复盘批次',
      }),
    ]))
    expect(recoveryTask?.recovery_evidence_regovernance_queue).toMatchObject({
      source: 'recovery_evidence_release_summary',
      status: 'needs_followup',
      label: '安全连写放行摘要再治理',
      next_cycle: {
        type: 'release_summary_regovernance',
        label: '放行摘要验收再治理',
      },
      tasks: expect.arrayContaining([
        expect.objectContaining({
          issue_type: 'recovery_evidence_governance_queue',
          evidence: '恢复依据治理队列已闭环',
          source: 'recovery_evidence_release_summary',
          source_label: '安全连写放行摘要',
          action_key: 'review_governance_closure',
          action_label: '治理复查台',
        }),
        expect.objectContaining({
          issue_type: 'recovery_evidence_governance_queue',
          evidence: '单章治理复查：生产阻断已解除',
          source: 'single_chapter_governance_recheck',
          source_label: '单章治理复查',
          action_key: 'recheck_single_chapter',
          action_label: '复检单章',
        }),
        expect.objectContaining({
          issue_type: 'recovery_evidence_governance_queue',
          evidence: '批次恢复复查：生产阻断已解除',
          source: 'safe_batch_recovery_recheck',
          source_label: '批次恢复复查',
          action_key: 'recheck_safe_batch',
          action_label: '复盘批次',
        }),
      ]),
    })
    expect(recoveryTask?.recoveryEvidenceGovernanceQueue?.task_count).toBe(3)
    expect(model.batchReviewQueue.handoff.riskLabels).toContain('恢复依据')
  })

})

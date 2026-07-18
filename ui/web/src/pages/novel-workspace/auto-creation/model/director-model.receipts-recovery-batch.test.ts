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

describe('buildAutoCreationDirectorModel receipts/gates/recovery-batch', () => {
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

  test('turns missed expansion structure decision execution into a batch repair task', () => {
    const chapterNos = [70, 71, 72, 73, 74]
    const model = buildAutoCreationDirectorModel({
      planning: readySafeBatchPlanning({ futureRoute: futureRouteRange(75, 5) }),
      writing: readySafeBatchWriting({
        nextChapter: { ...baseWriting.nextChapter, id: 75, chapterNo: 75, title: '结构决策后续' },
        previousChapter: { chapterNo: 74, title: '结构决策五', wordCount: 3200, hasProse: true },
      }),
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 74 },
      chapters: chapterNos.map(chapterNo => ({
        id: chapterNo,
        chapter_no: chapterNo,
        title: `结构决策${chapterNo}`,
        chapter_text: '结构决策正文'.repeat(500),
        raw_payload: chapterNo === 72 ? {} : {
          generated_scene_breakdown: [{
            expansion_structure_decision_execution: {
              segment_role_delivered: true,
              observation_metrics_delivered: true,
              redesign_principles_delivered: true,
              evidence: [`第${chapterNo}章已按段位职责推进主线转折并回填观察指标。`],
            },
          }],
        },
      })),
      reviews: [
        ...strengthenedAcceptanceQualityReviews(chapterNos, 7001, '2026-06-20T01:00:00.000Z'),
        {
          id: 7101,
          chapter_id: 72,
          review_type: 'safe_batch_expansion_structure_decision_sync',
          created_at: '2026-06-20T01:20:00.000Z',
          payload: JSON.stringify({
            expansion_structure_decision_sync: {
              status: 'warn',
              missed_count: 2,
              missed: [
                { key: 'segment_role', label: '中段职责', text: '第72章没有承担中段主线转折和显性回报职责。' },
                { key: 'observation_metrics', label: '观察指标', text: '正文没有证明通过率和失败主因已按结构修复观察。' },
              ],
              segment_role_delivered: false,
              observation_metrics_delivered: false,
              redesign_principles_delivered: true,
            },
          }),
        },
      ],
      runRecords: [
        {
          id: 710,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-20T00:00:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({
            source: 'auto_creation_safe_batch',
            safety_limit: 5,
            next_batch_brief: {
              chapter_range_label: '第70-74章',
              expansion_structure_decision: {
                visible: true,
                label: '结构修复决策',
                recommendation: 'restore_five_chapter',
                target_chapter_count: 5,
                mode_label: '恢复5章扩批',
                segment_key: 'middle',
                segment_label: '中段',
                summary: '中段结构修复通过率 67% -> 100%，失败主因 3 -> 0。',
                instruction: '恢复 5 章扩批，但每章必须明确前段/中段/后段职责，中段不得再次变成空铺垫。',
                observation_metrics: ['通过率 67% -> 100%', '失败主因 3 -> 0', '修复后暂无同段复发'],
              },
            },
          }),
          output_ref: JSON.stringify({
            total: 5,
            success: 5,
            failed: 0,
            chapters: chapterNos.map((chapterNo, index) => ({
              id: chapterNo,
              chapter_no: chapterNo,
              title: `结构决策${chapterNo}`,
              status: 'success',
              score: 84 + index,
              word_count: 3100 + index * 20,
            })),
          }),
        },
      ],
    } as any)

    const decisionSignal = model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'batch_expansion_structure_decision' as any)
    const decisionTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'safe_batch_expansion_structure_decision_mismatch')

    expect(model.batchReviewQueue.status).toBe('risk')
    expect((model.batchReviewQueue.riskRadar as any).safeBatchExpansionStructureDecisionRiskCount).toBe(2)
    expect(decisionSignal?.label).toBe('扩批结构决策')
    expect(decisionSignal?.status).toBe('warn')
    expect(decisionSignal?.detail).toContain('结构修复决策未落地')
    expect(decisionTask?.safe_batch_expansion_structure_decision_review).toMatchObject({
      recommendation: 'restore_five_chapter',
      target_chapter_count: 5,
      segment_label: '中段',
      missed_chapter_nos: [72],
      failed_items: expect.arrayContaining([
        expect.objectContaining({ chapter_no: 72, key: 'segment_role' }),
        expect.objectContaining({ chapter_no: 72, key: 'observation_metrics' }),
      ]),
    })
    expect(model.batchReviewQueue.handoff.riskLabels).toContain('扩批结构决策')
  })

  test('uses expansion structure decision execution trend to hold the next batch at small validation', () => {
    const strengthenedChapterNos = [41, 42, 43, 44, 45, 46, 47, 48, 49]
    const expansionChapterNos = [70, 71, 72, 73, 74]
    const model = buildAutoCreationDirectorModel({
      planning: readySafeBatchPlanning({ futureRoute: futureRouteRange(75, 5) }),
      writing: readySafeBatchWriting({
        nextChapter: { ...baseWriting.nextChapter, id: 75, chapterNo: 75, title: '结构决策趋势后续' },
        previousChapter: { chapterNo: 74, title: '结构决策趋势五', wordCount: 3200, hasProse: true },
      }),
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 74 },
      chapters: [
        ...strengthenedChapterNos.map(chapterNo => ({
          id: chapterNo,
          chapter_no: chapterNo,
          title: `强化趋势${chapterNo}`,
          chapter_text: '强化趋势正文'.repeat(500),
        })),
        ...expansionChapterNos.map(chapterNo => ({
          id: chapterNo,
          chapter_no: chapterNo,
          title: `结构决策趋势${chapterNo}`,
          chapter_text: '结构决策趋势正文'.repeat(500),
          raw_payload: chapterNo === 72 ? {} : {
            generated_scene_breakdown: [{
              expansion_structure_decision_execution: {
                segment_role_delivered: true,
                observation_metrics_delivered: true,
                redesign_principles_delivered: true,
                evidence: [`第${chapterNo}章已执行结构决策。`],
              },
            }],
          },
        })),
      ],
      reviews: [
        ...strengthenedAcceptanceQualityReviews([41, 42, 43], 7201, '2026-06-14T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([44, 45, 46], 7211, '2026-06-15T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([47, 48, 49], 7221, '2026-06-16T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews(expansionChapterNos, 7231, '2026-06-20T01:00:00.000Z'),
        {
          id: 7241,
          chapter_id: 72,
          review_type: 'safe_batch_expansion_structure_decision_sync',
          created_at: '2026-06-20T01:20:00.000Z',
          payload: JSON.stringify({
            expansion_structure_decision_sync: {
              status: 'warn',
              missed_count: 2,
              missed: [
                { key: 'segment_role', label: '中段职责', text: '第72章没有承担中段主线转折职责。' },
                { key: 'observation_metrics', label: '观察指标', text: '第72章没有证明失败主因已收敛。' },
              ],
            },
          }),
        },
      ],
      runRecords: [
        strengthenedAcceptanceBatchRun({ id: 720, createdAt: '2026-06-14T00:00:00.000Z', chapterNos: [41, 42, 43] }),
        strengthenedAcceptanceBatchRun({ id: 721, createdAt: '2026-06-15T00:00:00.000Z', chapterNos: [44, 45, 46] }),
        strengthenedAcceptanceBatchRun({ id: 722, createdAt: '2026-06-16T00:00:00.000Z', chapterNos: [47, 48, 49] }),
        {
          id: 723,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-20T00:00:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({
            source: 'auto_creation_safe_batch',
            safety_limit: 5,
            batch_preflight: {
              safe_chapter_count: 5,
              allowed_chapter_nos: expansionChapterNos,
              safe_batch_expansion_policy: {
                status: 'expanded',
                label: '强化扩批规则',
                summary: '结构修复有效后恢复 5 章。',
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
            next_batch_brief: {
              chapter_range_label: '第70-74章',
              expansion_structure_decision: {
                visible: true,
                label: '结构修复决策',
                recommendation: 'restore_five_chapter',
                target_chapter_count: 5,
                mode_label: '恢复5章扩批',
                segment_key: 'middle',
                segment_label: '中段',
                summary: '中段结构修复有效性：通过率 67% -> 100%，失败主因 3 -> 0。',
                instruction: '恢复 5 章扩批，但每章必须明确前段/中段/后段职责。',
                observation_metrics: ['通过率 67% -> 100%', '失败主因 3 -> 0'],
              },
            },
          }),
          output_ref: JSON.stringify({
            total: 5,
            success: 5,
            failed: 0,
            chapters: expansionChapterNos.map((chapterNo, index) => ({
              id: chapterNo,
              chapter_no: chapterNo,
              title: `结构决策趋势${chapterNo}`,
              status: 'success',
              score: 84 + index,
              word_count: 3100 + index * 20,
            })),
          }),
        },
      ],
    } as any)

    const policy = model.batchGuardrail.preflight.inputSnapshot.safe_batch_expansion_policy
    const decisionTrend = policy.expansion_feedback.expansion_structure_decision_trend
    const decision = model.batchGuardrail.nextBatchBrief.expansionStructureDecision

    expect(decisionTrend).toMatchObject({
      visible: true,
      status: 'warn',
      total_batch_count: 1,
      failed_batch_count: 1,
      latest_status: 'warn',
      top_failed_recommendation: { key: 'restore_five_chapter', count: 1 },
      top_failed_requirement: { key: 'segment_role', count: 1 },
      failed_requirements: expect.arrayContaining([
        expect.objectContaining({ key: 'segment_role', label: '中段职责', count: 1 }),
      ]),
      suggested_target_chapter_count: 3,
    })
    expect(policy).toMatchObject({
      status: 'recovering',
      target_chapter_count: 3,
    })
    expect(policy.summary).toContain('结构决策执行趋势')
    expect(decision.instruction).toContain('先按结构决策执行趋势补齐')
    expect(decision.observationMetrics).toContain('结构决策漏项：中段职责 1')
    expect(policy.safe_batch_recovery_roadmap).toMatchObject({
      visible: true,
      current_lane: 'small_batch',
      current_target_chapter_count: 3,
      current_reason: expect.stringContaining('结构决策执行趋势'),
      next_repair_layer: {
        key: 'structure_decision_execution',
        label: '结构决策执行',
        action_label: '补齐结构决策执行',
        focus: {
          target_view: 'repair_task',
          issue_type: 'safe_batch_expansion_structure_decision_mismatch',
          task_center_filter_label: '扩批结构决策',
        },
      },
      recommended_focus: {
        layer_key: 'structure_decision_execution',
        layer_label: '结构决策执行',
        action_label: '补齐结构决策执行',
        target_view: 'repair_task',
        issue_type: 'safe_batch_expansion_structure_decision_mismatch',
        task_center_filter_label: '扩批结构决策',
      },
    })
    expect(policy.safe_batch_recovery_roadmap.route_nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'strengthened_acceptance', status: 'ok' }),
      expect.objectContaining({ key: 'expansion_feedback', status: 'ok' }),
      expect.objectContaining({ key: 'structure_decision_execution', status: 'warn' }),
    ]))
    expect(model.batchGuardrail.recommendedAction).toMatchObject({
      key: 'open_task_center',
      label: '补齐结构决策执行',
      payload: {
        source: 'safe_batch_recovery_roadmap',
        safeBatchRecoveryFocus: {
          layerKey: 'structure_decision_execution',
          layerLabel: '结构决策执行',
          actionLabel: '补齐结构决策执行',
          targetView: 'repair_task',
          issueType: 'safe_batch_expansion_structure_decision_mismatch',
          taskCenterFilterLabel: '扩批结构决策',
        },
      },
    })
  })

  test('focuses default lane template repair when structure decision trend comes from lane redesign gaps', () => {
    const strengthenedChapterNos = [41, 42, 43, 44, 45, 46, 47, 48, 49]
    const expansionChapterNos = [85, 86, 87, 88, 89]
    const model = buildAutoCreationDirectorModel({
      planning: readySafeBatchPlanning({ futureRoute: futureRouteRange(90, 5) }),
      writing: readySafeBatchWriting({
        nextChapter: { ...baseWriting.nextChapter, id: 90, chapterNo: 90, title: '默认档位模板后续' },
        previousChapter: { chapterNo: 89, title: '默认档位模板五', wordCount: 3200, hasProse: true },
      }),
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 89 },
      chapters: [
        ...strengthenedChapterNos.map(chapterNo => ({
          id: chapterNo,
          chapter_no: chapterNo,
          title: `强化趋势${chapterNo}`,
          chapter_text: '强化趋势正文'.repeat(500),
        })),
        ...expansionChapterNos.map(chapterNo => ({
          id: chapterNo,
          chapter_no: chapterNo,
          title: `默认档位模板${chapterNo}`,
          chapter_text: '默认档位模板正文'.repeat(500),
          raw_payload: {
            generated_scene_breakdown: [{
              expansion_structure_decision_execution: chapterNo === 89 ? {
                segment_role_delivered: true,
                observation_metrics_delivered: true,
                redesign_principles_delivered: true,
                evidence: ['第89章只回填旧结构决策，没有写默认5章档位模板。'],
              } : {
                segment_role_delivered: true,
                observation_metrics_delivered: true,
                redesign_principles_delivered: true,
                default_lane_segment_duty_delivered: true,
                default_lane_conflict_rotation_delivered: true,
                default_lane_payoff_density_delivered: true,
                default_lane_ending_hook_template_delivered: true,
                evidence: [`第${chapterNo}章已执行默认档位模板。`],
              },
            }],
          },
        })),
      ],
      reviews: [
        ...strengthenedAcceptanceQualityReviews([41, 42, 43], 7301, '2026-06-21T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([44, 45, 46], 7311, '2026-06-22T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews([47, 48, 49], 7321, '2026-06-23T01:00:00.000Z'),
        ...strengthenedAcceptanceQualityReviews(expansionChapterNos, 7331, '2026-06-24T01:00:00.000Z'),
      ],
      runRecords: [
        strengthenedAcceptanceBatchRun({ id: 730, createdAt: '2026-06-21T00:00:00.000Z', chapterNos: [41, 42, 43] }),
        strengthenedAcceptanceBatchRun({ id: 731, createdAt: '2026-06-22T00:00:00.000Z', chapterNos: [44, 45, 46] }),
        strengthenedAcceptanceBatchRun({ id: 732, createdAt: '2026-06-23T00:00:00.000Z', chapterNos: [47, 48, 49] }),
        {
          id: 733,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-24T00:00:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({
            source: 'auto_creation_safe_batch',
            safety_limit: 5,
            batch_preflight: {
              safe_chapter_count: 5,
              allowed_chapter_nos: expansionChapterNos,
              safe_batch_expansion_policy: {
                status: 'expanded',
                label: '强化扩批规则',
                summary: '恢复5章后进入默认档位结构重构观察。',
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
            next_batch_brief: {
              chapter_range_label: '第85-89章',
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
            total: 5,
            success: 5,
            failed: 0,
            chapters: expansionChapterNos.map((chapterNo, index) => ({
              id: chapterNo,
              chapter_no: chapterNo,
              title: `默认档位模板${chapterNo}`,
              status: 'success',
              score: 84 + index,
              word_count: 3100 + index * 20,
            })),
          }),
        },
      ],
    } as any)

    const policy = model.batchGuardrail.preflight.inputSnapshot.safe_batch_expansion_policy

    expect(policy.expansion_feedback.expansion_structure_decision_trend).toMatchObject({
      status: 'warn',
      suggested_target_chapter_count: 1,
      default_five_chapter_lane_redesign: {
        reason: 'repeated_recovery_verdict_relapse',
        relapse_count: 2,
      },
    })
    expect(policy.safe_batch_recovery_roadmap).toMatchObject({
      current_lane: 'single_chapter',
      recommended_focus: {
        action_label: '补默认档位模板',
        task_center_filter_label: '默认档位模板',
        requirement_key: 'default_lane_template',
      },
    })
    expect(model.batchGuardrail.recommendedAction).toMatchObject({
      key: 'open_task_center',
      label: '补默认档位模板',
      payload: {
        safeBatchRecoveryFocus: {
          actionLabel: '补默认档位模板',
          taskCenterFilterLabel: '默认档位模板',
          requirementKey: 'default_lane_template',
        },
      },
    })
  })

  test('shows recovery evidence closure in completion dashboard after repair recheck resolves it', () => {
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
        { id: 4105, chapter_id: 41, review_type: 'prose_quality', created_at: '2026-06-03T02:10:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 4106, chapter_id: 42, review_type: 'prose_quality', created_at: '2026-06-03T02:11:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
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
        {
          id: 411,
          run_type: 'longform_production_repair',
          created_at: '2026-06-03T02:00:00.000Z',
          status: 'completed',
          input_ref: JSON.stringify({ source: 'auto_creation_safe_batch_risk', batch_created_at: '2026-06-03T00:00:00.000Z' }),
          output_ref: JSON.stringify({
            tasks: [
              { task_type: 'repair_quality', issue_type: 'recovery_evidence_mismatch', task_status: 'resolved', chapter_id: 41, chapter_no: 41 },
              { task_type: 'repair_quality', issue_type: 'style_sample_gap', task_status: 'resolved', chapter_id: 42, chapter_no: 42 },
            ],
          }),
        },
      ],
    } as any)

    const recoverySignal = model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'recovery_evidence')
    const recoveryMetric = model.batchReviewQueue.completionDashboard.metrics.find(metric => metric.key === 'recovery_evidence' as any)

    expect(model.batchReviewQueue.status).toBe('done')
    expect(model.batchReviewQueue.riskRadar.repairTasks.map((task: any) => task.issue_type)).not.toContain('recovery_evidence_mismatch')
    expect(recoverySignal?.status).toBe('ok')
    expect(recoverySignal?.detail).toContain('恢复放行依据失效风险已修复并通过复检')
    expect(recoveryMetric?.label).toBe('恢复依据')
    expect(recoveryMetric?.status).toBe('ok')
    expect(recoveryMetric?.detail).toContain('恢复依据已闭环')
    expect(model.batchReviewQueue.completionDashboard.summary).toContain('恢复依据已闭环')
    expect(model.batchReviewQueue.handoff.evidence).toContain('恢复依据已闭环')
  })

  test('holds delivered safe batch when reader pull and innovation execution are missed', () => {
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
        nextChapter: { ...baseWriting.nextChapter, id: 15, chapterNo: 15, title: '内门来人' },
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
      storyState: { last_updated_chapter: 14 },
      chapters: [
        { id: 12, chapter_no: 12, title: '令牌代价', chapter_text: '令牌代价'.repeat(500), raw_payload: { ending_hook: '令牌背面浮出血字' } },
        { id: 13, chapter_no: 13, title: '阵盘回响', chapter_text: '阵盘回响'.repeat(500), raw_payload: { ending_hook: '暗处长老认出阵纹' } },
        { id: 14, chapter_no: 14, title: '内门影子', chapter_text: '内门影子'.repeat(500), raw_payload: { payoff: '压迫继续升级' } },
      ],
      reviews: [
        { id: 101, chapter_id: 12, review_type: 'prose_quality', created_at: '2026-06-03T01:00:00.000Z', payload: JSON.stringify({ score: 84, passed: true }) },
        { id: 102, chapter_id: 13, review_type: 'prose_quality', created_at: '2026-06-03T01:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 103, chapter_id: 14, review_type: 'prose_quality', created_at: '2026-06-03T01:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
        {
          id: 301,
          chapter_id: 12,
          review_type: 'reader_expectation_sync',
          created_at: '2026-06-03T01:03:00.000Z',
          payload: JSON.stringify({
            reader_expectation_sync: {
              status: 'warn',
              label: '期待欠账 1',
              missed_count: 1,
              missed: [{ label: '令牌代价', text: '章内没有兑现令牌背面血字代表的即时危险。' }],
            },
          }),
        },
        {
          id: 302,
          chapter_id: 13,
          review_type: 'reader_retention_sync',
          created_at: '2026-06-03T01:04:00.000Z',
          payload: JSON.stringify({
            reader_retention_sync: {
              status: 'warn',
              label: '追读漏项 1',
              missed_count: 1,
              missed: [{ label: '章末问题', text: '章末没有留下明确的下一章选择或危险。' }],
            },
          }),
        },
        {
          id: 303,
          chapter_id: 14,
          review_type: 'innovation_sync',
          created_at: '2026-06-03T01:05:00.000Z',
          payload: JSON.stringify({
            innovation_sync: {
              status: 'warn',
              label: '创新缺口 2',
              missed_count: 2,
              missed: [
                { label: '规则反制新鲜感', text: '没有把阵法规则写成可视化反制场面。' },
                { label: 'IP化场面', text: '缺少适合短剧/漫剧化的强视觉场景。' },
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
              { id: 12, chapter_no: 12, title: '令牌代价', status: 'success', score: 84, word_count: 3180 },
              { id: 13, chapter_no: 13, title: '阵盘回响', status: 'success', score: 85, word_count: 3090 },
              { id: 14, chapter_no: 14, title: '内门影子', status: 'success', score: 86, word_count: 3021 },
            ],
          }),
        },
      ],
    } as any)

    expect(model.batchReviewQueue.status).toBe('risk')
    expect((model.batchReviewQueue.riskRadar as any).readerPullRiskCount).toBe(2)
    expect((model.batchReviewQueue.riskRadar as any).innovationRiskCount).toBe(2)
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'reader_pull')?.detail).toContain('读者拉力')
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'innovation')?.detail).toContain('创新')
    expect(model.batchReviewQueue.riskRadar.repairTasks.map((task: any) => task.issue_type)).toEqual(expect.arrayContaining([
      'reader_pull_missed',
      'innovation_execution_missed',
    ]))
    const readerTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'reader_pull_missed')
    const innovationTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'innovation_execution_missed')
    expect(readerTask?.reader_pull_review?.missed.map((item: any) => item.label)).toContain('令牌代价')
    expect(innovationTask?.innovation_review?.missed.map((item: any) => item.label)).toContain('IP化场面')
    expect(model.batchReviewQueue.handoff.riskLabels).toEqual(expect.arrayContaining(['读者拉力', '创新/IP']))
  })

})

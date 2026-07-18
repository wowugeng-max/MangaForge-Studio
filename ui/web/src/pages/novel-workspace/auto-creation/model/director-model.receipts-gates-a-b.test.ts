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

describe('buildAutoCreationDirectorModel receipts/gates a b', () => {
  test('holds delivered safe batch when serial rhythm repeats across the generated batch', () => {
    const repeatedText = '执事逼主角交出阵盘，主角用阵盘反噬打脸，章末黑影盯上阵盘。'
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
        { id: 8, chapter_no: 8, title: '试炼前夜', chapter_text: repeatedText.repeat(80), conflict: '执事逼主角交出阵盘', raw_payload: { payoff: '阵盘反噬打脸', ending_hook: '黑影盯上阵盘' } },
        { id: 9, chapter_no: 9, title: '阵盘裂纹', chapter_text: repeatedText.repeat(80), conflict: '执事逼主角交出阵盘', raw_payload: { payoff: '阵盘反噬打脸', ending_hook: '黑影盯上阵盘' } },
        { id: 10, chapter_no: 10, title: '外门震动', chapter_text: repeatedText.repeat(80), conflict: '执事逼主角交出阵盘', raw_payload: { payoff: '阵盘反噬打脸', ending_hook: '黑影盯上阵盘' } },
      ],
      reviews: [
        { id: 101, chapter_id: 8, review_type: 'prose_quality', created_at: '2026-06-03T01:00:00.000Z', payload: JSON.stringify({ score: 84, passed: true }) },
        { id: 102, chapter_id: 9, review_type: 'prose_quality', created_at: '2026-06-03T01:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 103, chapter_id: 10, review_type: 'prose_quality', created_at: '2026-06-03T01:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
      ],
      runRecords: [
        {
          id: 10,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-03T00:00:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({
            source: 'auto_creation_safe_batch',
            safety_limit: 3,
            next_batch_brief: {
              chapterRangeLabel: '第8-10章',
              batchGoal: '三章内制造外门压迫并推到内门视野。',
              readerPayoffPlan: '逐章给出不同形态的规则反制回报。',
              mainlineFocus: '外门危机 -> 内门招揽',
              chapters: [
                { chapterNo: 8, title: '试炼前夜', chapterTask: '执事逼交阵盘。', conflict: '执事逼主角交出阵盘', endingHook: '黑影盯上阵盘' },
                { chapterNo: 9, title: '阵盘裂纹', chapterTask: '执事逼交阵盘。', conflict: '执事逼主角交出阵盘', endingHook: '黑影盯上阵盘' },
                { chapterNo: 10, title: '外门震动', chapterTask: '执事逼交阵盘。', conflict: '执事逼主角交出阵盘', endingHook: '黑影盯上阵盘' },
              ],
            },
          }),
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
    expect(model.batchReviewQueue.riskRadar.status).toBe('warn')
    expect(model.batchReviewQueue.riskRadar.serialRhythmRiskCount).toBeGreaterThanOrEqual(2)
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'serial_rhythm')?.detail).toContain('冲突')
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'serial_rhythm')?.detail).toContain('章末')
    expect(model.batchReviewQueue.riskRadar.repairTasks.map((task: any) => task.issue_type)).toContain('serial_rhythm_fatigue')
    const rhythmTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'serial_rhythm_fatigue')
    expect(rhythmTask?.serial_rhythm_review?.risks.join('；')).toContain('执事逼主角交出阵盘')
    expect(rhythmTask?.action).toContain('轮换')
    expect(model.batchReviewQueue.handoff.riskLabels).toContain('连载节奏')
    expect(model.mainAction.key).toBe('create_safe_batch_risk_repair')
  })
  test('holds delivered safe batch when oh-story post batch quality check has warnings', () => {
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
        { id: 8, chapter_no: 8, title: '试炼前夜', chapter_text: '夜钟台上，李玄借旧阵规避执事盘查，公开赢下一次试炼资格。'.repeat(180), conflict: '执事设局阻拦', raw_payload: { payoff: '试炼资格落定', ending_hook: '夜钟第一次响起' } },
        { id: 9, chapter_no: 9, title: '阵盘裂纹', chapter_text: '阵盘裂纹映出第二层禁纹，李玄用裂纹反证旧案另有源头。'.repeat(180), conflict: '阵盘暴露风险', raw_payload: { payoff: '旧案线索入手', ending_hook: '禁纹指向藏书楼' } },
        { id: 10, chapter_no: 10, title: '外门震动', chapter_text: '外门广场上，长老令牌落下，众人第一次承认李玄有入内门的资格。'.repeat(180), conflict: '外门众人抢功', raw_payload: { payoff: '内门长老注意主角', ending_hook: '令牌背面浮出新名' } },
      ],
      reviews: [
        { id: 101, chapter_id: 8, review_type: 'prose_quality', created_at: '2026-06-03T01:00:00.000Z', payload: JSON.stringify({ score: 84, passed: true }) },
        { id: 102, chapter_id: 9, review_type: 'prose_quality', created_at: '2026-06-03T01:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 103, chapter_id: 10, review_type: 'prose_quality', created_at: '2026-06-03T01:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
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
            post_batch_quality_check: {
              source: 'oh_story_step_3',
              status: 'warn',
              completed_count: 3,
              chapter_nos: [8, 9, 10],
              revised_count: 1,
              average_score: 85,
              checks: [
                { key: 'title_uniqueness', label: '标题去重', status: 'ok', checked_count: 3, warn_count: 0 },
                { key: 'prose_meta', label: '正文元信息', status: 'warn', checked_count: 3, warn_count: 1, summaries: ['第9章仍残留作者说明'] },
                { key: 'chapter_hook', label: '章尾钩子', status: 'ok', checked_count: 3, warn_count: 0 },
                { key: 'blueprint_consumption', label: '细纲兑现', status: 'ok', checked_count: 3, warn_count: 0 },
                { key: 'foreshadowing_delta', label: '伏笔增量', status: 'warn', checked_count: 3, warn_count: 1, summaries: ['第10章新增令牌伏笔未写入状态'] },
                { key: 'deterministic_cleanup', label: '确定性清理', status: 'ok', checked_count: 3, warn_count: 0 },
                { key: 'story_state', label: '状态机更新', status: 'ok', checked_count: 3, warn_count: 0 },
              ],
            },
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
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'post_batch_quality')?.status).toBe('warn')
    expect((model.batchReviewQueue.riskRadar as any).postBatchQualityRiskCount).toBe(2)
    expect(model.batchReviewQueue.riskRadar.repairTasks.map((task: any) => task.issue_type)).toContain('post_batch_quality_warning')
    const qualityTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'post_batch_quality_warning')
    expect(qualityTask?.post_batch_quality_check?.checks.map((check: any) => check.key)).toEqual(['prose_meta', 'foreshadowing_delta'])
    expect(qualityTask?.message).toContain('oh-story')
    expect(model.mainAction.key).toBe('create_safe_batch_risk_repair')
  })
  test('releases oh-story post batch quality risk after batch-level repair resolves and chapters are rechecked', () => {
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
        { id: 8, chapter_no: 8, title: '试炼前夜', chapter_text: '夜钟台上，李玄借旧阵规避执事盘查，公开赢下一次试炼资格。'.repeat(180), conflict: '执事设局阻拦', raw_payload: { payoff: '试炼资格落定', ending_hook: '夜钟第一次响起' } },
        { id: 9, chapter_no: 9, title: '阵盘裂纹', chapter_text: '阵盘裂纹映出第二层禁纹，李玄用裂纹反证旧案另有源头。'.repeat(180), conflict: '阵盘暴露风险', raw_payload: { payoff: '旧案线索入手', ending_hook: '禁纹指向藏书楼' } },
        { id: 10, chapter_no: 10, title: '外门震动', chapter_text: '外门广场上，长老令牌落下，众人第一次承认李玄有入内门的资格。'.repeat(180), conflict: '外门众人抢功', raw_payload: { payoff: '内门长老注意主角', ending_hook: '令牌背面浮出新名' } },
      ],
      reviews: [
        { id: 101, chapter_id: 8, review_type: 'prose_quality', created_at: '2026-06-03T01:00:00.000Z', payload: JSON.stringify({ score: 84, passed: true }) },
        { id: 102, chapter_id: 9, review_type: 'prose_quality', created_at: '2026-06-03T01:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 103, chapter_id: 10, review_type: 'prose_quality', created_at: '2026-06-03T01:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
        { id: 201, chapter_id: 8, review_type: 'prose_quality', created_at: '2026-06-03T02:10:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
        { id: 202, chapter_id: 9, review_type: 'prose_quality', created_at: '2026-06-03T02:11:00.000Z', payload: JSON.stringify({ score: 87, passed: true }) },
        { id: 203, chapter_id: 10, review_type: 'prose_quality', created_at: '2026-06-03T02:12:00.000Z', payload: JSON.stringify({ score: 88, passed: true }) },
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
            post_batch_quality_check: {
              source: 'oh_story_step_3',
              status: 'warn',
              completed_count: 3,
              chapter_nos: [8, 9, 10],
              revised_count: 1,
              average_score: 85,
              checks: [
                { key: 'title_uniqueness', label: '标题去重', status: 'ok', checked_count: 3, warn_count: 0 },
                { key: 'prose_meta', label: '正文元信息', status: 'warn', checked_count: 3, warn_count: 1, summaries: ['第9章仍残留作者说明'] },
                { key: 'chapter_hook', label: '章尾钩子', status: 'ok', checked_count: 3, warn_count: 0 },
                { key: 'blueprint_consumption', label: '细纲兑现', status: 'ok', checked_count: 3, warn_count: 0 },
                { key: 'foreshadowing_delta', label: '伏笔增量', status: 'warn', checked_count: 3, warn_count: 1, summaries: ['第10章新增令牌伏笔未写入状态'] },
                { key: 'deterministic_cleanup', label: '确定性清理', status: 'ok', checked_count: 3, warn_count: 0 },
                { key: 'story_state', label: '状态机更新', status: 'ok', checked_count: 3, warn_count: 0 },
              ],
            },
            chapters: [
              { id: 8, chapter_no: 8, title: '试炼前夜', status: 'success', score: 84, word_count: 3180 },
              { id: 9, chapter_no: 9, title: '阵盘裂纹', status: 'success', score: 85, word_count: 3090 },
              { id: 10, chapter_no: 10, title: '外门震动', status: 'success', score: 86, word_count: 3021 },
            ],
          }),
        },
        {
          id: 11,
          run_type: 'longform_production_repair',
          created_at: '2026-06-03T02:00:00.000Z',
          completed_at: '2026-06-03T02:05:00.000Z',
          status: 'completed',
          input_ref: JSON.stringify({ source: 'auto_creation_safe_batch_risk', batch_created_at: '2026-06-03T00:00:00.000Z' }),
          output_ref: JSON.stringify({
            tasks: [
              {
                task_type: 'repair_quality',
                issue_type: 'post_batch_quality_warning',
                task_status: 'resolved',
                post_batch_quality_check: {
                  source: 'oh_story_step_3',
                  status: 'ok',
                  chapter_nos: [8, 9, 10],
                  checks: [
                    { key: 'prose_meta', label: '正文元信息', status: 'ok', warn_count: 0 },
                    { key: 'foreshadowing_delta', label: '伏笔增量', status: 'ok', warn_count: 0 },
                  ],
                },
              },
            ],
          }),
        },
      ],
    } as any)

    expect(model.batchReviewQueue.status).toBe('done')
    expect(model.batchReviewQueue.riskRadar.status).toBe('ok')
    expect((model.batchReviewQueue.riskRadar as any).postBatchQualityRiskCount).toBe(0)
    expect(model.batchReviewQueue.riskRadar.repairTasks.map((task: any) => task.issue_type)).not.toContain('post_batch_quality_warning')
    expect(model.batchReviewQueue.nextAction.key).toBe('start_safe_batch_generation')
  })
  test('holds delivered safe batch when newly discovered assets exceed the batch growth budget', () => {
    const discovered = [
      { entity_type: 'character', name: '周执事' },
      { entity_type: 'character', name: '灰袍少年' },
      { entity_type: 'item', name: '裂纹阵盘' },
      { entity_type: 'item', name: '黑铁令' },
      { entity_type: 'ability', name: '夜阵感知' },
      { entity_type: 'faction', name: '外门戒律堂' },
      { entity_type: 'location', name: '夜钟台' },
      { entity_type: 'foreshadowing', name: '黑影观阵' },
    ]
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
        { id: 8, chapter_no: 8, title: '试炼前夜', chapter_text: '压迫与试炼'.repeat(500), conflict: '执事设局阻拦', raw_payload: { payoff: '拿到试炼资格', ending_hook: '夜钟第一次响起' } },
        { id: 9, chapter_no: 9, title: '阵盘裂纹', chapter_text: '阵盘与反噬'.repeat(500), conflict: '阵盘暴露风险', raw_payload: { payoff: '反制阵盘陷阱', ending_hook: '裂纹浮出新阵纹' } },
        { id: 10, chapter_no: 10, title: '外门震动', chapter_text: '宗门震动'.repeat(500), conflict: '外门众人抢功', raw_payload: { payoff: '内门长老注意主角', ending_hook: '内门令牌落下' } },
      ],
      reviews: [
        { id: 101, chapter_id: 8, review_type: 'prose_quality', created_at: '2026-06-03T01:00:00.000Z', payload: JSON.stringify({ score: 84, passed: true }) },
        { id: 102, chapter_id: 9, review_type: 'prose_quality', created_at: '2026-06-03T01:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 103, chapter_id: 10, review_type: 'prose_quality', created_at: '2026-06-03T01:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
        { id: 301, chapter_id: 8, review_type: 'asset_intake', created_at: '2026-06-03T01:03:00.000Z', payload: JSON.stringify({ chapter_id: 8, chapter_no: 8, discovered_assets: discovered.slice(0, 3), applied_asset_names: [] }) },
        { id: 302, chapter_id: 9, review_type: 'asset_intake', created_at: '2026-06-03T01:04:00.000Z', payload: JSON.stringify({ chapter_id: 9, chapter_no: 9, discovered_assets: discovered.slice(3, 6), applied_asset_names: [] }) },
        { id: 303, chapter_id: 10, review_type: 'asset_intake', created_at: '2026-06-03T01:05:00.000Z', payload: JSON.stringify({ chapter_id: 10, chapter_no: 10, discovered_assets: discovered.slice(6), applied_asset_names: [] }) },
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
    expect(model.batchReviewQueue.riskRadar.assetGrowthRiskCount).toBeGreaterThan(0)
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'asset_growth')?.detail).toContain('新资产')
    expect(model.batchReviewQueue.riskRadar.repairTasks.map((task: any) => task.issue_type)).toContain('asset_growth_over_budget')
    const assetTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'asset_growth_over_budget')
    expect(assetTask?.task_type).toBe('repair_assets')
    expect(assetTask?.asset_growth_review?.pending_assets.map((asset: any) => asset.name)).toContain('裂纹阵盘')
    expect(assetTask?.action).toContain('确认入库、改名、合并已有或标记一次性过场')
    expect(model.batchReviewQueue.handoff.riskLabels).toContain('新资产')
  })
  test('holds delivered safe batch when volume segment objectives are missed', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          currentStage: '试炼收束',
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        mainline: {
          ...basePlanning.mainline,
          currentVolumeGoal: '进入内门视野',
          currentStageConflict: '外门试炼必须结算身份变化',
        },
        volumeSegmentGate: {
          status: 'needs_attention',
          score: 66,
          label: '卷段待修 66',
          summary: '当前卷段的身份变化和内门视野还没有完成阶段验收。',
          currentSegmentLabel: '第1-50章',
          actionKey: 'open_quality_revision',
          chapterProgress: { written: 20, total: 50, percent: 40 },
          signals: [
            { key: 'volume_goal', label: '阶段目标', status: 'ok', score: 88, count: 0, detail: '当前卷目标：进入内门视野', actionKey: 'enter_chapter_writing' },
            { key: 'climax_payoff', label: '高潮/回报', status: 'warn', score: 62, count: 2, detail: '阶段身份变化和内门令牌入场未结算。', actionKey: 'open_quality_revision' },
          ],
          nextActions: ['补齐外门试炼收束、身份变化和内门令牌入场，再开启下一批。'],
        },
      },
      writing: {
        ...baseWriting,
        nextChapter: { ...baseWriting.nextChapter, id: 21, chapterNo: 21, title: '内门来人' },
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
      storyState: { last_updated_chapter: 20 },
      chapters: [
        { id: 18, chapter_no: 18, title: '试炼终局', chapter_text: '试炼冲突'.repeat(500), raw_payload: { mainline_progress: '击退外门刁难' } },
        { id: 19, chapter_no: 19, title: '旧账翻涌', chapter_text: '旧账翻涌'.repeat(500), raw_payload: { mainline_progress: '执事暂退' } },
        { id: 20, chapter_no: 20, title: '钟声之后', chapter_text: '钟声之后'.repeat(500), raw_payload: { mainline_progress: '试炼余波未定' } },
      ],
      reviews: [
        { id: 101, chapter_id: 18, review_type: 'prose_quality', created_at: '2026-06-03T01:00:00.000Z', payload: JSON.stringify({ score: 84, passed: true }) },
        { id: 102, chapter_id: 19, review_type: 'prose_quality', created_at: '2026-06-03T01:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 103, chapter_id: 20, review_type: 'prose_quality', created_at: '2026-06-03T01:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
        {
          id: 401,
          chapter_id: 20,
          review_type: 'volume_beat_sync',
          created_at: '2026-06-03T01:05:00.000Z',
          payload: JSON.stringify({
            volume_beat_sync: {
              status: 'warn',
              label: '卷段漏兑现 2',
              missed_count: 2,
              missed: [
                { label: '内门令牌入场', text: '第20章应让内门令牌或同等身份入口落地。' },
                { label: '身份变化结算', text: '外门试炼收束时主角身份没有发生可见变化。' },
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
              { id: 18, chapter_no: 18, title: '试炼终局', status: 'success', score: 84, word_count: 3180 },
              { id: 19, chapter_no: 19, title: '旧账翻涌', status: 'success', score: 85, word_count: 3090 },
              { id: 20, chapter_no: 20, title: '钟声之后', status: 'success', score: 86, word_count: 3021 },
            ],
          }),
        },
      ],
    } as any)

    expect(model.batchReviewQueue.status).toBe('risk')
    expect(model.batchReviewQueue.riskRadar.volumeSegmentRiskCount).toBe(2)
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'volume_segment')?.detail).toContain('阶段验收')
    expect(model.batchReviewQueue.riskRadar.repairTasks.map((task: any) => task.issue_type)).toContain('volume_segment_missed')
    const volumeTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'volume_segment_missed')
    expect(volumeTask?.volume_segment_review?.planned.join('；')).toContain('进入内门视野')
    expect(volumeTask?.volume_segment_review?.missed.map((item: any) => item.label)).toContain('内门令牌入场')
    expect(model.batchReviewQueue.handoff.riskLabels).toContain('卷级阶段')
    expect(model.mainAction.key).toBe('create_safe_batch_risk_repair')
  })
  test('holds delivered safe batch when story drive and character arcs are missed', () => {
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
          id: 401,
          chapter_id: 16,
          review_type: 'story_drive_sync',
          created_at: '2026-06-03T01:03:00.000Z',
          payload: JSON.stringify({
            story_drive_sync: {
              status: 'warn',
              label: '故事力缺口 2',
              score: 61,
              missed_count: 2,
              missed: [
                { label: '主角主动选择', text: '本章冲突由执事推动，主角没有主动做选择。' },
                { label: '选择代价', text: '主角反制没有付出资源、关系或危险代价。' },
              ],
            },
          }),
        },
        {
          id: 402,
          chapter_id: 17,
          review_type: 'character_arc_sync',
          created_at: '2026-06-03T01:04:00.000Z',
          payload: JSON.stringify({
            character_arc_sync: {
              status: 'warn',
              label: '人物弧光缺口 2',
              score: 58,
              missed_count: 2,
              missed: [
                { label: '缺陷受压', text: '主角怕暴露阵盘的缺陷没有被逼到选择边缘。' },
                { label: '关系变化', text: '林晓与主角的信任关系没有因本章事件改变。' },
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
    expect((model.batchReviewQueue.riskRadar as any).storyDriveRiskCount).toBe(2)
    expect((model.batchReviewQueue.riskRadar as any).characterArcRiskCount).toBe(2)
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'story_drive')?.detail).toContain('故事驱动力缺口')
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'character_arc')?.detail).toContain('人物弧光缺口')
    expect(model.batchReviewQueue.riskRadar.repairTasks.map((task: any) => task.issue_type)).toEqual(expect.arrayContaining([
      'story_drive_gap',
      'character_arc_gap',
    ]))
    const storyTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'story_drive_gap')
    const characterTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'character_arc_gap')
    expect(storyTask?.story_drive_sync?.missed.map((item: any) => item.label)).toContain('主角主动选择')
    expect(characterTask?.character_arc_sync?.missed.map((item: any) => item.label)).toContain('关系变化')
    expect(model.batchReviewQueue.handoff.riskLabels).toEqual(expect.arrayContaining(['故事力', '人物弧光']))
    expect(model.batchReviewQueue.completionDashboard.score).toBeLessThan(90)
  })
  test('holds delivered safe batch when style sample execution drifts or copies source phrases', () => {
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
          id: 501,
          chapter_id: 16,
          review_type: 'style_sample_sync',
          created_at: '2026-06-03T01:03:00.000Z',
          payload: JSON.stringify({
            style_sample_sync: {
              status: 'warn',
              label: '风格缺口 3',
              score: 61,
              missed_count: 2,
              copy_risk_count: 1,
              missed: [
                { label: '对白比例', text: '本章大段旁白解释过多，缺少角色互怼推进。' },
                { label: '叙述节奏', text: '没有学到样章的短段落压迫和反转节奏。' },
              ],
              copied_phrases: ['天塌下来有高个子顶着'],
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
    expect((model.batchReviewQueue.riskRadar as any).styleSampleRiskCount).toBe(3)
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'style_sample')?.detail).toContain('风格')
    expect(model.batchReviewQueue.riskRadar.repairTasks.map((task: any) => task.issue_type)).toContain('style_sample_gap')
    const styleTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'style_sample_gap')
    expect(styleTask?.style_sample_sync?.missed.map((item: any) => item.label)).toContain('对白比例')
    expect(styleTask?.style_sample_sync?.copied_phrases).toContain('天塌下来有高个子顶着')
    expect(model.batchReviewQueue.handoff.riskLabels).toContain('风格')
    expect(model.batchReviewQueue.completionDashboard.score).toBeLessThan(90)
  })
})

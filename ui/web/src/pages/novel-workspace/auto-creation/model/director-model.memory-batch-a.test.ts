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

describe('buildAutoCreationDirectorModel memory/batch a', () => {
  test('downgrades continuous production when longform memory summary is unavailable', () => {
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
            { key: 'memory_unavailable', status: 'warning', label: '记忆摘要不可用', detail: '缺少可引用的记忆事实。', actionKey: 'fix_continuity' },
          ],
          checks: [],
        },
        readinessChecks: [
          { key: 'memory_unavailable', status: 'warning', label: '记忆摘要不可用', detail: '缺少可引用的记忆事实。', actionKey: 'fix_continuity' },
        ],
        primaryActionKey: 'write_draft',
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

    expect(model.batchGuardrail.status).toBe('caution')
    expect(model.batchGuardrail.safeChapterCount).toBe(1)
    expect(model.batchGuardrail.recommendedAction.key).toBe('fix_continuity')
    expect(model.batchGuardrail.guardrails.find(item => item.label === '长线记忆')?.status).toBe('warn')
    expect(model.batchGuardrail.guardrails.find(item => item.label === '长线记忆')?.detail).toContain('记忆摘要不可用')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'batch_release')?.badges).toContain('安全 1章')
  })

  test('blocks continuous production while the current chapter still needs delivery work', () => {
    const model = buildAutoCreationDirectorModel({
      planning: basePlanning,
      writing: {
        ...baseWriting,
        nextChapter: { ...baseWriting.nextChapter, wordCount: 3200, hasProse: true },
        chapterAcceptanceDesk: {
          ...baseWriting.chapterAcceptanceDesk,
          visible: true,
          acceptanceStatus: 'needs_quality_check',
          statusLabel: '需复检',
          acceptanceReasons: ['本章已有正文，但还没有当前章节的质量复检记录。'],
          recommendedAcceptanceAction: { key: 'refresh_current_quality', label: '复检当前版本' },
        },
        topStatus: { ...baseWriting.topStatus, nextActionLabel: '复检当前版本', primaryActionKey: 'refresh_current_quality' },
        primaryActionKey: 'refresh_current_quality',
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.batchGuardrail.status).toBe('blocked')
    expect(model.batchGuardrail.safeChapterCount).toBe(0)
    expect(model.batchGuardrail.recommendedAction.key).toBe('refresh_current_quality')
    expect(model.batchGuardrail.guardrails.find(item => item.label === '当前章交稿')?.status).toBe('block')
  })

  test('uses chapter handoff as the final gate before releasing the next batch', () => {
    const model = buildAutoCreationDirectorModel({
      planning: basePlanning,
      writing: {
        ...baseWriting,
        nextChapter: { ...baseWriting.nextChapter, chapterNo: 8, wordCount: 3200, hasProse: true },
        chapterAcceptanceDesk: {
          ...baseWriting.chapterAcceptanceDesk,
          visible: true,
          acceptanceStatus: 'ready_to_accept',
          statusLabel: '可验收',
          acceptanceReasons: ['质量复检通过，故事状态已同步，可以进入下一章。'],
          storyStateSynced: true,
          recommendedAcceptanceAction: { key: 'accept_chapter_and_continue', label: '验收并进入下一章' },
        },
        chapterHandoffDesk: {
          visible: true,
          status: 'ready',
          label: '可接下一章',
          fromChapterNo: 8,
          toChapterNo: 9,
          previousEnding: '阵盘亮起第二道裂纹',
          expectationCarryOver: ['执事背后的供奉是谁'],
          nextOpeningObligations: ['试炼前夜必须先回应裂纹异变'],
          deliveryRiskCarryOver: {
            totalCount: 3,
            label: '待修复 3',
            priorityLabel: '优先修章末翻页',
            items: ['修吸引力：吸引力缺口 2', '补创新：创新缺口 1'],
            openingActions: ['开篇先补异常压迫'],
            middleActions: ['中段补规则反制创新'],
            endingActions: ['章末重做翻页问题'],
          },
          storyStateSynced: true,
          storylineStatusLabel: '剧情线 OK',
          actionKey: 'accept_chapter_and_continue',
          actionLabel: '进入下一章开写',
        },
        topStatus: { ...baseWriting.topStatus, nextActionLabel: '验收并进入下一章', primaryActionKey: 'accept_chapter_and_continue' },
        primaryActionKey: 'accept_chapter_and_continue',
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.batchGuardrail.status).toBe('blocked')
    expect(model.batchGuardrail.safeChapterCount).toBe(0)
    expect(model.batchGuardrail.recommendedAction.key).toBe('accept_chapter_and_continue')
    const handoffSignal = model.batchGuardrail.guardrails.find(item => item.label === '章节交接')
    expect(handoffSignal?.status).toBe('block')
    expect(handoffSignal?.detail).toContain('第8章到第9章')
    expect(handoffSignal?.detail).toContain('阵盘亮起第二道裂纹')
    expect(handoffSignal?.detail).toContain('交稿风险：待修复 3')
    expect(handoffSignal?.detail).toContain('优先修章末翻页')
    expect(handoffSignal?.detail).toContain('开篇修复：开篇先补异常压迫')
    expect(handoffSignal?.detail).toContain('中段推进：中段补规则反制创新')
    expect(handoffSignal?.detail).toContain('章末追读：章末重做翻页问题')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'chapter_work')?.detail).toContain('可接下一章')
    expect(model.productionLicense.status).toBe('blocked')
    expect(model.productionLicense.nextAction.key).toBe('accept_chapter_and_continue')
  })

  test('shows chapter handoff as the active pipeline step before safe batching', () => {
    const model = buildAutoCreationDirectorModel({
      planning: basePlanning,
      writing: {
        ...baseWriting,
        nextChapter: { ...baseWriting.nextChapter, chapterNo: 8, wordCount: 3200, hasProse: true },
        chapterAcceptanceDesk: {
          ...baseWriting.chapterAcceptanceDesk,
          visible: true,
          acceptanceStatus: 'ready_to_accept',
          statusLabel: '可验收',
          acceptanceReasons: ['质量复检通过，故事状态已同步，可以进入下一章。'],
          storyStateSynced: true,
          recommendedAcceptanceAction: { key: 'accept_chapter_and_continue', label: '验收并进入下一章' },
        },
        chapterHandoffDesk: {
          visible: true,
          status: 'ready',
          label: '可接下一章',
          fromChapterNo: 8,
          toChapterNo: 9,
          previousEnding: '阵盘亮起第二道裂纹',
          expectationCarryOver: ['执事背后的供奉是谁'],
          nextOpeningObligations: ['试炼前夜必须先回应裂纹异变'],
          deliveryRiskCarryOver: {
            totalCount: 3,
            label: '待修复 3',
            priorityLabel: '优先修章末翻页',
            items: ['修吸引力：吸引力缺口 2', '补创新：创新缺口 1'],
            openingActions: ['开篇先补异常压迫'],
            middleActions: ['中段补规则反制创新'],
            endingActions: ['章末重做翻页问题'],
          },
          storyStateSynced: true,
          storylineStatusLabel: '剧情线 OK',
          actionKey: 'accept_chapter_and_continue',
          actionLabel: '进入下一章开写',
        },
        topStatus: { ...baseWriting.topStatus, nextActionLabel: '验收并进入下一章', primaryActionKey: 'accept_chapter_and_continue' },
        primaryActionKey: 'accept_chapter_and_continue',
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    const handoffStep = model.pipeline.find(step => step.key === 'chapter_handoff')

    expect(handoffStep?.label).toBe('章节交接')
    expect(handoffStep?.status).toBe('active')
    expect(handoffStep?.detail).toContain('第8章到第9章')
    expect(handoffStep?.detail).toContain('阵盘亮起第二道裂纹')
    expect(handoffStep?.detail).toContain('试炼前夜必须先回应裂纹异变')
    expect(handoffStep?.detail).toContain('交稿风险：待修复 3')
    expect(handoffStep?.detail).toContain('补创新：创新缺口 1')
    expect(handoffStep?.detail).toContain('开篇修复：开篇先补异常压迫')
    expect(handoffStep?.detail).toContain('中段推进：中段补规则反制创新')
    expect(handoffStep?.detail).toContain('章末追读：章末重做翻页问题')
    expect(model.pipeline.map(step => step.key)).toEqual([
      'longform_planning',
      'creation_contract',
      'rolling_script_room',
      'longform_capacity',
      'volume_beat_budget',
      'longform_rhythm',
      'story_assets',
      'retention_curve',
      'chapter_planning',
      'chapter_execution',
      'quality_gate',
      'canon_sync',
      'chapter_handoff',
      'batch_guardrail',
      'async_tasks',
    ])
  })

  test('downgrades continuous production when long-range chapter reserves are thin', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: false, planned: 18, required: 100, missingChapters: [], label: '18/100' },
        },
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
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.batchGuardrail.status).toBe('caution')
    expect(model.batchGuardrail.safeChapterCount).toBe(1)
    expect(model.batchGuardrail.recommendedAction.key).toBe('future100_generate')
    expect(model.batchGuardrail.guardrails.find(item => item.label === '未来100章储备')?.status).toBe('warn')
  })

  test('summarizes the latest safe batch generation as a review queue', () => {
    const model = buildAutoCreationDirectorModel({
      planning: basePlanning,
      writing: baseWriting,
      activeTasks: [],
      selectedModelId: 12,
      runRecords: [
        {
          id: 8,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-01T00:00:00.000Z',
          input_ref: JSON.stringify({ source: 'manual_batch', total: 12 }),
          output_ref: JSON.stringify({ total: 12, success: 12, failed: 0, chapters: [] }),
        },
        {
          id: 9,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-02T00:00:00.000Z',
          status: 'warn',
          input_ref: JSON.stringify({ source: 'auto_creation_safe_batch', safety_limit: 3, available_total: 22 }),
          output_ref: JSON.stringify({
            total: 3,
            success: 2,
            failed: 1,
            chapters: [
              { id: 8, chapter_no: 8, title: '试炼前夜', status: 'success', score: 82, revised: true, word_count: 3180 },
              { id: 9, chapter_no: 9, title: '阵盘裂纹', status: 'failed', error: '模型未返回正文' },
              { id: 10, chapter_no: 10, title: '外门震动', status: 'success', score: 86, revised: false, word_count: 3021 },
            ],
            errors: ['第 9 章《阵盘裂纹》：模型未返回正文'],
          }),
        },
      ],
    })

    expect(model.batchReviewQueue.visible).toBe(true)
    expect(model.batchReviewQueue.status).toBe('warn')
    expect(model.batchReviewQueue.label).toBe('安全连写复盘')
    expect(model.batchReviewQueue.total).toBe(3)
    expect(model.batchReviewQueue.success).toBe(2)
    expect(model.batchReviewQueue.failed).toBe(1)
    expect(model.batchReviewQueue.safeLimit).toBe(3)
    expect(model.batchReviewQueue.nextAction.key).toBe('open_task_center')
    expect(model.batchReviewQueue.completionDashboard.visible).toBe(true)
    expect(model.batchReviewQueue.completionDashboard.status).toBe('needs_repair')
    expect(model.batchReviewQueue.completionDashboard.nextAction.key).toBe('open_task_center')
    expect(model.batchReviewQueue.handoff.status).toBe('failed')
    expect(model.batchReviewQueue.handoff.label).toBe('先处理失败章节')
    expect(model.batchReviewQueue.handoff.action.key).toBe('open_task_center')
    expect(model.batchReviewQueue.handoff.targetChapterNos).toEqual([9])
    expect(model.batchReviewQueue.completionDashboard.metrics.map(metric => metric.label)).toEqual([
      '生成完成',
      '交稿完成',
      '质检健康',
      '计划兑现',
    ])
    expect(model.batchReviewQueue.items.map(item => item.chapterNo)).toEqual([8, 9, 10])
    expect(model.batchReviewQueue.items.find(item => item.status === 'failed')?.error).toContain('模型未返回正文')
  })

  test('prioritizes failed safe batch review before opening another batch', () => {
    const model = buildAutoCreationDirectorModel({
      planning: basePlanning,
      writing: baseWriting,
      activeTasks: [],
      selectedModelId: 12,
      runRecords: [
        {
          id: 9,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-02T00:00:00.000Z',
          status: 'warn',
          input_ref: JSON.stringify({ source: 'auto_creation_safe_batch', safety_limit: 3 }),
          output_ref: JSON.stringify({
            total: 3,
            success: 2,
            failed: 1,
            chapters: [{ chapter_no: 9, title: '阵盘裂纹', status: 'failed', error: '模型未返回正文' }],
          }),
        },
      ],
    })

    expect(model.status).toBe('needs_acceptance')
    expect(model.statusLabel).toBe('批次待复盘')
    expect(model.mainAction.key).toBe('open_task_center')
    expect(model.mainAction.label).toBe('查看失败任务')
    expect(model.confirmations).toContain('安全连写批次需要复盘')
  })

  test('routes successful safe batch review into quality revision before the next batch', () => {
    const model = buildAutoCreationDirectorModel({
      planning: basePlanning,
      writing: baseWriting,
      activeTasks: [],
      selectedModelId: 12,
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
              { chapter_no: 8, title: '试炼前夜', status: 'success', score: 82, word_count: 3180 },
              { chapter_no: 9, title: '阵盘裂纹', status: 'success', score: 85, word_count: 3090 },
              { chapter_no: 10, title: '外门震动', status: 'success', score: 86, word_count: 3021 },
            ],
          }),
        },
      ],
    })

    expect(model.status).toBe('needs_acceptance')
    expect(model.statusLabel).toBe('批次待验收')
    expect(model.mainAction.key).toBe('open_quality_revision')
    expect(model.mainAction.label).toBe('进入质检修订')
    expect(model.batchReviewQueue.handoff.status).toBe('deliver_chapters')
    expect(model.batchReviewQueue.handoff.label).toBe('逐章交稿')
    expect(model.batchReviewQueue.handoff.targetChapterNos).toEqual([8, 9, 10])
    expect(model.batchReviewQueue.handoff.action.key).toBe('open_quality_revision')
    expect(model.confirmations).toContain('安全连写批次需要逐章验收')
  })

  test('releases safe batch review after every generated chapter is delivered', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        futureRoute: [
          { chapterNo: 11, title: '内门来人', chapterTask: '内门势力抛出招揽条件', conflict: '招揽背后附带夺阵盘的暗线', endingHook: '内门令牌落在桌上', mainlineProgress: '主角进入内门视野' },
          { chapterNo: 12, title: '令牌代价', chapterTask: '主角试探令牌真实代价', conflict: '旧执事借规矩继续施压', endingHook: '令牌背面浮出血字', mainlineProgress: '宗门规矩开始反噬旧秩序' },
          { chapterNo: 13, title: '阵盘回响', chapterTask: '阵盘回应内门试探', conflict: '阵盘力量暴露与隐藏身份冲突', endingHook: '暗处长老认出阵纹', mainlineProgress: '阵法天赋进入高层视线' },
        ],
      },
      writing: {
        ...baseWriting,
        nextChapter: { ...baseWriting.nextChapter, id: 11, chapterNo: 11, title: '内门来人' },
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [
            { title: '余波清算', goal: '试炼结果引发宗门震动' },
            { title: '内门招揽', goal: '新势力提出条件' },
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
      storyState: { last_updated_chapter: 10 },
      chapters: [
        { id: 8, chapter_no: 8, title: '试炼前夜', chapter_text: '正文'.repeat(1600) },
        { id: 9, chapter_no: 9, title: '阵盘裂纹', chapter_text: '正文'.repeat(1550) },
        { id: 10, chapter_no: 10, title: '外门震动', chapter_text: '正文'.repeat(1510) },
      ],
      reviews: [
        { id: 101, chapter_id: 8, review_type: 'prose_quality', created_at: '2026-06-03T01:00:00.000Z', payload: JSON.stringify({ score: 82, passed: true }) },
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
            chapters: [
              { id: 8, chapter_no: 8, title: '试炼前夜', status: 'success', score: 82, word_count: 3180 },
              { id: 9, chapter_no: 9, title: '阵盘裂纹', status: 'success', score: 85, word_count: 3090 },
              { id: 10, chapter_no: 10, title: '外门震动', status: 'success', score: 86, word_count: 3021 },
            ],
          }),
        },
      ],
    } as any)

    expect(model.batchReviewQueue.status).toBe('done')
    expect(model.batchReviewQueue.delivered).toBe(3)
    expect(model.batchReviewQueue.handoff.status).toBe('continue_batch')
    expect(model.batchReviewQueue.handoff.label).toBe('放行下一批')
    expect(model.batchReviewQueue.handoff.action.key).toBe('start_safe_batch_generation')
    expect(model.batchReviewQueue.handoff.summary).toContain('下一批')
    expect(model.status).toBe('ready')
    expect(model.confirmations).not.toContain('安全连写批次需要逐章验收')
    expect(model.batchReviewQueue.nextAction.key).toBe('start_safe_batch_generation')
  })

  test('holds delivered safe batch when million word runway risks remain', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        futureRoute: [
          { chapterNo: 11, title: '内门来人', chapterTask: '内门势力抛出招揽条件', conflict: '招揽背后附带夺阵盘的暗线', endingHook: '内门令牌落在桌上', mainlineProgress: '主角进入内门视野' },
          { chapterNo: 12, title: '令牌代价', chapterTask: '主角试探令牌真实代价', conflict: '旧执事借规矩继续施压', endingHook: '令牌背面浮出血字', mainlineProgress: '宗门规矩开始反噬旧秩序' },
          { chapterNo: 13, title: '阵盘回响', chapterTask: '阵盘回应内门试探', conflict: '阵盘力量暴露与隐藏身份冲突', endingHook: '暗处长老认出阵纹', mainlineProgress: '阵法天赋进入高层视线' },
        ],
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
        { id: 8, chapter_no: 8, title: '试炼前夜', chapter_text: '正文'.repeat(1600) },
        { id: 9, chapter_no: 9, title: '阵盘裂纹', chapter_text: '正文'.repeat(1550) },
        { id: 10, chapter_no: 10, title: '外门震动', chapter_text: '正文'.repeat(1510) },
      ],
      reviews: [
        { id: 101, chapter_id: 8, review_type: 'prose_quality', created_at: '2026-06-03T01:00:00.000Z', payload: JSON.stringify({ score: 82, passed: true }) },
        { id: 102, chapter_id: 9, review_type: 'prose_quality', created_at: '2026-06-03T01:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 103, chapter_id: 10, review_type: 'prose_quality', created_at: '2026-06-03T01:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
        {
          id: 104,
          chapter_id: 9,
          review_type: 'runway_sync',
          created_at: '2026-06-03T01:03:00.000Z',
          payload: JSON.stringify({
            chapter_id: 9,
            chapter_no: 9,
            runway_sync: {
              status: 'warn',
              label: '航线风险 2',
              risk_count: 2,
              four_question_missed: [{ label: '主线推进了什么', text: '主角进入内门视野' }],
              reader_fuel_missed: [{ text: '阵盘裂纹反制爽点' }],
              redline_touched: [],
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
              { id: 8, chapter_no: 8, title: '试炼前夜', status: 'success', score: 82, word_count: 3180 },
              { id: 9, chapter_no: 9, title: '阵盘裂纹', status: 'success', score: 85, word_count: 3090 },
              { id: 10, chapter_no: 10, title: '外门震动', status: 'success', score: 86, word_count: 3021 },
            ],
          }),
        },
      ],
    } as any)

    expect(model.batchReviewQueue.status).toBe('risk')
    expect(model.batchReviewQueue.nextAction.key).toBe('create_safe_batch_risk_repair')
    expect(model.batchReviewQueue.riskRadar.runwayRiskCount).toBe(2)
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'runway')?.status).toBe('warn')
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'runway')?.detail).toContain('航线风险 2')
    expect(model.batchReviewQueue.riskRadar.repairTasks.map(task => task.issue_type)).toContain('runway_sync_risk')
    expect(model.batchReviewQueue.handoff.status).toBe('repair_risks')
    expect(model.batchReviewQueue.handoff.riskLabels).toContain('航线风险')
    expect(model.batchReviewQueue.completionDashboard.status).toBe('needs_repair')
    expect(model.status).toBe('needs_acceptance')
  })

  test('routes completed safe batch into next queue planning when the next batch is not ready', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        futureRoute: [
          {
            chapterNo: 11,
            title: '内门来人',
            chapterTask: '',
            conflict: '',
            endingHook: '内门令牌落在桌上',
            mainlineProgress: '',
          },
        ],
      },
      writing: {
        ...baseWriting,
        nextChapter: { ...baseWriting.nextChapter, id: 11, chapterNo: 11, title: '内门来人' },
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'needs_scene_plan',
          statusLabel: '需补计划',
          scenePlanStatus: 'missing',
          sceneCards: [],
          recommendedPlannerAction: { key: 'build_scene_plan', label: '生成场景卡' },
        },
        writingQueue: {
          visible: true,
          currentChapterNo: 11,
          readyCount: 0,
          blockedCount: 1,
          draftedCount: 0,
          planRepair: {
            visible: true,
            label: '补齐队列计划',
            chapterCount: 1,
            missingCount: 3,
            chapterNos: [11],
            intent: { source: 'writing_queue_batch_plan_repair', chapter_nos: [11] },
          },
          items: [
            { id: 11, chapterNo: 11, title: '内门来人', sourceLabel: '滚动规划', status: 'needs_plan', statusLabel: '缺计划', actionLabel: '补计划', actionHint: '缺本章目标、核心冲突、主线推进', missingPlanFields: ['chapterGoal', 'conflict', 'mainlineProgress'], missingPlanLabels: ['本章目标', '核心冲突', '主线推进'], repairIntent: { source: 'writing_queue_plan_repair', chapter_no: 11 }, goal: '', conflict: '', endingHook: '内门令牌落在桌上', wordCount: 0 },
          ],
        },
      },
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 10 },
      chapters: [
        { id: 8, chapter_no: 8, title: '试炼前夜', chapter_text: '正文'.repeat(1600) },
        { id: 9, chapter_no: 9, title: '阵盘裂纹', chapter_text: '正文'.repeat(1550) },
        { id: 10, chapter_no: 10, title: '外门震动', chapter_text: '正文'.repeat(1510) },
      ],
      reviews: [
        { id: 101, chapter_id: 8, review_type: 'prose_quality', created_at: '2026-06-03T01:00:00.000Z', payload: JSON.stringify({ score: 82, passed: true }) },
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
            chapters: [
              { id: 8, chapter_no: 8, title: '试炼前夜', status: 'success', score: 82, word_count: 3180 },
              { id: 9, chapter_no: 9, title: '阵盘裂纹', status: 'success', score: 85, word_count: 3090 },
              { id: 10, chapter_no: 10, title: '外门震动', status: 'success', score: 86, word_count: 3021 },
            ],
          }),
        },
      ],
    } as any)

    expect(model.batchReviewQueue.status).toBe('done')
    expect(model.batchGuardrail.status).toBe('blocked')
    expect(model.batchReviewQueue.handoff.status).toBe('prepare_next')
    expect(model.batchReviewQueue.handoff.label).toBe('补下一批计划')
    expect(model.batchReviewQueue.handoff.action.key).toBe('update_rolling_plan')
    expect(model.batchReviewQueue.handoff.targetChapterNos).toEqual([11])
    expect(model.batchReviewQueue.handoff.summary).toContain('下一批')
  })

  test('blocks safe batching while unresolved high-risk delivery annotations remain open', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        futureRoute: [
          { chapterNo: 11, title: '内门来人', chapterTask: '内门势力抛出招揽条件', conflict: '招揽背后附带夺阵盘的暗线', endingHook: '内门令牌落在桌上', mainlineProgress: '主角进入内门视野' },
          { chapterNo: 12, title: '令牌代价', chapterTask: '主角试探令牌真实代价', conflict: '旧执事借规矩继续施压', endingHook: '令牌背面浮出血字', mainlineProgress: '宗门规矩开始反噬旧秩序' },
          { chapterNo: 13, title: '阵盘回响', chapterTask: '阵盘回应内门试探', conflict: '阵盘力量暴露与隐藏身份冲突', endingHook: '暗处长老认出阵纹', mainlineProgress: '阵法天赋进入高层视线' },
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
            { title: '内门压迫', goal: '以新规逼主角交出阵盘' },
            { title: '反向立威', goal: '主角用规则漏洞反制执事' },
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
      reviews: [
        {
          id: 201,
          chapter_id: 7,
          review_type: 'chapter_core_drift',
          created_at: '2026-06-04T01:00:00.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            core_drift: { status: 'warn', drift_risks: ['主角长期欲望被支线盖住'] },
          }),
        },
        {
          id: 202,
          chapter_id: 7,
          review_type: 'reader_retention_sync',
          created_at: '2026-06-04T01:01:00.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            reader_retention_sync: { status: 'warn', missed_count: 1, missed: ['章末追读问题不清晰'] },
          }),
        },
        {
          id: 203,
          chapter_id: 8,
          review_type: 'storyline_sync',
          created_at: '2026-06-04T01:02:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            storyline_sync: { status: 'warn', forbidden_touched: ['提前触碰幕后主使'] },
          }),
        },
        {
          id: 204,
          chapter_id: 8,
          review_type: 'signature_scene_sync',
          created_at: '2026-06-04T01:03:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            signature_scene_sync: { status: 'warn', missed_count: 1, missed: ['任务书要求的公开反转场面没有写成可视化冲突'] },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.totalOpen).toBe(4)
    expect(model.deliveryRiskGate.highOpen).toBe(3)
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toEqual(['核心', '追读', '剧情线', '强场面'])
    expect(model.deliveryRiskGate.topRisks).toContain('强场面第8章：任务书要求的公开反转场面没有写成可视化冲突')
    expect(model.status).toBe('needs_governance')
    expect(model.statusLabel).toBe('交稿风险待处理')
    expect(model.mainAction.key).toBe('create_delivery_risk_repair')
    expect(model.mainAction.label).toBe('生成风险修复任务')
    expect(model.confirmations).toContain('未清交稿风险会阻止安全连写')
    expect(model.batchGuardrail.status).toBe('blocked')
    expect(model.batchGuardrail.safeChapterCount).toBe(0)
    expect(model.batchGuardrail.guardrails.find(item => item.label === '未清交稿风险')?.status).toBe('block')
    expect(model.batchGuardrail.recommendedAction.key).toBe('create_delivery_risk_repair')
    expect(model.pipeline.find(step => step.key === 'batch_guardrail')?.status).toBe('blocked')
    expect(model.dailyBattlePlan.currentStepKey).toBe('clear_risks')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'clear_risks')?.status).toBe('active')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'clear_risks')?.action.key).toBe('create_delivery_risk_repair')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'chapter_work')?.status).toBe('pending')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'batch_release')?.status).toBe('blocked')
  })

  test('prioritizes delivery risk repair over stale first30 diagnosis as the daily command', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        first30Retention: {
          ...basePlanning.first30Retention,
          status: 'stale',
          stale: true,
          score: 51,
          summary: '前30章内容已在报告后更新，建议重跑留存曲线。',
          actionKey: 'run_first30_retention',
        },
      },
      writing: {
        ...baseWriting,
        chapterAcceptanceDesk: {
          ...baseWriting.chapterAcceptanceDesk,
          visible: true,
          acceptanceStatus: 'needs_revision',
          statusLabel: '待修订',
          deliveryRiskQueue: {
            totalCount: 2,
            label: '待修复 2',
            priorityLabel: '优先补核心',
            items: ['核心偏移', '章末钩子弱'],
          },
          recommendedAcceptanceAction: { key: 'apply_editor_revision', label: '生成修订稿' },
        },
      },
      activeTasks: [],
      selectedModelId: 12,
      reviews: [
        {
          id: 301,
          chapter_id: 8,
          review_type: 'chapter_core_drift',
          created_at: '2026-06-04T01:00:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            core_drift: { status: 'warn', drift_risks: ['主角长期欲望被支线盖住'] },
          }),
        },
        {
          id: 302,
          chapter_id: 8,
          review_type: 'reader_retention_sync',
          created_at: '2026-06-04T01:01:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            reader_retention_sync: { status: 'warn', missed_count: 1, missed: ['章末追读问题不清晰'] },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.statusLabel).toBe('交稿风险待处理')
    expect(model.mainAction.key).toBe('create_delivery_risk_repair')
    expect(model.todayCommandDeck.action.key).toBe('create_delivery_risk_repair')
    expect(model.serialCockpit.command.action.key).toBe('create_delivery_risk_repair')
    expect(model.dailyBattlePlan.currentStepKey).toBe('clear_risks')
  })

})

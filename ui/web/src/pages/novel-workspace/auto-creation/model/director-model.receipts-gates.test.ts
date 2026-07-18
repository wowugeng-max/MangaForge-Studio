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

describe('buildAutoCreationDirectorModel receipts/gates', () => {
  test('blocks safe batching when quality audit repair receipts remain open', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
      } as any,
      writing: {
        ...baseWriting,
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '内门压迫', goal: '以新规逼主角交出阵盘' }],
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
          id: 207,
          chapter_id: 8,
          review_type: 'quality_audit_repair_receipt_sync',
          created_at: '2026-06-04T01:06:00.000Z',
          status: 'warn',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            quality_audit_repair_receipt_sync: {
              status: 'warn',
              label: '质量诊断修复回执缺口 1',
              summary: '质量诊断修复执行后，仍有 1 项缺口没有形成回执证据。',
              missed_count: 1,
              receipt_count: 2,
              missed: [
                { label: '目的词详略分配', text: 'original_evidence 有问题，但 changed_evidence 为空。' },
              ],
              next_actions: ['重新修订并逐条输出 quality_audit_repair_receipts.changed_evidence。'],
            },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.totalOpen).toBe(1)
    expect(model.deliveryRiskGate.highOpen).toBe(1)
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('质量回执')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('质量回执第8章：original_evidence 有问题，但 changed_evidence 为空。')
    expect(model.mainAction.key).toBe('create_delivery_risk_repair')
    expect(model.mainAction.payload?.deliveryRiskGate?.categories.map((item: any) => item.label)).toContain('质量回执')
    expect(model.mainAction.payload?.deliveryRiskGate?.topRisks.join('｜')).toContain('quality_audit_repair_receipts.changed_evidence')
    expect(model.batchGuardrail.status).toBe('blocked')
    expect(model.batchGuardrail.recommendedAction.payload?.deliveryRiskGate?.categories.map((item: any) => item.label)).toContain('质量回执')
  })

  test('blocks safe batching when deslop repair receipts remain open', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
      } as any,
      writing: {
        ...baseWriting,
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '内门压迫', goal: '以新规逼主角交出阵盘' }],
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
          id: 208,
          chapter_id: 8,
          review_type: 'deslop_repair_receipt_sync',
          created_at: '2026-06-04T01:07:00.000Z',
          status: 'warn',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            deslop_repair_receipt_sync: {
              status: 'warn',
              label: '去AI味修复回执残留 1',
              summary: '去AI味修复后仍有 1 项残留风险需要继续处理。',
              missed_count: 1,
              receipt_count: 2,
              missed: [
                { label: 'Gate B 句式套路', text: 'changed_evidence 为空，无法证明连续主语问题已修。' },
              ],
              next_actions: ['重新复核去AI味修复结果，并逐条输出 deslop_repair_receipts.changed_evidence。'],
            },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.totalOpen).toBe(1)
    expect(model.deliveryRiskGate.highOpen).toBe(1)
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('去AI味回执')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('去AI味回执第8章：changed_evidence 为空，无法证明连续主语问题已修。')
    expect(model.mainAction.key).toBe('create_delivery_risk_repair')
    expect(model.mainAction.payload?.deliveryRiskGate?.categories.map((item: any) => item.label)).toContain('去AI味回执')
    expect(model.mainAction.payload?.deliveryRiskGate?.topRisks.join('｜')).toContain('deslop_repair_receipts.changed_evidence')
    expect(model.batchGuardrail.status).toBe('blocked')
    expect(model.batchGuardrail.recommendedAction.payload?.deliveryRiskGate?.categories.map((item: any) => item.label)).toContain('去AI味回执')
  })

  test('blocks safe batching when revision cascade or scope guard risks remain open', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
      } as any,
      writing: {
        ...baseWriting,
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '内门压迫', goal: '以新规逼主角交出阵盘' }],
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
          id: 209,
          chapter_id: 8,
          review_type: 'revision_cascade_impact_sync',
          created_at: '2026-06-04T01:08:00.000Z',
          status: 'warn',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            revision_cascade_impact_sync: {
              status: 'warn',
              label: '修订级联影响 2',
              summary: '本章修订产生 2 项会影响后续章节的同步义务。',
              missed_count: 2,
              missed: [
                { target: '令牌背面血字', text: '令牌状态改变会影响第9章开篇交接。', required_action: '下一章先同步令牌新状态。' },
              ],
              next_actions: ['后续章节必须先同步修订后的伏笔、时间线、角色状态、资产归属和关系边界。'],
            },
          }),
        },
        {
          id: 210,
          chapter_id: 8,
          review_type: 'revision_scope_guard_sync',
          created_at: '2026-06-04T01:09:00.000Z',
          status: 'warn',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            revision_scope_guard_sync: {
              status: 'warn',
              label: '修订幅度过大 1200',
              summary: '修订前后字数差异 1200 字，超过警戒线 800 字。',
              missed_count: 1,
              missed: [
                { label: '修订幅度过大', text: '修订扩写 1200 字，超过允许差异 800 字。' },
              ],
              next_actions: ['下一轮修订不要重写整章；只按自检证据和修订回执残留做局部修复。'],
            },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.totalOpen).toBe(3)
    expect(model.deliveryRiskGate.highOpen).toBe(3)
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toEqual(expect.arrayContaining(['级联修订', '修订幅度']))
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('级联修订第8章：令牌状态改变会影响第9章开篇交接。')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('修订幅度第8章：修订扩写 1200 字')
    expect(model.mainAction.key).toBe('create_delivery_risk_repair')
    expect(model.batchGuardrail.status).toBe('blocked')
  })

  test('ignores delivery annotations that have been resolved or cleared by convergence', () => {
    const resolvedCoreKey = 'chapter_core_drift:201:7:7:core_drift:核心偏移 1'
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
          id: 301,
          review_type: 'review_annotation_status',
          created_at: '2026-06-04T01:10:00.000Z',
          payload: JSON.stringify({
            annotation_key: resolvedCoreKey,
            status: 'resolved',
            resolved_at: '2026-06-04T01:10:00.000Z',
          }),
        },
        {
          id: 202,
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
          id: 302,
          chapter_id: 8,
          review_type: 'delivery_risk_convergence',
          created_at: '2026-06-04T01:12:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            delivery_risk_convergence: { status: 'cleared', after_count: 0, label: '风险已清零' },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('ok')
    expect(model.deliveryRiskGate.totalOpen).toBe(0)
    expect(model.batchGuardrail.status).toBe('ready')
    expect(model.batchGuardrail.safeChapterCount).toBe(3)
    expect(model.batchGuardrail.recommendedAction.key).toBe('start_safe_batch_generation')
  })

  test('holds delivered safe batch when quality radar finds core, payoff, or storyline risks', () => {
    const deliveredBatchInput = {
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
        { id: 201, chapter_id: 9, review_type: 'chapter_core_drift', created_at: '2026-06-03T01:03:00.000Z', payload: JSON.stringify({ core_drift: { status: 'warn', score: 70, drift_risks: ['主线推进不足'] } }) },
        { id: 202, chapter_id: 10, review_type: 'reader_payoff_sync', created_at: '2026-06-03T01:04:00.000Z', payload: JSON.stringify({ reader_payoff_sync: { status: 'warn', debt_count: 2, missed: ['阵盘反噬回报', '内门压力'] } }) },
        { id: 203, chapter_id: 10, review_type: 'storyline_sync', created_at: '2026-06-03T01:05:00.000Z', payload: JSON.stringify({ storyline_sync: { status: 'warn', missed: ['内门线推进'], forbidden_touched: ['幕后主使'] } }) },
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
    } as any
    const model = buildAutoCreationDirectorModel(deliveredBatchInput)

    expect(model.batchReviewQueue.status).toBe('risk')
    expect(model.batchReviewQueue.riskRadar.status).toBe('warn')
    expect(model.batchReviewQueue.riskRadar.coreRiskCount).toBe(1)
    expect(model.batchReviewQueue.riskRadar.payoffDebtCount).toBe(2)
    expect(model.batchReviewQueue.riskRadar.storylineRiskCount).toBe(2)
    expect(model.batchReviewQueue.riskRadar.repairTasks.map((task: any) => task.issue_type)).toEqual([
      'core_drift',
      'reader_payoff_debt',
      'storyline_sync_risk',
    ])
    expect(model.status).toBe('needs_acceptance')
    expect(model.statusLabel).toBe('批次有风险')
    expect(model.mainAction.key).toBe('create_safe_batch_risk_repair')
    expect(model.mainAction.modelCall).toBe(false)
    expect(model.confirmations).toContain('安全连写批次存在质量风险')
    expect(model.batchReviewQueue.completionDashboard.status).toBe('needs_repair')
    expect(model.batchReviewQueue.completionDashboard.score).toBeLessThan(80)
    expect(model.batchReviewQueue.completionDashboard.summary).toContain('先修复')
    expect(model.batchReviewQueue.completionDashboard.nextAction.key).toBe('create_safe_batch_risk_repair')
    expect(model.batchReviewQueue.handoff.status).toBe('repair_risks')
    expect(model.batchReviewQueue.handoff.label).toBe('修复批次风险')
    expect(model.batchReviewQueue.handoff.action.key).toBe('create_safe_batch_risk_repair')
    expect(model.batchReviewQueue.handoff.riskLabels).toEqual(expect.arrayContaining(['核心偏移', '回报欠账', '剧情线']))
    expect(model.batchReviewQueue.completionDashboard.metrics.find(metric => metric.key === 'quality')?.status).toBe('warn')
    expect(model.batchReviewQueue.completionDashboard.metrics.find(metric => metric.key === 'plan')?.status).toBe('warn')
  })

  test('holds delivered safe batch when chapter handoff contract is missed in the opening', () => {
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
        { id: 8, chapter_no: 8, title: '试炼前夜', chapter_text: '正文'.repeat(1600) },
        { id: 9, chapter_no: 9, title: '阵盘裂纹', chapter_text: '正文'.repeat(1550) },
        { id: 10, chapter_no: 10, title: '外门震动', chapter_text: '正文'.repeat(1510) },
      ],
      reviews: [
        { id: 101, chapter_id: 8, review_type: 'prose_quality', created_at: '2026-06-03T01:00:00.000Z', payload: JSON.stringify({ score: 84, passed: true }) },
        { id: 102, chapter_id: 9, review_type: 'prose_quality', created_at: '2026-06-03T01:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 103, chapter_id: 10, review_type: 'prose_quality', created_at: '2026-06-03T01:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
        {
          id: 301,
          chapter_id: 10,
          review_type: 'reader_expectation_sync',
          created_at: '2026-06-03T01:03:00.000Z',
          payload: JSON.stringify({
            reader_expectation_sync: {
              status: 'warn',
              missed_count: 1,
              missed: [
                {
                  key: 'opening_handoff',
                  label: '上一章承接',
                  match_scope: 'opening',
                  text: '阵盘第二道裂纹必须在开篇造成可见压力。',
                },
              ],
              keep_alive: ['是谁在背后改试炼规则'],
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
          input_ref: JSON.stringify({
            source: 'auto_creation_safe_batch',
            safety_limit: 3,
            chapter_handoff_contract: {
              previous_chapter_no: 9,
              current_chapter_no: 10,
              opening_must_land: '阵盘第二道裂纹必须在开篇造成可见压力。',
              keep_alive: ['是谁在背后改试炼规则'],
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
    expect((model.batchReviewQueue.riskRadar as any).handoffRiskCount).toBe(1)
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'handoff')?.label).toBe('章节交接')
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'handoff')?.detail).toContain('上一章承接')
    expect(model.batchReviewQueue.riskRadar.repairTasks.map((task: any) => task.issue_type)).toContain('chapter_handoff_missed')
    const handoffTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'chapter_handoff_missed')
    expect(handoffTask?.chapter_handoff_review?.missed.map((item: any) => item.label)).toContain('上一章承接')
    expect(model.batchReviewQueue.handoff.riskLabels).toContain('章节交接')
  })

  test('holds delivered safe batch when generated chapters miss the next batch brief', () => {
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
        { id: 8, chapter_no: 8, title: '试炼前夜', chapter_text: '正文'.repeat(1600) },
        { id: 9, chapter_no: 9, title: '阵盘裂纹', chapter_text: '正文'.repeat(1550) },
        { id: 10, chapter_no: 10, title: '外门震动', chapter_text: '正文'.repeat(1510) },
      ],
      reviews: [
        { id: 101, chapter_id: 8, review_type: 'prose_quality', created_at: '2026-06-03T01:00:00.000Z', payload: JSON.stringify({ score: 84, passed: true }) },
        { id: 102, chapter_id: 9, review_type: 'prose_quality', created_at: '2026-06-03T01:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 103, chapter_id: 10, review_type: 'prose_quality', created_at: '2026-06-03T01:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
        { id: 202, chapter_id: 9, review_type: 'reader_payoff_sync', created_at: '2026-06-03T01:04:00.000Z', payload: JSON.stringify({ reader_payoff_sync: { status: 'warn', debt_count: 1, missed: ['阵盘反噬回报'] } }) },
        { id: 203, chapter_id: 10, review_type: 'storyline_sync', created_at: '2026-06-03T01:05:00.000Z', payload: JSON.stringify({ storyline_sync: { status: 'warn', missed: ['进入内门视野'] } }) },
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
              batchGoal: '三章内进入内门视野。',
              readerPayoffPlan: '升级、打脸、规则反制逐章交付。',
              mainlineFocus: '外门危机 -> 内门招揽',
              forbiddenBoundary: '第10章前不得揭露规则源头。',
              chapters: [
                { chapterNo: 8, title: '试炼前夜', chapterTask: '试炼压迫落地。' },
                { chapterNo: 9, title: '阵盘裂纹', chapterTask: '兑现阵盘反噬回报。' },
                { chapterNo: 10, title: '外门震动', chapterTask: '推进到内门视野。' },
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
    expect(model.batchReviewQueue.riskRadar.batchPlanRiskCount).toBe(2)
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'batch_plan')?.detail).toContain('连载计划')
    expect(model.batchReviewQueue.riskRadar.repairTasks.map((task: any) => task.issue_type)).toContain('batch_brief_mismatch')
    const batchTasks = model.batchReviewQueue.riskRadar.repairTasks.filter((task: any) => task.issue_type === 'batch_brief_mismatch')
    const chapter9Task = batchTasks.find((task: any) => Number(task.chapter_no) === 9)
    const chapter10Task = batchTasks.find((task: any) => Number(task.chapter_no) === 10)
    expect(chapter9Task?.batch_plan_context?.batch_goal).toContain('三章内进入内门视野')
    expect(chapter9Task?.batch_plan_context?.reader_payoff_plan).toContain('升级')
    expect(chapter9Task?.batch_plan_context?.chapter_plan?.chapter_task).toContain('阵盘反噬回报')
    expect(chapter9Task?.batch_plan_review?.planned).toContain('本章职责：兑现阵盘反噬回报。')
    expect(chapter9Task?.batch_plan_review?.missed).toContain('阵盘反噬回报')
    expect(chapter9Task?.batch_plan_review?.actual_risks.join('；')).toContain('回报欠账：阵盘反噬回报')
    expect(chapter10Task?.batch_plan_review?.missed).toContain('进入内门视野')
    expect(chapter10Task?.batch_plan_review?.actual_risks.join('；')).toContain('剧情线漏推：进入内门视野')
    expect(model.mainAction.key).toBe('create_safe_batch_risk_repair')
  })

  test('scores delivered safe batch against the batch start checklist', () => {
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
        { id: 8, chapter_no: 8, title: '试炼前夜', chapter_text: '正文'.repeat(1600) },
        { id: 9, chapter_no: 9, title: '阵盘裂纹', chapter_text: '正文'.repeat(1550) },
        { id: 10, chapter_no: 10, title: '外门震动', chapter_text: '正文'.repeat(1510) },
      ],
      reviews: [
        { id: 101, chapter_id: 8, review_type: 'prose_quality', created_at: '2026-06-03T01:00:00.000Z', payload: JSON.stringify({ score: 84, passed: true }) },
        { id: 102, chapter_id: 9, review_type: 'prose_quality', created_at: '2026-06-03T01:01:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
        { id: 103, chapter_id: 10, review_type: 'prose_quality', created_at: '2026-06-03T01:02:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 201, chapter_id: 8, review_type: 'chapter_core_drift', created_at: '2026-06-03T01:03:00.000Z', payload: JSON.stringify({ chapter_core_drift: { status: 'warn', drift_risks: ['寒门逆袭承诺没有被试炼结果兑现'] } }) },
        { id: 202, chapter_id: 9, review_type: 'story_drive_sync', created_at: '2026-06-03T01:04:00.000Z', payload: JSON.stringify({ story_drive_sync: { status: 'warn', missed_count: 1, missed: ['主角没有主动选择代价'] } }) },
        { id: 203, chapter_id: 9, review_type: 'reader_payoff_sync', created_at: '2026-06-03T01:05:00.000Z', payload: JSON.stringify({ reader_payoff_sync: { status: 'warn', debt_count: 1, missed: ['升级+打脸回报不足'] } }) },
        { id: 204, chapter_id: 10, review_type: 'innovation_sync', created_at: '2026-06-03T01:06:00.000Z', payload: JSON.stringify({ innovation_sync: { status: 'warn', missed_count: 1, missed: ['阵法反压宗门秩序的记忆点不够'] } }) },
        { id: 205, chapter_id: 10, review_type: 'storyline_sync', created_at: '2026-06-03T01:07:00.000Z', payload: JSON.stringify({ storyline_sync: { status: 'warn', forbidden_touched: ['第10章前提前揭露规则源头'] } }) },
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
              batchGoal: '三章内进入内门视野。',
              readerPayoffPlan: '升级、打脸、规则反制逐章交付。',
              mainlineFocus: '外门危机 -> 内门招揽',
              forbiddenBoundary: '第10章前不得揭露规则源头。',
              startChecklist: [
                { key: 'core_promise', label: '核心承诺', status: 'ok', detail: '寒门少年以阵法反压宗门秩序。' },
                { key: 'story_drive', label: '故事驱动力', status: 'ok', detail: '主角必须主动承担试炼代价。' },
                { key: 'reader_payoff', label: '读者回报', status: 'ok', detail: '升级+打脸回报必须逐章可见。' },
                { key: 'innovation', label: '创新/IP记忆点', status: 'ok', detail: '阵法反压宗门秩序要形成可复述场面。' },
                { key: 'forbidden_boundary', label: '禁写边界', status: 'ok', detail: '第10章前不得揭露规则源头。' },
              ],
              chapters: [
                { chapterNo: 8, title: '试炼前夜', chapterTask: '试炼压迫落地。' },
                { chapterNo: 9, title: '阵盘裂纹', chapterTask: '兑现阵盘反噬回报。' },
                { chapterNo: 10, title: '外门震动', chapterTask: '推进到内门视野。' },
              ],
            },
          }),
          output_ref: JSON.stringify({
            total: 3,
            success: 3,
            failed: 0,
            chapters: [
              { id: 8, chapter_no: 8, title: '试炼前夜', status: 'success', score: 84, word_count: 3180 },
              { id: 9, chapter_no: 9, title: '阵盘裂纹', status: 'success', score: 86, word_count: 3090 },
              { id: 10, chapter_no: 10, title: '外门震动', status: 'success', score: 85, word_count: 3021 },
            ],
          }),
        },
      ],
    } as any)

    expect(model.batchReviewQueue.status).toBe('risk')
    expect(model.batchReviewQueue.riskRadar.checklistExecution.visible).toBe(true)
    expect(model.batchReviewQueue.riskRadar.checklistExecution.status).toBe('warn')
    expect(model.batchReviewQueue.riskRadar.checklistExecution.score).toBeLessThan(70)
    expect(model.batchReviewQueue.riskRadar.checklistExecution.items.map(item => item.key)).toEqual([
      'core_promise',
      'story_drive',
      'reader_payoff',
      'innovation',
      'forbidden_boundary',
    ])
    expect(model.batchReviewQueue.riskRadar.checklistExecution.items.every(item => item.status === 'warn')).toBe(true)
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'batch_checklist')?.detail).toContain('开工清单')
    expect(model.batchReviewQueue.riskRadar.batchChecklistRiskCount).toBe(5)
    expect(model.batchReviewQueue.riskRadar.repairTasks.map((task: any) => task.issue_type)).toContain('batch_checklist_mismatch')
    const checklistTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'batch_checklist_mismatch')
    expect(checklistTask?.batch_checklist_execution?.missed.map((item: any) => item.label)).toEqual([
      '核心承诺',
      '故事驱动力',
      '读者回报',
      '创新/IP记忆点',
      '禁写边界',
    ])
    expect(model.batchReviewQueue.handoff.riskLabels).toContain('开工清单')
    expect(model.batchReviewQueue.completionDashboard.metrics.find(metric => metric.key === 'checklist')?.status).toBe('warn')
  })

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

  test('holds strengthened repair recovery when core and reader payoff acceptance fails', () => {
    const model = buildAutoCreationDirectorModel(buildStrengthenedRepairAcceptanceInput([
      {
        id: 4510,
        chapter_id: 42,
        review_type: 'chapter_core_drift',
        created_at: '2026-06-06T01:03:00.000Z',
        payload: JSON.stringify({
          core_drift: {
            status: 'warn',
            score: 68,
            drift_risks: ['强化深修恢复后主线承诺仍被支线挤压'],
          },
        }),
      },
      {
        id: 4511,
        chapter_id: 43,
        review_type: 'reader_payoff_sync',
        created_at: '2026-06-06T01:04:00.000Z',
        payload: JSON.stringify({
          reader_payoff_sync: {
            status: 'warn',
            debt_count: 1,
            missed: ['强化深修恢复后没有兑现阵盘反压爽点'],
          },
        }),
      },
      {
        id: 4512,
        chapter_id: 43,
        review_type: 'reader_expectation_sync',
        created_at: '2026-06-06T01:05:00.000Z',
        payload: JSON.stringify({
          reader_expectation_sync: {
            status: 'warn',
            missed_count: 1,
            missed: ['章末追读问题没有接住下一章期待'],
          },
        }),
      },
    ]))

    const acceptanceSignal = model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'strengthened_repair_acceptance' as any)
    const acceptanceTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'strengthened_repair_acceptance_mismatch')

    expect(model.batchReviewQueue.status).toBe('risk')
    expect((model.batchReviewQueue.riskRadar as any).strengthenedRepairAcceptanceRiskCount).toBe(3)
    expect(acceptanceSignal?.label).toBe('强化复盘')
    expect(acceptanceSignal?.status).toBe('warn')
    expect(acceptanceSignal?.detail).toContain('强化深修恢复验收未通过')
    expect(acceptanceSignal?.detail).toContain('单章治理复查：强化深修已收敛')
    expect(acceptanceTask?.strengthened_repair_acceptance_review).toMatchObject({
      status: 'warn',
      source_evidence: ['单章治理复查：强化深修已收敛'],
      failed_evidence: expect.arrayContaining([
        '核心守恒风险 1 项',
        '读者回报欠账 1 项',
        '读者拉力风险 1 项',
      ]),
    })
    expect(model.batchReviewQueue.handoff.riskLabels).toContain('强化复盘')
    expect(model.batchReviewQueue.completionDashboard.metrics.find(metric => metric.key === 'strengthened_repair_acceptance' as any)?.status).toBe('warn')
  })

  test('shows strengthened repair recovery acceptance after core and reader payoff pass', () => {
    const model = buildAutoCreationDirectorModel(buildStrengthenedRepairAcceptanceInput())

    const acceptanceSignal = model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'strengthened_repair_acceptance' as any)
    const acceptanceMetric = model.batchReviewQueue.completionDashboard.metrics.find(metric => metric.key === 'strengthened_repair_acceptance' as any)

    expect(model.batchReviewQueue.status).toBe('done')
    expect((model.batchReviewQueue.riskRadar as any).strengthenedRepairAcceptanceRiskCount).toBe(0)
    expect(acceptanceSignal?.label).toBe('强化复盘')
    expect(acceptanceSignal?.status).toBe('ok')
    expect(acceptanceSignal?.detail).toContain('强化深修恢复验收已通过')
    expect(acceptanceMetric?.status).toBe('ok')
    expect(acceptanceMetric?.detail).toContain('强化深修恢复验收已通过')
    expect(model.batchReviewQueue.completionDashboard.summary).toContain('强化深修恢复验收已通过')
    expect(model.batchReviewQueue.handoff.evidence).toContain('强化深修恢复验收已通过')
  })

  test('turns missed default five-chapter lane redesign execution into a batch repair task', () => {
    const chapterNos = [89]
    const model = buildAutoCreationDirectorModel({
      planning: readySafeBatchPlanning({ futureRoute: futureRouteRange(90, 5) }),
      writing: readySafeBatchWriting({
        nextChapter: { ...baseWriting.nextChapter, id: 90, chapterNo: 90, title: '默认档模板复检' },
        previousChapter: { chapterNo: 89, title: '默认档重构章', wordCount: 3200, hasProse: true },
      }),
      activeTasks: [],
      selectedModelId: 12,
      storyState: { last_updated_chapter: 89 },
      chapters: [{
        id: 89,
        chapter_no: 89,
        title: '默认档重构章',
        chapter_text: '默认档重构正文'.repeat(500),
        raw_payload: {
          generated_scene_breakdown: [{
            expansion_structure_decision_execution: {
              segment_role_delivered: true,
              observation_metrics_delivered: true,
              redesign_principles_delivered: true,
              evidence: ['第89章只回填了旧结构决策三项，没有写默认5章档位模板。'],
            },
          }],
        },
      }],
      reviews: strengthenedAcceptanceQualityReviews(chapterNos, 7301, '2026-06-24T01:00:00.000Z'),
      runRecords: [{
        id: 730,
        run_type: 'batch_generate_prose',
        created_at: '2026-06-24T00:00:00.000Z',
        status: 'success',
        input_ref: JSON.stringify({
          source: 'auto_creation_safe_batch',
          safety_limit: 1,
          batch_preflight: {
            safe_chapter_count: 1,
            allowed_chapter_nos: [89],
            safe_batch_expansion_policy: {
              status: 'recovering',
              label: '强化扩批规则',
              summary: '连续恢复判定失效，进入默认档位结构重构。',
              target_chapter_count: 1,
              base_chapter_count: 3,
              expanded_chapter_count: 5,
              required_pass_streak: 3,
              pass_streak: 3,
              accepted_batch_count: 3,
              failed_batch_count: 1,
              latest_status: 'warn',
            },
          },
          next_batch_brief: {
            chapter_range_label: '第89章',
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
          total: 1,
          success: 1,
          failed: 0,
          chapters: [{
            id: 89,
            chapter_no: 89,
            title: '默认档重构章',
            status: 'success',
            score: 86,
            word_count: 3300,
          }],
        }),
      }],
    } as any)

    const decisionTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'safe_batch_expansion_structure_decision_mismatch')

    expect(model.batchReviewQueue.status).toBe('risk')
    expect((model.batchReviewQueue.riskRadar as any).safeBatchExpansionStructureDecisionRiskCount).toBe(4)
    expect(decisionTask?.message).toContain('默认5章档位模板')
    expect(decisionTask?.safe_batch_expansion_structure_decision_review).toMatchObject({
      recommendation: 'escalate_structure_redesign',
      target_chapter_count: 1,
      default_five_chapter_lane_redesign: {
        reason: 'repeated_recovery_verdict_relapse',
        relapse_count: 2,
        repeated_failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
      },
      failed_items: expect.arrayContaining([
        expect.objectContaining({ chapter_no: 89, key: 'default_lane_segment_duty', label: '默认档位段位职责' }),
        expect.objectContaining({ chapter_no: 89, key: 'default_lane_conflict_rotation', label: '冲突轮换' }),
        expect.objectContaining({ chapter_no: 89, key: 'default_lane_payoff_density', label: '回报密度' }),
        expect.objectContaining({ chapter_no: 89, key: 'default_lane_ending_hook_template', label: '章末追读模板' }),
      ]),
    })
  })

  test('holds delivered safe batch when chapter benchmark execution misses baseline beats', () => {
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
          id: 502,
          chapter_id: 16,
          review_type: 'chapter_benchmark_sync',
          created_at: '2026-06-03T01:03:00.000Z',
          payload: JSON.stringify({
            chapter_benchmark_sync: {
              status: 'warn',
              label: '基准缺口 3',
              score: 57,
              missed_count: 3,
              missed: [
                { key: 'opening_hook', label: '开篇钩子', text: '前300字没有把上一章压力转成现场危险。' },
                { key: 'payoff_pattern', label: '爽点兑现', text: '主角反制没有形成可见回报。' },
                { key: 'ending_hook_pattern', label: '章末追读', text: '章末缺少下一章非看不可的问题。' },
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
    expect((model.batchReviewQueue.riskRadar as any).chapterBenchmarkRiskCount).toBe(3)
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'chapter_benchmark')?.detail).toContain('标杆章')
    expect(model.batchReviewQueue.riskRadar.repairTasks.map((task: any) => task.issue_type)).toContain('chapter_benchmark_gap')
    const benchmarkTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'chapter_benchmark_gap')
    expect(benchmarkTask?.chapter_benchmark_sync?.missed.map((item: any) => item.label)).toContain('开篇钩子')
    expect(model.batchReviewQueue.handoff.riskLabels).toContain('标杆章')
    expect(model.batchReviewQueue.completionDashboard.score).toBeLessThan(90)
  })

  test('holds delivered safe batch when intent confirmation or benchmark recall execution is weak', () => {
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
          id: 601,
          chapter_id: 15,
          review_type: 'intent_confirmation_sync',
          created_at: '2026-06-03T01:03:00.000Z',
          payload: JSON.stringify({
            intent_confirmation_sync: {
              status: 'warn',
              label: '意图确认缺口 2',
              missed_count: 2,
              missed: [
                { key: 'emotion_target', label: '情绪目标', text: '本章没有从压抑转为当众夺回主动权。' },
                { key: 'ending_handoff', label: '章尾承接', text: '带血腰牌没有成为下一章推动力。' },
              ],
            },
          }),
        },
        {
          id: 602,
          chapter_id: 16,
          review_type: 'benchmark_recall_sync',
          created_at: '2026-06-03T01:04:00.000Z',
          payload: JSON.stringify({
            benchmark_recall_sync: {
              status: 'warn',
              label: '文风召回缺口 1',
              missed_count: 1,
              missed: [
                { key: 'rhythm_reference', label: '节奏参照', text: '爆发后没有冷却承接，直接跳到总结。' },
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
    expect((model.batchReviewQueue.riskRadar as any).preDraftExecutionRiskCount).toBe(3)
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'pre_draft_execution')?.detail).toContain('写前执行缺口')
    expect(model.batchReviewQueue.riskRadar.repairTasks.map((task: any) => task.issue_type)).toEqual(expect.arrayContaining([
      'intent_confirmation_gap',
      'benchmark_recall_gap',
    ]))
    const intentTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'intent_confirmation_gap')
    const recallTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'benchmark_recall_gap')
    expect(intentTask?.intent_confirmation_sync?.missed.map((item: any) => item.label)).toContain('情绪目标')
    expect(recallTask?.benchmark_recall_sync?.missed.map((item: any) => item.label)).toContain('节奏参照')
    expect(model.batchReviewQueue.handoff.riskLabels).toContain('写前执行')
  })

  test('holds delivered safe batch when chapter attraction execution is weak', () => {
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
          id: 503,
          chapter_id: 16,
          review_type: 'chapter_attraction_review',
          created_at: '2026-06-03T01:03:00.000Z',
          payload: JSON.stringify({
            chapter_attraction_review: {
              status: 'warn',
              label: '吸引力缺口 3',
              score: 62,
              weak_count: 3,
              priority_repair: '优先修章末翻页',
              weak_dimensions: [
                { key: 'scene_drive', label: '场景推进', status: 'warn', score: 57, issue: '中段缺少目标、阻碍、转折和回报。' },
                { key: 'payoff_density', label: '爽点密度', status: 'warn', score: 58, issue: '主角反制没有写成可见结果。' },
                { key: 'page_turn', label: '章末翻页', status: 'warn', score: 42, issue: '结尾没有留下下一章必须看的问题。' },
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
    expect((model.batchReviewQueue.riskRadar as any).chapterAttractionRiskCount).toBe(3)
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'chapter_attraction')?.detail).toContain('吸引力')
    expect(model.batchReviewQueue.riskRadar.repairTasks.map((task: any) => task.issue_type)).toContain('chapter_attraction_gap')
    const attractionTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'chapter_attraction_gap')
    expect(attractionTask?.chapter_attraction_review?.weak_dimensions.map((item: any) => item.label)).toContain('章末翻页')
    expect(attractionTask?.chapter_attraction_review?.priority_repair).toBe('优先修章末翻页')
    expect(model.batchReviewQueue.handoff.riskLabels).toContain('吸引力')
    expect(model.batchReviewQueue.completionDashboard.score).toBeLessThan(90)
  })

  test('holds delivered safe batch when reader trial review finds drop points in the batch', () => {
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
        { id: 8, chapter_no: 8, title: '试炼前夜', chapter_text: '试炼前夜'.repeat(500) },
        { id: 9, chapter_no: 9, title: '阵盘裂纹', chapter_text: '阵盘裂纹'.repeat(500) },
        { id: 10, chapter_no: 10, title: '外门震动', chapter_text: '外门震动'.repeat(500) },
      ],
      reviews: [
        { id: 101, chapter_id: 8, review_type: 'prose_quality', created_at: '2026-06-03T01:00:00.000Z', payload: JSON.stringify({ score: 84, passed: true }) },
        { id: 102, chapter_id: 9, review_type: 'prose_quality', created_at: '2026-06-03T01:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 103, chapter_id: 10, review_type: 'prose_quality', created_at: '2026-06-03T01:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
        {
          id: 601,
          review_type: 'reader_trial_review',
          created_at: '2026-06-03T01:03:00.000Z',
          payload: JSON.stringify({
            report: {
              status: 'needs_repair',
              score: 63,
              summary: '试读十章存在明显弃读点。',
              quality_bar: 'qidian_10k_reader_trial_baseline',
              drop_points: [
                '第8章中段解释宗门派系过密，试读用户可能弃读。',
                '第10章章末钩子弱，没有形成付费前继续阅读动力。',
              ],
              repair_actions: [
                '第8章删减派系解释，改成执事现场逼问。',
                '第10章重做章末未解决问题。',
              ],
              segments: [
                { key: 'trial_10', label: '试读十章', score: 63, verdict: '第8-10章掉速。' },
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
              { id: 8, chapter_no: 8, title: '试炼前夜', status: 'success', score: 84, word_count: 3180 },
              { id: 9, chapter_no: 9, title: '阵盘裂纹', status: 'success', score: 85, word_count: 3090 },
              { id: 10, chapter_no: 10, title: '外门震动', status: 'success', score: 86, word_count: 3021 },
            ],
          }),
        },
      ],
    } as any)

    expect(model.batchReviewQueue.status).toBe('risk')
    expect((model.batchReviewQueue.riskRadar as any).readerTrialRiskCount).toBe(2)
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'reader_trial')?.detail).toContain('试读弃读点')
    expect(model.batchReviewQueue.riskRadar.repairTasks.map((task: any) => task.issue_type)).toContain('reader_trial_drop_point')
    const trialTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'reader_trial_drop_point')
    expect(trialTask?.reader_trial_review?.drop_points).toContain('第8章中段解释宗门派系过密，试读用户可能弃读。')
    expect(trialTask?.reader_trial_review?.repair_actions).toContain('第10章重做章末未解决问题。')
    expect(model.batchReviewQueue.handoff.riskLabels).toContain('试读')
    expect(model.batchReviewQueue.completionDashboard.score).toBeLessThan(90)
  })

  test('holds delivered safe batch when first30 retention diagnosis is stale for opening chapters', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        first30Retention: {
          ...basePlanning.first30Retention,
          status: 'stale',
          score: 76,
          summary: '需重新诊断：前30章内容已在报告后更新。旧报告显示第4-10章试读闭环偏弱。',
          stale: true,
          actionKey: 'run_first30_retention',
          risks: [{ severity: 'high', segment: '4-10', issue: '试读闭环偏弱', action: '重新运行前30章诊断' }],
          nextActions: ['重新运行前30章诊断，确认第8-10章修复后的追读曲线。'],
        },
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
        { id: 8, chapter_no: 8, title: '试炼前夜', updated_at: '2026-06-03T02:00:00.000Z', chapter_text: '试炼前夜'.repeat(500) },
        { id: 9, chapter_no: 9, title: '阵盘裂纹', updated_at: '2026-06-03T02:01:00.000Z', chapter_text: '阵盘裂纹'.repeat(500) },
        { id: 10, chapter_no: 10, title: '外门震动', updated_at: '2026-06-03T02:02:00.000Z', chapter_text: '外门震动'.repeat(500) },
      ],
      reviews: [
        { id: 101, chapter_id: 8, review_type: 'prose_quality', created_at: '2026-06-03T03:00:00.000Z', payload: JSON.stringify({ score: 84, passed: true }) },
        { id: 102, chapter_id: 9, review_type: 'prose_quality', created_at: '2026-06-03T03:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 103, chapter_id: 10, review_type: 'prose_quality', created_at: '2026-06-03T03:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
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
    expect((model.batchReviewQueue.riskRadar as any).first30RetentionRiskCount).toBe(1)
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'first30_retention')?.detail).toContain('需重新诊断')
    expect(model.batchReviewQueue.riskRadar.repairTasks.map((task: any) => task.issue_type)).toContain('first30_retention_recheck')
    const retentionTask = model.batchReviewQueue.riskRadar.repairTasks.find((task: any) => task.issue_type === 'first30_retention_recheck')
    expect(retentionTask?.action_key).toBe('run_first30_retention')
    expect(retentionTask?.first30_retention?.summary).toContain('前30章内容已在报告后更新')
    expect(model.batchReviewQueue.handoff.riskLabels).toContain('前30章')
    expect(model.batchReviewQueue.completionDashboard.score).toBeLessThan(90)
  })

  test('ignores old reader trial drop points when the safe batch is outside the trial window', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          currentChapterLabel: '第43章',
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
      },
      writing: {
        ...baseWriting,
        nextChapter: { ...baseWriting.nextChapter, id: 43, chapterNo: 43, title: '内门复盘' },
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '内门复盘', goal: '结算阶段回报' }],
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
      storyState: { last_updated_chapter: 42 },
      chapters: [
        { id: 40, chapter_no: 40, title: '内门暗潮', chapter_text: '内门暗潮'.repeat(500) },
        { id: 41, chapter_no: 41, title: '长老下注', chapter_text: '长老下注'.repeat(500) },
        { id: 42, chapter_no: 42, title: '榜单改写', chapter_text: '榜单改写'.repeat(500) },
      ],
      reviews: [
        { id: 101, chapter_id: 40, review_type: 'prose_quality', created_at: '2026-06-03T01:00:00.000Z', payload: JSON.stringify({ score: 84, passed: true }) },
        { id: 102, chapter_id: 41, review_type: 'prose_quality', created_at: '2026-06-03T01:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 103, chapter_id: 42, review_type: 'prose_quality', created_at: '2026-06-03T01:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
        {
          id: 601,
          review_type: 'reader_trial_review',
          created_at: '2026-06-03T01:03:00.000Z',
          payload: JSON.stringify({
            report: {
              status: 'needs_repair',
              score: 63,
              summary: '试读十章存在明显弃读点。',
              drop_points: [
                '第8章中段解释宗门派系过密，试读用户可能弃读。',
                '第10章章末钩子弱，没有形成付费前继续阅读动力。',
              ],
              repair_actions: ['第8章删减派系解释。', '第10章重做章末未解决问题。'],
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
              { id: 40, chapter_no: 40, title: '内门暗潮', status: 'success', score: 84, word_count: 3180 },
              { id: 41, chapter_no: 41, title: '长老下注', status: 'success', score: 85, word_count: 3090 },
              { id: 42, chapter_no: 42, title: '榜单改写', status: 'success', score: 86, word_count: 3021 },
            ],
          }),
        },
      ],
    } as any)

    expect(model.batchReviewQueue.status).toBe('done')
    expect((model.batchReviewQueue.riskRadar as any).readerTrialRiskCount).toBe(0)
    expect(model.batchReviewQueue.riskRadar.signals.find(signal => signal.key === 'reader_trial')?.status).toBe('ok')
    expect(model.batchReviewQueue.riskRadar.repairTasks.map((task: any) => task.issue_type)).not.toContain('reader_trial_drop_point')
  })

  test('releases safe batch risk after repair tasks are resolved and chapters are rechecked', () => {
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
        { id: 201, chapter_id: 9, review_type: 'chapter_core_drift', created_at: '2026-06-03T01:03:00.000Z', payload: JSON.stringify({ core_drift: { status: 'warn', score: 70, drift_risks: ['主线推进不足'] } }) },
        { id: 202, chapter_id: 10, review_type: 'reader_payoff_sync', created_at: '2026-06-03T01:04:00.000Z', payload: JSON.stringify({ reader_payoff_sync: { status: 'warn', debt_count: 2, missed: ['阵盘反噬回报', '内门压力'] } }) },
        { id: 203, chapter_id: 10, review_type: 'storyline_sync', created_at: '2026-06-03T01:05:00.000Z', payload: JSON.stringify({ storyline_sync: { status: 'warn', missed: ['内门线推进'], forbidden_touched: ['幕后主使'] } }) },
        { id: 301, chapter_id: 9, review_type: 'prose_quality', created_at: '2026-06-03T02:10:00.000Z', payload: JSON.stringify({ score: 84, passed: true }) },
        { id: 302, chapter_id: 10, review_type: 'prose_quality', created_at: '2026-06-03T02:11:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
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
            batch_preflight: {
              recovery_evidence: [
                '批次任务书完整',
                '样章任务书复检通过 2 项',
                '第9、10章样章已重审',
              ],
              storyline_decision_closure: {
                status: 'ok',
                label: '剧情线决策已闭环',
                open_count: 0,
              },
            },
          }),
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
        {
          id: 11,
          run_type: 'longform_production_repair',
          created_at: '2026-06-03T02:00:00.000Z',
          status: 'completed',
          input_ref: JSON.stringify({ source: 'auto_creation_safe_batch_risk', batch_created_at: '2026-06-03T00:00:00.000Z' }),
          output_ref: JSON.stringify({
            tasks: [
              { task_type: 'repair_quality', annotation_category: 'delivery_core', task_status: 'resolved', chapter_id: 9, chapter_no: 9 },
              { task_type: 'repair_quality', annotation_category: 'reader_payoff', task_status: 'resolved', chapter_id: 10, chapter_no: 10 },
              { task_type: 'repair_quality', annotation_category: 'storyline', task_status: 'resolved', chapter_id: 10, chapter_no: 10 },
            ],
          }),
        },
      ],
    } as any)

    expect(model.batchReviewQueue.status).toBe('done')
    expect(model.batchReviewQueue.riskRadar.status).toBe('ok')
    expect(model.batchReviewQueue.riskRadar.repairTasks).toHaveLength(0)
    expect(model.status).toBe('ready')
    expect(model.batchReviewQueue.nextAction.key).toBe('start_safe_batch_generation')
    expect(model.batchReviewQueue.completionDashboard.status).toBe('ready_next')
    expect(model.batchReviewQueue.completionDashboard.score).toBeGreaterThanOrEqual(90)
    expect(model.batchReviewQueue.completionDashboard.nextAction.key).toBe('start_safe_batch_generation')
    expect(model.batchReviewQueue.completionDashboard.metrics.every(metric => metric.status === 'ok')).toBe(true)
    expect(model.batchReviewQueue.handoff.evidence).toContain('剧情线决策已闭环')
    expect(model.batchReviewQueue.handoff.evidence).toContain('样章任务书复检通过 2 项')
    expect(model.batchReviewQueue.handoff.evidence).toContain('第9、10章样章已重审')
  })

  test('releases chapter handoff batch risk after the handoff repair is resolved and rechecked', () => {
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
        { id: 8, chapter_no: 8, title: '试炼前夜', chapter_text: '正文'.repeat(1600) },
        { id: 9, chapter_no: 9, title: '阵盘裂纹', chapter_text: '正文'.repeat(1550) },
        { id: 10, chapter_no: 10, title: '外门震动', chapter_text: '正文'.repeat(1510) },
      ],
      reviews: [
        { id: 101, chapter_id: 8, review_type: 'prose_quality', created_at: '2026-06-03T01:00:00.000Z', payload: JSON.stringify({ score: 84, passed: true }) },
        { id: 102, chapter_id: 9, review_type: 'prose_quality', created_at: '2026-06-03T01:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 103, chapter_id: 10, review_type: 'prose_quality', created_at: '2026-06-03T01:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
        {
          id: 301,
          chapter_id: 10,
          review_type: 'reader_expectation_sync',
          created_at: '2026-06-03T01:03:00.000Z',
          payload: JSON.stringify({
            reader_expectation_sync: {
              status: 'warn',
              missed_count: 1,
              missed: [
                {
                  key: 'opening_handoff',
                  label: '上一章承接',
                  match_scope: 'opening',
                  text: '阵盘第二道裂纹必须在开篇造成可见压力。',
                },
              ],
            },
          }),
        },
        { id: 401, chapter_id: 10, review_type: 'prose_quality', created_at: '2026-06-03T02:10:00.000Z', payload: JSON.stringify({ score: 88, passed: true }) },
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
        {
          id: 11,
          run_type: 'longform_production_repair',
          created_at: '2026-06-03T02:00:00.000Z',
          status: 'completed',
          input_ref: JSON.stringify({ source: 'auto_creation_safe_batch_risk', batch_created_at: '2026-06-03T00:00:00.000Z' }),
          output_ref: JSON.stringify({
            tasks: [
              { task_type: 'repair_quality', issue_type: 'chapter_handoff_missed', task_status: 'resolved', chapter_id: 10, chapter_no: 10 },
            ],
          }),
        },
      ],
    } as any)

    expect(model.batchReviewQueue.status).toBe('done')
    expect(model.batchReviewQueue.riskRadar.status).toBe('ok')
    expect((model.batchReviewQueue.riskRadar as any).handoffRiskCount).toBe(0)
    expect((model.batchReviewQueue.riskRadar as any).readerPullRiskCount).toBe(0)
    expect(model.batchReviewQueue.riskRadar.repairTasks).toHaveLength(0)
    expect(model.batchReviewQueue.handoff.status).not.toBe('repair_risks')
    expect(model.batchReviewQueue.nextAction.key).not.toBe('create_safe_batch_risk_repair')
  })

  test('releases underlying batch risks after composite batch brief repairs are resolved and rechecked', () => {
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
        { id: 9, chapter_no: 9, title: '阵盘裂纹', chapter_text: '正文'.repeat(1550) },
        { id: 10, chapter_no: 10, title: '外门震动', chapter_text: '正文'.repeat(1510) },
      ],
      reviews: [
        { id: 102, chapter_id: 9, review_type: 'prose_quality', created_at: '2026-06-03T01:01:00.000Z', payload: JSON.stringify({ score: 85, passed: true }) },
        { id: 103, chapter_id: 10, review_type: 'prose_quality', created_at: '2026-06-03T01:02:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
        { id: 202, chapter_id: 9, review_type: 'reader_payoff_sync', created_at: '2026-06-03T01:04:00.000Z', payload: JSON.stringify({ reader_payoff_sync: { status: 'warn', debt_count: 1, missed: ['阵盘反噬回报'] } }) },
        { id: 203, chapter_id: 10, review_type: 'storyline_sync', created_at: '2026-06-03T01:05:00.000Z', payload: JSON.stringify({ storyline_sync: { status: 'warn', missed: ['进入内门视野'] } }) },
        { id: 301, chapter_id: 9, review_type: 'prose_quality', created_at: '2026-06-03T02:10:00.000Z', payload: JSON.stringify({ score: 84, passed: true }) },
        { id: 302, chapter_id: 10, review_type: 'prose_quality', created_at: '2026-06-03T02:11:00.000Z', payload: JSON.stringify({ score: 86, passed: true }) },
      ],
      runRecords: [
        {
          id: 10,
          run_type: 'batch_generate_prose',
          created_at: '2026-06-03T00:00:00.000Z',
          status: 'success',
          input_ref: JSON.stringify({
            source: 'auto_creation_safe_batch',
            safety_limit: 2,
            next_batch_brief: {
              chapterRangeLabel: '第9-10章',
              batchGoal: '三章内进入内门视野。',
              readerPayoffPlan: '升级、打脸、规则反制逐章交付。',
              mainlineFocus: '外门危机 -> 内门招揽',
              forbiddenBoundary: '第10章前不得揭露规则源头。',
              chapters: [
                { chapterNo: 9, title: '阵盘裂纹', chapterTask: '兑现阵盘反噬回报。' },
                { chapterNo: 10, title: '外门震动', chapterTask: '推进到内门视野。' },
              ],
            },
          }),
          output_ref: JSON.stringify({
            total: 2,
            success: 2,
            failed: 0,
            chapters: [
              { id: 9, chapter_no: 9, title: '阵盘裂纹', status: 'success', score: 85, word_count: 3090 },
              { id: 10, chapter_no: 10, title: '外门震动', status: 'success', score: 86, word_count: 3021 },
            ],
          }),
        },
        {
          id: 11,
          run_type: 'longform_production_repair',
          created_at: '2026-06-03T02:00:00.000Z',
          status: 'completed',
          input_ref: JSON.stringify({ source: 'auto_creation_safe_batch_risk', batch_created_at: '2026-06-03T00:00:00.000Z' }),
          output_ref: JSON.stringify({
            tasks: [
              { task_type: 'repair_quality', issue_type: 'batch_brief_mismatch', task_status: 'resolved', chapter_id: 9, chapter_no: 9 },
              { task_type: 'repair_quality', issue_type: 'batch_brief_mismatch', task_status: 'resolved', chapter_id: 10, chapter_no: 10 },
            ],
          }),
        },
      ],
    } as any)

    expect(model.batchReviewQueue.status).toBe('done')
    expect(model.batchReviewQueue.riskRadar.status).toBe('ok')
    expect(model.batchReviewQueue.riskRadar.payoffDebtCount).toBe(0)
    expect(model.batchReviewQueue.riskRadar.storylineRiskCount).toBe(0)
    expect(model.batchReviewQueue.riskRadar.batchPlanRiskCount).toBe(0)
    expect(model.batchReviewQueue.riskRadar.repairTasks).toHaveLength(0)
  })

  test('keeps acceptance workflow as the only next step after prose exists', () => {
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

    expect(model.status).toBe('needs_acceptance')
    expect(model.mainAction.area).toBe('writing')
    expect(model.mainAction.key).toBe('refresh_current_quality')
    expect(model.mainAction.label).toBe('复检当前版本')
    expect(model.pipeline.find(step => step.key === 'quality_gate')?.status).toBe('active')
  })

  test('continues after prose is delivered with warnings and keeps repair work nonblocking', () => {
    const model = buildAutoCreationDirectorModel({
      planning: basePlanning,
      writing: {
        ...baseWriting,
        nextChapter: { ...baseWriting.nextChapter, wordCount: 3200, hasProse: true },
        chapterHandoffDesk: {
          visible: true,
          status: 'ready',
          label: '可接下一章',
          fromChapterNo: 8,
          toChapterNo: 9,
          actionKey: 'accept_chapter_and_continue',
          actionLabel: '进入下一章开写',
        },
        chapterAcceptanceDesk: {
          ...baseWriting.chapterAcceptanceDesk,
          visible: true,
          acceptanceStatus: 'delivered_with_warnings',
          admissionStatus: 'accepted_with_warnings',
          statusLabel: '已入库，建议修订',
          acceptanceReasons: ['评分低于建议目标', '正文已入库，故事状态待补同步'],
          qualityWarnings: [{ code: 'quality_score_below_target', source: 'quality', message: '评分低于建议目标' }],
          storyStateStatus: 'pending',
          postCommitWarnings: [],
          qualityScore: 72,
          storyStateSynced: false,
          approvalBlocker: null,
          recommendedAcceptanceAction: { key: 'accept_chapter_and_continue', label: '验收并进入下一章' },
          secondaryActions: [
            { key: 'apply_editor_revision', label: '生成修订稿' },
            { key: 'sync_story_state', label: '同步故事状态' },
          ],
        },
        readiness: {
          checks: [],
          blockers: [],
          warnings: [{ key: 'story_state_stale', status: 'warning', label: '故事状态滞后', detail: '待补同步' }],
        },
        readinessChecks: [{ key: 'story_state_stale', status: 'warning', label: '故事状态滞后', detail: '待补同步' }],
        topStatus: { ...baseWriting.topStatus, nextActionLabel: '验收并进入下一章', primaryActionKey: 'accept_chapter_and_continue' },
        primaryActionKey: 'accept_chapter_and_continue',
      },
      activeTasks: [],
      selectedModelId: 12,
    } as any)

    expect(model.status).toBe('needs_acceptance')
    expect(model.mainAction.key).toBe('accept_chapter_and_continue')
    expect(model.pipeline.find(step => step.key === 'chapter_execution')?.status).toBe('done')
    expect(model.pipeline.find(step => step.key === 'quality_gate')?.status).toBe('warning')
    expect(model.pipeline.find(step => step.key === 'canon_sync')?.status).toBe('warning')
    expect(model.pipeline.find(step => step.key === 'chapter_handoff')?.status).toBe('done')
    expect(model.serialWorkflow.stages.find(stage => stage.key === 'delivery_acceptance')?.status).not.toBe('blocked')
  })

  test('uses post-draft oh-story director recommended continuation as the main action', () => {
    const model = buildAutoCreationDirectorModel({
      planning: basePlanning,
      writing: {
        ...baseWriting,
        nextChapter: { ...baseWriting.nextChapter, id: 2, chapterNo: 2, title: '巡考夺令', wordCount: 3200, hasProse: true },
        chapterAcceptanceDesk: {
          ...baseWriting.chapterAcceptanceDesk,
          visible: false,
        },
      },
      activeTasks: [],
      selectedModelId: 12,
      chapters: [
        {
          id: 2,
          chapter_no: 2,
          title: '巡考夺令',
          status: 'drafted',
          raw_payload: {
            oh_story_director: {
              stage: 'post_draft',
              readiness: 'ready',
              acceptance: 'accepted_with_carryover',
              primary_action: { key: 'continue_next_chapter', label: '继续下一章', mode: 'automatic' },
              carryover_findings: [
                { key: 'story_power', label: '故事力续航', detail: '下一章开篇补代价反馈', blocking: false },
              ],
              required_repairs: [],
              deferred_repairs: [],
              selected_contracts: [],
              prompt_budget_plan: { full: [], compact: ['quality_carryover'], reference: [], omit: [] },
              evidence: [],
            },
          },
        },
      ],
    } as any)

    expect(model.status).toBe('needs_acceptance')
    expect(model.statusLabel).toBe('可继续，有承接')
    expect(model.mainAction.key).toBe('accept_chapter_and_continue')
    expect(model.mainAction.label).toBe('继续下一章')
    expect(model.summary).toContain('下一章开篇补代价反馈')
  })

  test('keeps current chapter acceptance repair ahead of an older post-draft oh-story director', () => {
    const model = buildAutoCreationDirectorModel({
      planning: basePlanning,
      writing: {
        ...baseWriting,
        nextChapter: { ...baseWriting.nextChapter, id: 8, chapterNo: 8, title: '试炼前夜', wordCount: 3200, hasProse: true },
        chapterAcceptanceDesk: {
          ...baseWriting.chapterAcceptanceDesk,
          visible: true,
          acceptanceStatus: 'needs_revision',
          statusLabel: '需修订',
          acceptanceReasons: ['当前章编辑报告仍有必须修复项。'],
          recommendedAcceptanceAction: { key: 'apply_editor_revision', label: '生成修订稿' },
        },
        topStatus: { ...baseWriting.topStatus, nextActionLabel: '生成修订稿', primaryActionKey: 'apply_editor_revision' },
        primaryActionKey: 'apply_editor_revision',
      },
      activeTasks: [],
      selectedModelId: 12,
      chapters: [
        {
          id: 2,
          chapter_no: 2,
          title: '巡考夺令',
          status: 'drafted',
          raw_payload: {
            oh_story_director: {
              stage: 'post_draft',
              readiness: 'ready',
              acceptance: 'accepted',
              primary_action: { key: 'continue_next_chapter', label: '继续下一章', mode: 'automatic' },
              carryover_findings: [],
              required_repairs: [],
              deferred_repairs: [],
              selected_contracts: [],
              prompt_budget_plan: { full: [], compact: [], reference: [], omit: [] },
              evidence: [],
            },
          },
        },
      ],
    } as any)

    expect(model.status).toBe('needs_acceptance')
    expect(model.mainAction.key).toBe('apply_editor_revision')
    expect(model.mainAction.key).not.toBe('accept_chapter_and_continue')
  })})

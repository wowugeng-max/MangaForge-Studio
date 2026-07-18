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

describe('buildAutoCreationDirectorModel receipts/gates/delivery-risk', () => {
  test('blocks safe batching when prose revision receipt sync misses delivery risk receipts', () => {
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
          id: 211,
          chapter_id: 8,
          review_type: 'prose_revision_receipt_sync',
          created_at: '2026-06-04T01:10:00.000Z',
          status: 'warn',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            prose_revision_receipt_sync: {
              status: 'warn',
              label: '修订回执残留 1',
              summary: 'delivery_risk_receipts 有失败项，但 revision_receipts 没有对应修订证据。',
              missed_count: 1,
              missed: [
                {
                  issue_type: 'delivery_risk_receipt',
                  required_action: '章末把带血腰牌变成新的未解问题。',
                  repair_segment: 'ending_actions',
                  text: '最后300字没有形成追读钩子。',
                },
              ],
              next_actions: [
                '补齐 delivery_risk_receipts 对应的 revision_receipts；每条必须写 required_action、repair_segment、applied_fix 和 changed_evidence。',
              ],
            },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.totalOpen).toBe(1)
    expect(model.deliveryRiskGate.highOpen).toBe(1)
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('修订回执')
    expect(model.deliveryRiskGate.topRisks.join('｜')).toContain('修订回执第8章：最后300字没有形成追读钩子。')
    expect(model.mainAction.key).toBe('create_delivery_risk_repair')
    expect(model.mainAction.payload?.deliveryRiskGate?.categories.map((item: any) => item.label)).toContain('修订回执')
    expect(model.mainAction.payload?.deliveryRiskGate?.topRisks.join('｜')).toContain('delivery_risk_receipts 对应的 revision_receipts')
    expect(model.batchGuardrail.status).toBe('blocked')
    expect(model.batchGuardrail.recommendedAction.payload?.deliveryRiskGate?.categories.map((item: any) => item.label)).toContain('修订回执')
  })

  test('delivery risk gate explains convergence-cleared risks without repair tasks', () => {
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
          id: 302,
          chapter_id: 7,
          review_type: 'delivery_risk_convergence',
          created_at: '2026-06-04T01:12:00.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            delivery_risk_convergence: {
              status: 'cleared',
              label: '风险已清零',
              before_count: 1,
              after_count: 0,
              after: { total_count: 0, items: [] },
            },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('ok')
    expect(model.deliveryRiskGate.totalOpen).toBe(0)
    expect(model.deliveryRiskGate.recentlyResolved).toEqual([
      expect.objectContaining({
        label: '复检收敛已清',
        count: 1,
        chapterNos: [7],
        issueTypes: ['delivery_risk_convergence'],
      }),
    ])
    expect(model.deliveryRiskGate.recentlyResolved[0]?.detail).toContain('第7章')
    expect(model.deliveryRiskGate.recentlyResolved[0]?.detail).toContain('风险已清零')
    expect(model.deliveryRiskGate.recentlyResolved[0]?.detail).toContain('风险清零')
    expect(model.batchGuardrail.status).toBe('ready')
  })

  test('delivery risk gate uses the latest review for the same chapter and risk type', () => {
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
          id: 401,
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
          id: 402,
          chapter_id: 7,
          review_type: 'chapter_core_drift',
          created_at: '2026-06-04T01:20:00.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            core_drift: { status: 'ok', drift_risks: [], risks: [], summary: '核心已回正' },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('ok')
    expect(model.deliveryRiskGate.totalOpen).toBe(0)
    expect(model.batchGuardrail.status).toBe('ready')
    expect(model.batchGuardrail.recommendedAction.key).toBe('start_safe_batch_generation')
  })

  test('delivery risk gate blocks safe batching for runway and volume beat risks', () => {
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
          id: 501,
          chapter_id: 7,
          review_type: 'runway_sync',
          created_at: '2026-06-04T01:00:00.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            runway_sync: {
              status: 'warn',
              risk_count: 2,
              label: '航线风险 2',
              four_question_missed: ['本章没有回答主角下一步方向'],
              redline_touched: ['临时支线压过阵法秩序主线'],
            },
          }),
        },
        {
          id: 502,
          chapter_id: 7,
          review_type: 'volume_beat_sync',
          created_at: '2026-06-04T01:01:00.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            volume_beat_sync: {
              status: 'warn',
              missed_count: 1,
              missed: ['卷级小高潮没有形成可见回报'],
            },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toEqual(expect.arrayContaining(['航线', '爆点']))
    expect(model.deliveryRiskGate.topRisks).toContain('航线第7章：本章没有回答主角下一步方向；临时支线压过阵法秩序主线')
    expect(model.batchGuardrail.status).toBe('blocked')
    expect(model.batchGuardrail.recommendedAction.key).toBe('create_delivery_risk_repair')
  })

  test('delivery risk gate releases volume beat risk when annotation repair uses beat alias', () => {
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
      chapters: [
        { id: 7, chapter_no: 7, title: '旧规反噬', chapter_text: '正文'.repeat(1500) },
      ],
      reviews: [
        {
          id: 502,
          chapter_id: 7,
          review_type: 'volume_beat_sync',
          created_at: '2026-06-04T01:01:00.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            volume_beat_sync: {
              status: 'warn',
              missed_count: 1,
              missed: ['卷级小高潮没有形成可见回报'],
            },
          }),
        },
        {
          id: 602,
          chapter_id: 7,
          review_type: 'prose_quality',
          created_at: '2026-06-04T02:10:00.000Z',
          payload: JSON.stringify({ score: 84, passed: true }),
        },
      ],
      runRecords: [
        {
          id: 701,
          run_type: 'longform_production_repair',
          created_at: '2026-06-04T02:00:00.000Z',
          status: 'completed',
          output_ref: JSON.stringify({
            tasks: [
              {
                source: 'review_annotation_risk',
                task_type: 'repair_quality',
                issue_type: 'volume_beat_missed',
                task_status: 'resolved',
                chapter_id: 7,
                chapter_no: 7,
              },
            ],
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('ok')
    expect(model.deliveryRiskGate.totalOpen).toBe(0)
    expect(model.batchGuardrail.status).toBe('ready')
    expect(model.batchGuardrail.recommendedAction.key).toBe('start_safe_batch_generation')
  })

  test('delivery risk gate explains why repaired risks no longer block safe batching', () => {
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
      chapters: [
        { id: 7, chapter_no: 7, title: '旧规反噬', chapter_text: '正文'.repeat(1500) },
      ],
      reviews: [
        {
          id: 502,
          chapter_id: 7,
          review_type: 'volume_beat_sync',
          created_at: '2026-06-04T01:01:00.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            volume_beat_sync: {
              status: 'warn',
              missed_count: 1,
              missed: ['卷级小高潮没有形成可见回报'],
            },
          }),
        },
        {
          id: 602,
          chapter_id: 7,
          review_type: 'prose_quality',
          created_at: '2026-06-04T02:10:00.000Z',
          payload: JSON.stringify({ score: 84, passed: true }),
        },
      ],
      runRecords: [
        {
          id: 701,
          run_type: 'longform_production_repair',
          created_at: '2026-06-04T02:00:00.000Z',
          status: 'completed',
          output_ref: JSON.stringify({
            tasks: [
              {
                source: 'review_annotation_risk',
                task_type: 'repair_quality',
                issue_type: 'volume_beat_missed',
                task_status: 'resolved',
                chapter_id: 7,
                chapter_no: 7,
              },
            ],
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('ok')
    expect((model.deliveryRiskGate as any).recentlyResolved).toEqual([
      expect.objectContaining({
        label: '任务修复已清',
        count: 1,
        chapterNos: [7],
        issueTypes: ['volume_beat_missed'],
      }),
    ])
    expect((model.deliveryRiskGate as any).recentlyResolved[0].detail).toContain('第7章')
    expect((model.deliveryRiskGate as any).recentlyResolved[0].detail).toContain('爆点')
    expect((model.deliveryRiskGate as any).recentlyResolved[0].detail).toContain('复检通过')
  })

  test('delivery risk gate releases repaired prose revision receipt risks after quality recheck', () => {
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
          sceneCards: [{ title: '反向设局', goal: '主角用阵法拿回主动权' }],
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
      chapters: [
        { id: 8, chapter_no: 8, title: '试炼前夜', chapter_text: '正文'.repeat(1500) },
      ],
      reviews: [
        {
          id: 211,
          chapter_id: 8,
          review_type: 'prose_revision_receipt_sync',
          created_at: '2026-06-04T01:10:00.000Z',
          status: 'warn',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            prose_revision_receipt_sync: {
              status: 'warn',
              label: '修订回执残留 1',
              summary: 'delivery_risk_receipts 有失败项，但 revision_receipts 没有对应修订证据。',
              missed_count: 1,
              missed: ['最后300字没有形成追读钩子。'],
            },
          }),
        },
        {
          id: 602,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-04T02:10:00.000Z',
          payload: JSON.stringify({ score: 86, passed: true }),
        },
      ],
      runRecords: [
        {
          id: 701,
          run_type: 'longform_production_repair',
          created_at: '2026-06-04T02:00:00.000Z',
          status: 'completed',
          output_ref: JSON.stringify({
            tasks: [
              {
                source: 'review_annotation_risk',
                task_type: 'repair_quality',
                annotation_category: 'prose_revision_receipt',
                task_status: 'resolved',
                chapter_id: 8,
                chapter_no: 8,
              },
            ],
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('ok')
    expect(model.deliveryRiskGate.totalOpen).toBe(0)
    expect((model.deliveryRiskGate as any).recentlyResolved).toEqual([
      expect.objectContaining({
        label: '任务修复已清',
        count: 1,
        chapterNos: [8],
        issueTypes: ['prose_revision_receipt'],
      }),
    ])
    expect((model.deliveryRiskGate as any).recentlyResolved[0].detail).toContain('第8章')
    expect((model.deliveryRiskGate as any).recentlyResolved[0].detail).toContain('修订回执')
    expect((model.deliveryRiskGate as any).recentlyResolved[0].detail).toContain('复检通过')
    expect(model.batchGuardrail.status).toBe('ready')
  })

  test('delivery risk gate blocks safe batching for unresolved reader expectation debt', () => {
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
          id: 601,
          chapter_id: 7,
          review_type: 'reader_expectation_sync',
          created_at: '2026-06-04T01:00:00.000Z',
          payload: JSON.stringify({
            chapter_id: 7,
            chapter_no: 7,
            reader_expectation_sync: {
              status: 'warn',
              missed_count: 2,
              label: '期待欠账 2',
              missed: ['没有回应阵盘第二道裂纹', '没有承接执事背后供奉悬念'],
            },
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('block')
    expect(model.deliveryRiskGate.categories.map(item => item.label)).toContain('期待')
    expect(model.deliveryRiskGate.topRisks).toContain('期待第7章：没有回应阵盘第二道裂纹；没有承接执事背后供奉悬念')
    expect(model.batchGuardrail.status).toBe('blocked')
    expect(model.batchGuardrail.recommendedAction.key).toBe('create_delivery_risk_repair')
  })

  test('delivery risk gate releases opening handoff and readability subtype repairs after recheck', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        futureRoute: [
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
          {
            chapterNo: 11,
            title: '内门来人',
            chapterTask: '内门势力抛出招揽条件',
            conflict: '招揽背后附带夺阵盘的暗线',
            endingHook: '内门令牌落在桌上',
            mainlineProgress: '主角进入内门视野',
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
            { title: '承接裂纹', goal: '开篇接住上一章阵盘裂纹危机' },
            { title: '内门施压', goal: '把招揽条件变成现场压迫' },
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
      chapters: [
        { id: 8, chapter_no: 8, title: '试炼前夜', chapter_text: '正文'.repeat(1500) },
      ],
      reviews: [
        {
          id: 801,
          chapter_id: 8,
          review_type: 'reader_expectation_sync',
          created_at: '2026-06-04T01:00:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
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
        {
          id: 802,
          chapter_id: 8,
          review_type: 'readability_review',
          created_at: '2026-06-04T01:01:00.000Z',
          payload: JSON.stringify({
            chapter_id: 8,
            chapter_no: 8,
            readability_review: {
              status: 'warn',
              readability_score: 84,
              opening_hook_score: 52,
              meme_sense: { intensity: '轻度', immersion_risks: [] },
            },
          }),
        },
        {
          id: 803,
          chapter_id: 8,
          review_type: 'prose_quality',
          created_at: '2026-06-04T02:10:00.000Z',
          payload: JSON.stringify({ score: 85, passed: true }),
        },
      ],
      runRecords: [
        {
          id: 901,
          run_type: 'longform_production_repair',
          created_at: '2026-06-04T02:00:00.000Z',
          status: 'completed',
          output_ref: JSON.stringify({
            tasks: [
              {
                source: 'review_annotation_risk',
                task_type: 'repair_quality',
                issue_type: 'opening_handoff_debt',
                task_status: 'resolved',
                chapter_id: 8,
                chapter_no: 8,
              },
              {
                source: 'review_annotation_risk',
                task_type: 'repair_quality',
                issue_type: 'opening_pull_risk',
                task_status: 'resolved',
                chapter_id: 8,
                chapter_no: 8,
              },
            ],
          }),
        },
      ],
    } as any)

    expect(model.deliveryRiskGate.status).toBe('ok')
    expect(model.deliveryRiskGate.totalOpen).toBe(0)
    expect(model.batchGuardrail.status).toBe('ready')
    expect(model.batchGuardrail.recommendedAction.key).toBe('start_safe_batch_generation')
  })

})

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

describe('buildAutoCreationDirectorModel expansion/guardrails b', () => {
  test('limits safe batching to consecutive ready writing queue chapters', () => {
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
          },
          {
            chapterNo: 9,
            title: '阵盘裂纹',
            chapterTask: '阵盘异常暴露主角潜力',
            conflict: '同门围堵试探底牌',
            endingHook: '内门执事点名关注',
            mainlineProgress: '让宗门高层第一次注意主角',
          },
          {
            chapterNo: 10,
            title: '外门震动',
            chapterTask: '试炼结果引发宗门震动',
            conflict: '旧秩序压制新晋黑马',
            endingHook: '内门招揽提出苛刻条件',
            mainlineProgress: '打开内门势力线',
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
          sceneCards: [{ title: '压迫升级', goal: '执事逼主角交阵盘' }],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
        writingQueue: {
          visible: true,
          currentChapterNo: 8,
          readyCount: 2,
          blockedCount: 1,
          draftedCount: 0,
          planRepair: {
            visible: true,
            label: '补齐队列计划',
            chapterCount: 1,
            missingCount: 2,
            chapterNos: [9],
            intent: { source: 'writing_queue_batch_plan_repair', chapter_nos: [9] },
          },
          items: [
            { id: 8, chapterNo: 8, title: '试炼前夜', sourceLabel: '滚动规划', status: 'ready_to_draft', statusLabel: '可开写', actionLabel: '开写', actionHint: '', missingPlanFields: [], missingPlanLabels: [], repairIntent: null, goal: '拿到资格', conflict: '执事阻拦', endingHook: '阵盘裂纹', wordCount: 0 },
            { id: 9, chapterNo: 9, title: '阵盘裂纹', sourceLabel: '滚动规划', status: 'needs_plan', statusLabel: '缺计划', actionLabel: '补计划', actionHint: '', missingPlanFields: ['conflict'], missingPlanLabels: ['核心冲突'], repairIntent: { source: 'writing_queue_plan_repair', chapter_no: 9 }, goal: '阵盘异常', conflict: '', endingHook: '内门关注', wordCount: 0 },
            { id: 10, chapterNo: 10, title: '外门震动', sourceLabel: '滚动规划', status: 'ready_to_draft', statusLabel: '可开写', actionLabel: '开写', actionHint: '', missingPlanFields: [], missingPlanLabels: [], repairIntent: null, goal: '宗门震动', conflict: '旧秩序压制', endingHook: '苛刻条件', wordCount: 0 },
          ],
        },
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.batchGuardrail.status).toBe('caution')
    expect(model.batchGuardrail.safeChapterCount).toBe(1)
    expect(model.batchGuardrail.guardrails.find(item => item.label === '写作队列放行')?.status).toBe('warn')
    expect(model.batchGuardrail.guardrails.find(item => item.label === '写作队列放行')?.detail).toContain('连续可写 1 章')
    expect(model.batchGuardrail.releaseWindow.allowedChapters.map(chapter => chapter.chapterNo)).toEqual([8])
    expect(model.batchGuardrail.releaseWindow.blockedChapters.map(chapter => chapter.chapterNo)).toEqual([9])
    expect(model.batchGuardrail.releaseWindow.blockedChapters[0]?.reason).toContain('缺计划')
    expect(model.batchGuardrail.releaseWindow.summary).toContain('第8章')
    expect(model.batchGuardrail.releaseWindow.summary).toContain('第9章')
    expect(model.batchGuardrail.preflight.visible).toBe(true)
    expect(model.batchGuardrail.preflight.status).toBe('caution')
    expect(model.batchGuardrail.preflight.allowedChapterNos).toEqual([8])
    expect(model.batchGuardrail.preflight.blockedChapterNos).toEqual([9])
    expect(model.batchGuardrail.preflight.warnings.join('；')).toContain('第9章')
    expect(model.batchGuardrail.preflight.inputSnapshot).toMatchObject({
      source: 'auto_creation_safe_batch_preflight',
      safe_chapter_count: 1,
      allowed_chapter_nos: [8],
      blocked_chapter_nos: [9],
      chapter_range_label: '第8章',
    })
    expect(model.batchGuardrail.nextBatchBrief.chapterRangeLabel).toBe('第8章')
    expect(model.batchGuardrail.recommendedAction.key).toBe('update_rolling_plan')
    expect(model.batchGuardrail.recommendedAction.payload?.source).toBe('writing_queue_batch_plan_repair')
  })

  test('downgrades safe batching when serial release inventory is below the buffer line', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        serialReleaseDesk: {
          status: 'needs_buffer',
          score: 60,
          label: '存稿不足',
          summary: '当前可发布 1 章，约 0 天，低于 3 天安全线。',
          dailyTargetChapters: 2,
          minBufferDays: 3,
          lastPublishedChapter: 7,
          publishableChapters: 1,
          bufferDays: 0,
          primaryAction: {
            key: 'enter_chapter_writing',
            label: '补存稿',
            reason: '当前可发布 1 章，约 0 天，低于最低 3 天存稿。',
          },
          pipeline: [],
          releaseWindow: [
            { chapterNo: 8, title: '试炼前夜', wordCount: 3100, status: 'publishable', riskTags: [] },
            { chapterNo: 9, title: '阵盘裂纹', wordCount: 0, status: 'drafting', riskTags: [] },
          ],
          riskChapters: [],
          nextActions: ['至少再完成 5 章，恢复 3 天安全垫。'],
        },
        futureRoute: [
          { chapterNo: 8, title: '试炼前夜', chapterTask: '主角拿到试炼资格', conflict: '执事设局阻拦', endingHook: '阵盘亮起第二道裂纹', mainlineProgress: '主角从被动挨压转为主动入局' },
          { chapterNo: 9, title: '阵盘裂纹', chapterTask: '阵盘异常暴露主角潜力', conflict: '同门围堵试探底牌', endingHook: '内门执事点名关注', mainlineProgress: '宗门高层第一次注意主角' },
          { chapterNo: 10, title: '外门震动', chapterTask: '试炼结果引发宗门震动', conflict: '旧秩序压制新晋黑马', endingHook: '内门招揽提出苛刻条件', mainlineProgress: '打开内门势力线' },
        ],
      },
      writing: {
        ...baseWriting,
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '资格争夺', goal: '主角拿到试炼资格' }],
          reasons: [],
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
    expect(model.batchGuardrail.guardrails.find(item => item.label === '连载库存')?.status).toBe('warn')
    expect(model.batchGuardrail.guardrails.find(item => item.label === '连载库存')?.detail).toContain('低于 3 天安全线')
    expect(model.productionLicense.status).toBe('single_chapter')
    expect(model.productionLicense.modeLabel).toBe('单章生产')
    expect(model.todayCommandDeck.qualityGates.find(item => item.key === 'serial_safety')?.status).toBe('warn')
    expect(model.todayCommandDeck.qualityGates.find(item => item.key === 'serial_safety')?.detail).toContain('低于 3 天安全线')
  })

  test('blocks safe batching when the serial release window contains chapters needing revision', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        serialReleaseDesk: {
          status: 'blocked',
          score: 48,
          label: '发布阻塞',
          summary: '发布窗口有 1 章存在风险，暂不建议直接发布。',
          dailyTargetChapters: 2,
          minBufferDays: 3,
          lastPublishedChapter: 7,
          publishableChapters: 2,
          bufferDays: 1,
          primaryAction: {
            key: 'open_quality_revision',
            label: '修复发布窗口',
            reason: '发布窗口内第 8 章存在质检风险，先修订再发。',
          },
          pipeline: [],
          releaseWindow: [
            { chapterNo: 8, title: '试炼前夜', wordCount: 3100, status: 'needs_revision', riskTags: ['读者拉力不足'] },
            { chapterNo: 9, title: '阵盘裂纹', wordCount: 3200, status: 'publishable', riskTags: [] },
          ],
          riskChapters: [
            { chapterNo: 8, title: '试炼前夜', riskTags: ['读者拉力不足'] },
          ],
          nextActions: ['先处理发布窗口内的质检风险，再恢复发稿节奏。'],
        },
        futureRoute: [
          { chapterNo: 8, title: '试炼前夜', chapterTask: '主角拿到试炼资格', conflict: '执事设局阻拦', endingHook: '阵盘亮起第二道裂纹', mainlineProgress: '主角从被动挨压转为主动入局' },
          { chapterNo: 9, title: '阵盘裂纹', chapterTask: '阵盘异常暴露主角潜力', conflict: '同门围堵试探底牌', endingHook: '内门执事点名关注', mainlineProgress: '宗门高层第一次注意主角' },
          { chapterNo: 10, title: '外门震动', chapterTask: '试炼结果引发宗门震动', conflict: '旧秩序压制新晋黑马', endingHook: '内门招揽提出苛刻条件', mainlineProgress: '打开内门势力线' },
        ],
      },
      writing: {
        ...baseWriting,
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '资格争夺', goal: '主角拿到试炼资格' }],
          reasons: [],
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

    expect(model.batchGuardrail.status).toBe('blocked')
    expect(model.batchGuardrail.safeChapterCount).toBe(0)
    expect(model.batchGuardrail.guardrails.find(item => item.label === '连载库存')?.status).toBe('block')
    expect(model.batchGuardrail.guardrails.find(item => item.label === '连载库存')?.detail).toContain('发布窗口有 1 章存在风险')
    expect(model.batchGuardrail.recommendedAction.key).toBe('open_quality_revision')
    expect(model.productionLicense.status).toBe('blocked')
    expect(model.productionLicense.nextAction.key).toBe('open_quality_revision')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'batch_release')?.status).toBe('blocked')
  })

  test('downgrades safe batching when the next batch brief is too vague for multi-chapter production', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        futureRoute: [
          { chapterNo: 8, title: '试炼前夜' },
          { chapterNo: 9, title: '阵盘裂纹' },
          { chapterNo: 10, title: '外门震动' },
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
    })

    expect(model.batchGuardrail.status).toBe('caution')
    expect(model.batchGuardrail.safeChapterCount).toBe(1)
    expect(model.batchGuardrail.recommendedAction.key).toBe('update_rolling_plan')
    expect(model.batchGuardrail.recommendedAction.label).toBe('补齐批次任务书')
    expect(model.batchGuardrail.recommendedAction.modelCall).toBe(true)
    expect(model.batchGuardrail.guardrails.find(item => item.label === '批次任务书')?.status).toBe('warn')
    expect(model.batchGuardrail.guardrails.find(item => item.label === '批次任务书')?.detail).toContain('逐章职责')
    expect(model.batchGuardrail.nextBatchBrief.chapterRangeLabel).toBe('第8章')
    expect(model.batchGuardrail.nextBatchBrief.chapters.map(item => item.chapterNo)).toEqual([8])
    expect(model.batchGuardrail.summary).toContain('下一批任务书')
    expect(model.batchGuardrail.briefRepair.visible).toBe(true)
    expect(model.batchGuardrail.briefRepair.status).toBe('warn')
    expect(model.batchGuardrail.briefRepair.title).toBe('补齐下一批任务书')
    expect(model.batchGuardrail.briefRepair.action.label).toBe('补齐批次任务书')
    expect(model.batchGuardrail.briefRepair.action.payload?.source).toBe('batch_brief_repair')
    expect(model.batchGuardrail.briefRepair.action.payload?.missing_items).toContain('缺逐章职责：第9章、第10章')
    expect(model.batchGuardrail.briefRepair.action.payload?.next_batch_brief?.chapterRangeLabel).toBe('第8-10章')
    expect(model.batchGuardrail.briefRepair.missingItems).toEqual([
      '缺逐章职责：第9章、第10章',
      '缺冲突落点：第9章、第10章',
      '缺章末钩子：第9章、第10章',
      '缺主线推进：第9章、第10章',
    ])
    expect(model.batchGuardrail.briefRecovery.visible).toBe(false)
  })

  test('downgrades safe batching when recent 10 chapters show fatigue risk', () => {
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
        recentFatigueRadar: {
          ...basePlanning.recentFatigueRadar,
          status: 'needs_attention',
          score: 61,
          label: '疲劳风险 61',
          summary: '近10章存在 3 类同质化风险：冲突变化、回报变化、钩子变化。',
          actionKey: 'update_rolling_plan',
          signals: [
            { key: 'conflict_variety', label: '冲突变化', status: 'warn', score: 58, count: 7, detail: '近10章「执事压迫」出现 7 次，冲突来源变化不足。', actionKey: 'update_rolling_plan' },
            { key: 'payoff_variety', label: '回报变化', status: 'warn', score: 64, count: 6, detail: '近10章「打脸」出现 6 次，回报形态变化不足。', actionKey: 'update_rolling_plan' },
            { key: 'hook_variety', label: '钩子变化', status: 'warn', score: 62, count: 6, detail: '近10章「试炼将至」出现 6 次，章末问题变化不足。', actionKey: 'update_rolling_plan' },
            { key: 'scene_freshness', label: '场面新鲜度', status: 'ok', score: 82, count: 0, detail: '场面有轮换。', actionKey: 'enter_chapter_writing' },
          ],
          nextActions: ['下一批章节要更换压迫来源、回报形态、章末问题或可视化场面，避免十章连续同质化。'],
        },
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
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.batchGuardrail.status).toBe('caution')
    expect(model.batchGuardrail.safeChapterCount).toBe(1)
    expect(model.batchGuardrail.recommendedAction.key).toBe('update_rolling_plan')
    expect(model.batchGuardrail.guardrails.find(item => item.label === '近10章疲劳')?.status).toBe('warn')
    expect(model.batchGuardrail.guardrails.find(item => item.label === '近10章疲劳')?.detail).toContain('同质化')
    expect(model.batchGuardrail.summary).toContain('近10章疲劳')
    expect(model.pipeline.find(step => step.key === 'batch_guardrail')?.status).toBe('warning')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'batch_release')?.status).toBe('pending')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'batch_release')?.badges).toContain('安全 1章')
  })

  test('surfaces IP scene coverage gaps in safe batching fatigue guardrail', () => {
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
        recentFatigueRadar: {
          ...basePlanning.recentFatigueRadar,
          status: 'needs_attention',
          score: 70,
          label: '疲劳风险 70',
          summary: '近10章存在 1 类同质化风险：场面新鲜度。',
          actionKey: 'update_rolling_plan',
          signals: [
            { key: 'conflict_variety', label: '冲突变化', status: 'ok', score: 86, count: 0, detail: '冲突来源轮换正常。', actionKey: 'enter_chapter_writing' },
            { key: 'payoff_variety', label: '回报变化', status: 'ok', score: 84, count: 0, detail: '回报形态轮换正常。', actionKey: 'enter_chapter_writing' },
            { key: 'hook_variety', label: '钩子变化', status: 'ok', score: 83, count: 0, detail: '章末问题轮换正常。', actionKey: 'enter_chapter_writing' },
            {
              key: 'scene_freshness',
              label: '场面新鲜度',
              status: 'warn',
              score: 60,
              count: 9,
              detail: 'IP场面覆盖 1/10，强场面空窗偏长。已沉淀：玻璃门内外对峙',
              actionKey: 'update_rolling_plan',
            },
          ],
          nextActions: ['下一批章节要补标志性场面。'],
        },
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
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    const fatigueGuardrail = model.batchGuardrail.guardrails.find(item => item.label === '近10章疲劳')

    expect(model.batchGuardrail.status).toBe('caution')
    expect(model.batchGuardrail.safeChapterCount).toBe(1)
    expect(model.batchGuardrail.recommendedAction.key).toBe('update_rolling_plan')
    expect(model.batchGuardrail.recommendedAction.payload?.recent_fatigue_radar).toBeTruthy()
    expect(fatigueGuardrail?.status).toBe('warn')
    expect(fatigueGuardrail?.detail).toContain('IP场面覆盖 1/10')
    expect(fatigueGuardrail?.detail).toContain('玻璃门内外对峙')
    expect(model.batchGuardrail.recommendedAction.description).toContain('IP场面覆盖 1/10')
    expect(model.batchGuardrail.summary).toContain('IP场面覆盖 1/10')
  })

  test('downgrades safe batching when story pressure ladder is weak', () => {
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
            conflict: '执事继续阻拦',
            endingHook: '执事再次加码',
            mainlineProgress: '外门压迫线继续',
            riskTags: [],
          },
          {
            chapterNo: 10,
            title: '外门震动',
            chapterTask: '试炼结果引发宗门震动',
            conflict: '执事仍旧阻拦',
            endingHook: '执事继续施压',
            mainlineProgress: '外门压迫线继续',
            riskTags: [],
          },
        ],
        storyPressureLadder: {
          ...basePlanning.storyPressureLadder,
          status: 'needs_attention',
          score: 62,
          label: '压力待升 62',
          summary: '未来章节存在 2 项故事压力风险：压力源、赌注升级。',
          actionKey: 'update_rolling_plan',
          pressureSources: [{ label: '执事阻拦', count: 3, chapters: [8, 9, 10], riskLevel: 'warn' }],
          signals: [
            { key: 'pressure_source', label: '压力源', status: 'warn', score: 62, count: 3, detail: '未来3章「执事阻拦」出现 3 次，压力源过于集中。', actionKey: 'update_rolling_plan' },
            { key: 'conflict_escalation', label: '冲突升级', status: 'ok', score: 82, count: 0, detail: '未来章节能看到压力加码或冲突升级。', actionKey: 'enter_chapter_writing' },
            { key: 'stakes_growth', label: '赌注升级', status: 'warn', score: 58, count: 2, detail: '未来章节缺少可感知赌注，读者可能觉得主角只是顺路过关。', actionKey: 'update_rolling_plan' },
            { key: 'reversal_pressure', label: '反转逼迫', status: 'ok', score: 82, count: 0, detail: '未来章节有反转或逼迫。', actionKey: 'enter_chapter_writing' },
          ],
          nextActions: ['下一批章节要明确压力源、升级赌注和反转逼迫，保证故事持续往前拱。'],
        },
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
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.batchGuardrail.status).toBe('caution')
    expect(model.batchGuardrail.safeChapterCount).toBe(1)
    expect(model.batchGuardrail.recommendedAction.key).toBe('update_rolling_plan')
    expect(model.batchGuardrail.recommendedAction.payload?.source).toBe('story_pressure_repair')
    expect(model.batchGuardrail.guardrails.find(item => item.label === '故事压力阶梯')?.status).toBe('warn')
    expect(model.batchGuardrail.guardrails.find(item => item.label === '故事压力阶梯')?.detail).toContain('压力风险')
    expect(model.batchGuardrail.summary).toContain('故事压力')
    expect(model.batchGuardrail.preflight.warnings.join('；')).toContain('故事压力阶梯')
  })

  test('downgrades safe batching when the current story unit is incomplete', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        storyUnitWorkshop: {
          ...basePlanning.storyUnitWorkshop,
          status: 'needs_attention',
          score: 66,
          label: '单元待补 66',
          summary: '当前剧情单元缺少完整事件包：本剧情单元仍缺：小高潮/回报、出单元钩子。',
          actionKey: 'update_rolling_plan',
          currentUnit: {
            ...basePlanning.storyUnitWorkshop.currentUnit,
            status: 'needs_attention',
            score: 66,
            summary: '本剧情单元仍缺：小高潮/回报、出单元钩子。',
            signals: [
              { key: 'entry_hook', label: '入口钩子', status: 'ok', score: 88, count: 1, detail: '第8章有入口钩子。', actionKey: 'enter_chapter_writing' },
              { key: 'pressure_escalation', label: '压力升级', status: 'ok', score: 88, count: 2, detail: '本单元有压力升级。', actionKey: 'enter_chapter_writing' },
              { key: 'mini_climax_payoff', label: '小高潮/回报', status: 'warn', score: 62, count: 1, detail: '本单元缺少小高潮或读者回报。', actionKey: 'update_rolling_plan' },
              { key: 'setup_and_storyline', label: '伏笔/剧情线', status: 'ok', score: 88, count: 1, detail: '本单元有剧情线调度。', actionKey: 'enter_chapter_writing' },
              { key: 'exit_hook', label: '出单元钩子', status: 'warn', score: 62, count: 1, detail: '单元最后一章缺少出单元钩子。', actionKey: 'update_rolling_plan' },
            ],
          },
          nextActions: ['先补齐当前剧情单元的入口钩子、压力升级、小高潮回报、伏笔/剧情线和出单元钩子，再扩大批量连写。'],
        },
      },
      writing: {
        ...baseWriting,
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
    })

    expect(model.batchGuardrail.status).toBe('caution')
    expect(model.batchGuardrail.safeChapterCount).toBe(1)
    expect(model.batchGuardrail.recommendedAction.key).toBe('update_rolling_plan')
    expect(model.batchGuardrail.recommendedAction.payload?.source).toBe('story_unit_repair')
    expect(model.batchGuardrail.guardrails.find(item => item.label === '剧情单元')?.status).toBe('warn')
    expect(model.batchGuardrail.guardrails.find(item => item.label === '剧情单元')?.detail).toContain('小高潮')
    expect(model.batchGuardrail.summary).toContain('剧情单元')
    expect(model.batchGuardrail.preflight.warnings.join('；')).toContain('剧情单元')
  })

  test('downgrades safe batching when million-word capacity is too shallow for an epic target', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          writtenWords: 48000,
          targetWords: 10000000,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        storylineBoard: {
          ...basePlanning.storylineBoard,
          total: 3,
          summary: '只有主线和两条支线，十万字后容易耗尽冲突。',
        },
        volumeBeatBudget: {
          ...basePlanning.volumeBeatBudget,
          plannedChapterCount: 22,
          totalChapters: 40,
          score: 86,
          status: 'ready',
        },
      },
      writing: {
        ...baseWriting,
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
    })

    expect(model.longformCapacity.status).toBe('caution')
    expect(model.longformCapacity.targetBandLabel).toBe('1000万字级')
    expect(model.longformCapacity.signals.find(signal => signal.key === 'storyline_pool')?.status).toBe('warn')
    expect(model.longformCapacity.fuelQueue.map(item => item.label)).toEqual(['补剧情线池', '延长当前卷跑道'])
    expect(model.longformCapacity.fuelQueue[0]?.actionKey).toBe('open_story_assets')
    expect(model.longformCapacity.fuelQueue[0]?.modelCall).toBe(false)
    expect(model.batchGuardrail.status).toBe('caution')
    expect(model.batchGuardrail.safeChapterCount).toBe(1)
    expect(model.batchGuardrail.guardrails.find(item => item.label === '百万字产能')?.status).toBe('warn')
    expect(model.pipeline.find(step => step.key === 'longform_capacity')?.status).toBe('warning')
    expect(model.metrics.longformCapacityScore).toBeLessThan(80)
  })

  test('blocks continuous production when longform canon state is stale', () => {
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
            { key: 'story_state_stale', status: 'warning', label: '故事状态可能滞后', detail: '建议同步最近已写章节的状态机。', actionKey: 'update_canon' },
          ],
          checks: [],
        },
        readinessChecks: [
          { key: 'story_state_stale', status: 'warning', label: '故事状态可能滞后', detail: '建议同步最近已写章节的状态机。', actionKey: 'update_canon' },
        ],
        primaryActionKey: 'update_canon',
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '同步故事状态',
          primaryActionKey: 'update_canon',
        },
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

    expect(model.status).toBe('needs_governance')
    expect(model.statusLabel).toBe('长线记忆待同步')
    expect(model.mainAction.key).toBe('update_canon')
    expect(model.batchGuardrail.status).toBe('blocked')
    expect(model.batchGuardrail.safeChapterCount).toBe(0)
    expect(model.batchGuardrail.guardrails.find(item => item.label === '长线记忆')?.status).toBe('block')
    expect(model.batchGuardrail.guardrails.find(item => item.label === '长线记忆')?.detail).toContain('故事状态可能滞后')
    expect(model.dailyBattlePlan.currentStepKey).toBe('fuel_materials')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'fuel_materials')?.status).toBe('active')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'fuel_materials')?.action.key).toBe('update_canon')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'chapter_work')?.status).toBe('pending')
    expect(model.dailyBattlePlan.steps.find(step => step.key === 'batch_release')?.status).toBe('blocked')
  })
})

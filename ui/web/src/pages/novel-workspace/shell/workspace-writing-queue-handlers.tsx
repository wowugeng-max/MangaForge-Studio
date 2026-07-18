import { message } from 'antd'

export type WritingQueueHandlerDeps = {
  runRollingPlan: any
  selectChapterForWriting: (chapterId: number) => Promise<any>
}

export function createWritingQueueHandlers(deps: WritingQueueHandlerDeps) {
  const {
    runRollingPlan,
    selectChapterForWriting,
  } = deps

  const repairWritingQueuePlan = async (item: any) => {
    const chapterId = Number(item?.id || 0)
    if (!chapterId) return message.warning('这个队列项没有绑定章节')
    if (!await selectChapterForWriting(chapterId)) return
    await runRollingPlan({
      intent: {
        ...(item?.repairIntent || {}),
        source: 'writing_queue_plan_repair',
        chapter_id: chapterId,
        chapter_no: Number(item?.chapterNo || 0),
        title: item?.title || '',
        source_label: item?.sourceLabel || '',
        missing_fields: Array.isArray(item?.missingPlanFields) ? item.missingPlanFields : [],
        missing_labels: Array.isArray(item?.missingPlanLabels) ? item.missingPlanLabels : [],
        instruction: '只补齐当前章节的目标、核心冲突、章末钩子和必要场景职责，不改长期主线、不提前消费后续爆点。',
      },
    })
  }

  const repairWritingQueuePlanBatch = async (queue: any) => {
    const intent = queue?.planRepair?.intent
    if (!intent) return message.warning('当前队列没有可补齐的计划缺口')
    await runRollingPlan({
      intent: {
        ...intent,
        source: 'writing_queue_batch_plan_repair',
        instruction: '批量补齐写作队列里缺少的章节目标、核心冲突、章末钩子和必要场景职责；保持章节顺序、长期主线、剧情线和禁揭边界不变，不提前消费后续爆点。',
      },
    })
  }

  return {
    repairWritingQueuePlan,
    repairWritingQueuePlanBatch,
  }
}

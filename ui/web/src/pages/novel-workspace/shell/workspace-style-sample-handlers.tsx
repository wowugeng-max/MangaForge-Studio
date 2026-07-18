import { message, Modal } from 'antd'
import { buildStyleSampleTaskBookRecheckPlan } from '../autoCreationDirectorModel'
import { renderLongformRepairAuditContentView } from './workspace-commercial-result'
import type { TaskCenterActionOptions } from './workspace-types'

export type StyleSampleHandlerDeps = {
  apiClient: any
  applyStyleSampleActionForChapter: any
  autoCreationDirectorModel: any
  loadProductionTasks: any
  loadProjectModules: any
  projectId: any
  setTaskCenterOpen: (value: boolean) => void
  sortedChapters: any[]
  updateRepairTaskStatus: any
}

export function createStyleSampleHandlers(deps: StyleSampleHandlerDeps) {
  const {
    apiClient,
    applyStyleSampleActionForChapter,
    autoCreationDirectorModel,
    loadProductionTasks,
    loadProjectModules,
    projectId,
    setTaskCenterOpen,
    sortedChapters,
    updateRepairTaskStatus,
  } = deps

  const recheckStyleSampleTaskBookReviewTasks = async (items: any[]) => {
    const preflight = autoCreationDirectorModel.batchGuardrail.preflight.inputSnapshot?.style_sample_batch_preflight
    const plan = buildStyleSampleTaskBookRecheckPlan({
      items,
      styleSampleBatchPreflight: preflight,
    })
    if (plan.status === 'needs_preflight') {
      message.warning(plan.summary)
      return
    }
    if (!plan.resolvedItems.length) {
      message.warning(plan.summary)
      return
    }
    try {
      const grouped = new Map<number, { run: any; indices: number[] }>()
      for (const item of plan.resolvedItems) {
        const runId = Number(item?.run?.id || 0)
        if (!runId || !Number.isInteger(Number(item?.taskIndex))) continue
        const existing = grouped.get(runId) || { run: item.run, indices: [] }
        existing.indices.push(Number(item.taskIndex))
        grouped.set(runId, existing)
      }
      for (const group of grouped.values()) {
        await apiClient.post(`/novel/runs/${group.run.id}/tasks/status-bulk`, {
          project_id: projectId,
          task_indices: group.indices,
          status: 'resolved',
          note: '样章任务书复检通过：下一批任务书已避开风险样章',
        })
      }
      await loadProjectModules()
      await loadProductionTasks()
      if (plan.blockedItems.length > 0) {
        message.warning(plan.summary)
      } else {
        message.success(plan.summary)
      }
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '样章任务书复检失败')
    }
  }

  const generateLongformRepairAuditSummary = async (run: any, options: TaskCenterActionOptions = {}) => {
    try {
      const res = await apiClient.post(`/novel/projects/${projectId}/longform-production-trends/repair-runs/${run.id}/audit-summary`)
      const audit = res.data?.audit || {}
      await loadProjectModules()
      await loadProductionTasks()
      if (options.keepTaskCenterOpen) {
        message.success('恢复依据复盘已刷新')
        return
      }
      Modal.info({
        title: '长线生产修复闭环审计',
        width: 760,
        content: renderLongformRepairAuditContentView(audit),
      })
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '生成闭环审计失败')
    }
  }

  const executeStyleSampleTaskBookRebuild = async (task: any, run?: any, taskIndex = -1, options: TaskCenterActionOptions = {}) => {
    const chapterId = Number(task?.chapter_id || 0)
    const chapterNo = Number(task?.chapter_no || task?.chapterNo || 0)
    const targetChapter = (chapterId ? sortedChapters.find(item => Number(item.id) === chapterId) : null)
      || (chapterNo ? sortedChapters.find(item => Number(item.chapter_no || 0) === chapterNo) : null)
      || null
    if (!targetChapter?.id) {
      message.warning('这个样章任务没有匹配章节')
      return
    }
    if (!options.keepTaskCenterOpen) setTaskCenterOpen(false)
    const changed = await applyStyleSampleActionForChapter(targetChapter, 'replace', '已换样章并重审任务书，请重新确认任务书')
    if (changed && run?.id && taskIndex >= 0) {
      await updateRepairTaskStatus(run, taskIndex, 'needs_review', '已换样章并清除任务书确认状态，等待作者重审任务书')
    }
  }

  return {
    recheckStyleSampleTaskBookReviewTasks,
    generateLongformRepairAuditSummary,
    executeStyleSampleTaskBookRebuild,
  }
}

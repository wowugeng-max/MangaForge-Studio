import { message } from 'antd'
import { buildRepairTaskRevisionPrompt } from '../repairTaskRevisionPrompt'
import type { EditorReportForChapterOptions } from './workspace-types'

export type EditorReportHandlerDeps = {
  activeChapter: any
  apiClient: any
  applyEditorRevision: any
  flushPendingSave: any
  loadProjectModules: any
  projectId: any
  selectedModelId: any
  setEditorReportLoading: (value: boolean) => void
  setRightPanelOpen: (value: boolean) => void
  setRightPanelTab: (value: any) => void
}

export function createEditorReportHandlers(deps: EditorReportHandlerDeps) {
  const {
    activeChapter,
    apiClient,
    applyEditorRevision,
    flushPendingSave,
    loadProjectModules,
    projectId,
    selectedModelId,
    setEditorReportLoading,
    setRightPanelOpen,
    setRightPanelTab,
  } = deps

  const createEditorReportForChapter = async (chapterId: number, options: EditorReportForChapterOptions = {}) => {
    if (!selectedModelId) return message.warning('请先选择模型')
    if (!await flushPendingSave()) return
    setEditorReportLoading(true)
    try {
      const res = await apiClient.post(`/novel/chapters/${chapterId}/editor-report`, {
        project_id: projectId,
        model_id: selectedModelId,
      })
      await loadProjectModules()
      setRightPanelOpen(true)
      setRightPanelTab('editorReports')
      if (options.autoRevision && res.data?.review) {
        const task = options.sourceTask || {}
        const revisionResult = await applyEditorRevision(res.data.review, {
          revisionMode: String(task.message || task.issue_type || '').includes('钩子') ? 'restore_hook' : 'tighten_pacing',
          prompt: buildRepairTaskRevisionPrompt(task, options.sourceRun),
          sourceTask: task,
          sourceRun: options.sourceRun,
          sourceTaskIndex: options.sourceTaskIndex,
          skipConfirm: options.skipRevisionConfirm,
        })
        return revisionResult
      } else {
        message.success('编辑报告已生成')
      }
      return res.data
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '编辑报告生成失败')
      return null
    } finally {
      setEditorReportLoading(false)
    }
  }

  const createEditorReport = async () => {
    if (!activeChapter) return message.warning('请先选择章节')
    await createEditorReportForChapter(activeChapter.id)
  }

  return {
    createEditorReport,
    createEditorReportForChapter,
  }
}

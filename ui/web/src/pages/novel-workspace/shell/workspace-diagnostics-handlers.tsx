import { message, Modal } from 'antd'
import { renderChapterQualityCardContentView } from './workspace-commercial-result'

export type DiagnosticsHandlerDeps = {
  activeChapter: any
  apiClient: any
  flushPendingSave: any
  projectId: any
  setDiagnosticsLoading: any
  showDiagnosticsModal: any
}

export function createDiagnosticsHandlers(deps: DiagnosticsHandlerDeps) {
  const activeChapter = deps.activeChapter
  const apiClient = deps.apiClient
  const flushPendingSave = deps.flushPendingSave
  const projectId = deps.projectId
  const setDiagnosticsLoading = deps.setDiagnosticsLoading
  const showDiagnosticsModal = deps.showDiagnosticsModal

  const openGenerationDiagnostics = async () => {
    if (!activeChapter) return message.warning('请先选择章节')
    if (!await flushPendingSave()) return
    setDiagnosticsLoading(true)
    try {
      const res = await apiClient.get(`/novel/chapters/${activeChapter.id}/generation-diagnostics`, {
        params: { project_id: projectId },
      })
      showDiagnosticsModal(res.data || {})
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '生成前诊断失败')
    } finally {
      setDiagnosticsLoading(false)
    }
  }

  const openChapterQualityCardForChapter = async (chapterId: number) => {
    try {
      const res = await apiClient.get(`/novel/chapters/${chapterId}/quality-card`, { params: { project_id: projectId } })
      const card = res.data?.quality_card || {}
      Modal.info({
        title: '章节交稿质检',
        width: 900,
        content: renderChapterQualityCardContentView(card),
      })
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '章节交稿质检加载失败')
    }
  }

  const openChapterQualityCard = async () => {
    if (!activeChapter) return message.warning('请先选择章节')
    await openChapterQualityCardForChapter(Number(activeChapter.id))
  }


  return {
    openGenerationDiagnostics,
    openChapterQualityCardForChapter,
    openChapterQualityCard,
  }
}

import { message } from 'antd'

export type ChapterPrepHandlerDeps = {
  activeChapter: any
  apiClient: any
  flushPendingSave: any
  loadProjectModules: any
  projectId: any
  selectChapterForWriting: any
  setChapters: any
  setCommercialToolLoading: any
}

export function createChapterPrepHandlers(deps: ChapterPrepHandlerDeps) {
  const activeChapter = deps.activeChapter
  const apiClient = deps.apiClient
  const flushPendingSave = deps.flushPendingSave
  const loadProjectModules = deps.loadProjectModules
  const projectId = deps.projectId
  const selectChapterForWriting = deps.selectChapterForWriting
  const setChapters = deps.setChapters
  const setCommercialToolLoading = deps.setCommercialToolLoading

  const buildPreDraftBriefForActiveChapter = async () => {
    if (!activeChapter) return message.warning('请先选择章节')
    if (!await flushPendingSave()) return
    setCommercialToolLoading('preDraftBrief')
    try {
      const res = await apiClient.get(`/novel/chapters/${activeChapter.id}/pre-draft-brief`, {
        params: { project_id: projectId },
      })
      const brief = res.data?.brief || {}
      const saveRes = await apiClient.put(`/novel/chapters/${activeChapter.id}/pre-draft-brief`, {
        project_id: projectId,
        brief,
      })
      if (saveRes.data?.chapter) {
        setChapters(prev => prev.map(c => c.id === saveRes.data.chapter.id ? saveRes.data.chapter : c))
      }
      await loadProjectModules()
      message.success('章节开写任务书已生成')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '任务书生成失败')
    } finally {
      setCommercialToolLoading('')
    }
  }

  const confirmPreDraftBriefForActiveChapter = async () => {
    if (!activeChapter) return message.warning('请先选择章节')
    if (!await flushPendingSave()) return
    setCommercialToolLoading('preDraftBriefConfirm')
    try {
      const res = await apiClient.post(`/novel/chapters/${activeChapter.id}/pre-draft-brief/confirm`, {
        project_id: projectId,
        brief: activeChapter.raw_payload?.pre_draft_brief || activeChapter.raw_payload?.preDraftBrief,
      })
      if (res.data?.chapter) {
        setChapters(prev => prev.map(c => c.id === res.data.chapter.id ? res.data.chapter : c))
      }
      await loadProjectModules()
      message.success('章节开写任务书已确认')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '任务书确认失败')
    } finally {
      setCommercialToolLoading('')
    }
  }

  const savePreDraftBriefForActiveChapter = async (brief: any) => {
    if (!activeChapter) return message.warning('请先选择章节')
    if (!await flushPendingSave()) return
    setCommercialToolLoading('preDraftBrief')
    try {
      const res = await apiClient.put(`/novel/chapters/${activeChapter.id}/pre-draft-brief`, {
        project_id: projectId,
        brief,
      })
      if (res.data?.chapter) {
        setChapters(prev => prev.map(c => c.id === res.data.chapter.id ? res.data.chapter : c))
      }
      await loadProjectModules()
      message.success('章节开写任务书已保存')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '任务书保存失败')
    } finally {
      setCommercialToolLoading('')
    }
  }

  const applyStyleSampleActionForChapter = async (targetChapter: any, action: 'lock' | 'replace' | 'disable', successMessage = '') => {
    if (!targetChapter?.id) {
      message.warning('请先选择章节')
      return false
    }
    if (Number(activeChapter?.id || 0) === Number(targetChapter.id)) {
      if (!await flushPendingSave()) return false
    } else if (!await selectChapterForWriting(Number(targetChapter.id))) {
      return false
    }
    const loadingKey = action === 'lock' ? 'styleSampleLock' : action === 'replace' ? 'styleSampleReplace' : 'styleSampleDisable'
    setCommercialToolLoading(loadingKey)
    try {
      const res = await apiClient.post(`/novel/chapters/${targetChapter.id}/pre-draft-brief/style-samples`, {
        project_id: projectId,
        action,
      })
      if (res.data?.chapter) {
        setChapters(prev => prev.map(c => c.id === res.data.chapter.id ? res.data.chapter : c))
      }
      await loadProjectModules()
      if (successMessage) message.success(successMessage)
      else if (action === 'lock') message.success('本章风格样章已锁定')
      else if (action === 'replace') message.success('已换一组风格样章，请重新确认任务书')
      else if (action === 'disable') message.success('本章已不用风格样章，请重新确认任务书')
      return true
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '风格样章操作失败')
      return false
    } finally {
      setCommercialToolLoading('')
    }
  }

  const applyStyleSampleActionForActiveChapter = async (action: 'lock' | 'replace' | 'disable') => {
    return applyStyleSampleActionForChapter(activeChapter, action)
  }


  return {
    buildPreDraftBriefForActiveChapter,
    confirmPreDraftBriefForActiveChapter,
    savePreDraftBriefForActiveChapter,
    applyStyleSampleActionForChapter,
    applyStyleSampleActionForActiveChapter,
  }
}

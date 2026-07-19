import { message, Modal } from 'antd'

export type ChapterVersionHandlerDeps = {
  activeChapter: any
  apiClient: any
  flushPendingSave: any
  loadProjectModules: any
  projectId: any
  rollbackChapterVersion: (versionId: any) => Promise<any>
  setChapterVersionDetail: (value: any) => void
  setChapters: (updater: any) => void
}

export function createChapterVersionHandlers(deps: ChapterVersionHandlerDeps) {
  const {
    activeChapter,
    apiClient,
    flushPendingSave,
    loadProjectModules,
    projectId,
    rollbackChapterVersion,
    setChapterVersionDetail,
    setChapters,
  } = deps

  const mergeChapterVersion = async (version: any, choices: Array<{ index: number; source: 'current' | 'version' }>) => {
    if (!activeChapter) return
    if (!await flushPendingSave()) return
    try {
      const res = await apiClient.post(`/novel/chapters/${activeChapter.id}/version-merge`, {
        project_id: projectId,
        version_id: version.id,
        choices,
      })
      if (res.data?.chapter) setChapters((prev: any[]) => prev.map(ch => ch.id === res.data.chapter.id ? res.data.chapter : ch))
      await loadProjectModules()
      setChapterVersionDetail(null)
      message.success('合并稿已生成')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '版本合并失败')
    }
  }

  const acceptChapterVersion = async (version: any) => {
    await rollbackChapterVersion(version.id)
    setChapterVersionDetail(null)
  }

  return {
    mergeChapterVersion,
    acceptChapterVersion,
  }
}

export type SceneCardHandlerDeps = {
  apiClient: any
  flushPendingSave: any
  loadProjectModules: any
  projectId: any
  selectedModelId: any
  setChapters: (updater: any) => void
  setGeneratingSceneCards: (value: boolean) => void
  showGenerationBlockedModal: (...args: any[]) => void
  activeChapterId?: any
}

export function createSceneCardHandlers(deps: SceneCardHandlerDeps) {
  const {
    apiClient,
    flushPendingSave,
    loadProjectModules,
    projectId,
    selectedModelId,
    setChapters,
    setGeneratingSceneCards,
    showGenerationBlockedModal,
    activeChapterId,
  } = deps

  const generateSceneCardsForChapter = async (chapterId: number, allowIncomplete = false) => {
    if (!selectedModelId) return message.warning('请先选择写作模型')
    if (!await flushPendingSave()) return
    setGeneratingSceneCards(true)
    try {
      const res = await apiClient.post(`/novel/chapters/${chapterId}/scene-cards`, {
        project_id: projectId,
        model_id: selectedModelId,
        allow_incomplete: allowIncomplete,
      })
      if (res.data?.chapter) {
        setChapters((prev: any[]) => prev.map(c => c.id === res.data.chapter.id ? res.data.chapter : c))
      }
      await loadProjectModules()
      message.success(`场景卡已生成：${Array.isArray(res.data?.scene_cards) ? res.data.scene_cards.length : 0} 个`)
    } catch (error: any) {
      const payload = error?.response?.data
      if (payload?.error_code === 'SCENE_PREFLIGHT_BLOCKED') {
        showGenerationBlockedModal(payload, () => { void generateSceneCardsForChapter(chapterId, true) }, {
          targetChapterId: chapterId,
          onRepairComplete: () => { void generateSceneCardsForChapter(chapterId, false) },
        })
      } else {
        message.error(payload?.error || error?.message || '场景卡生成失败')
      }
    } finally {
      setGeneratingSceneCards(false)
    }
  }

  const generateSceneCardsForActiveChapter = async (allowIncomplete = false) => {
    if (!activeChapterId) return
    await generateSceneCardsForChapter(Number(activeChapterId), allowIncomplete)
  }

  return {
    generateSceneCardsForChapter,
    generateSceneCardsForActiveChapter,
  }
}


export type ProjectAssetDeleteHandlerDeps = {
  apiClient: any
  flushPendingSave: any
  loadProjectModules: any
  navigate: (path: string) => void
  selectedProject: any
}

export function createProjectAssetDeleteHandlers(deps: ProjectAssetDeleteHandlerDeps) {
  const {
    apiClient,
    flushPendingSave,
    loadProjectModules,
    navigate,
    selectedProject,
  } = deps

  const deleteProject = () => {
    if (!selectedProject) return
    Modal.confirm({
      title: '删除项目',
      content: '确定删除整个项目吗？此操作会清理所有目录、章节和版本记录。',
      okText: '删除', okButtonProps: { danger: true },
      onOk: async () => { await apiClient.delete(`/novel/projects/${selectedProject.id}`); navigate('/novel') },
    })
  }

  const deleteChapter = async (cid: number) => {
    if (!await flushPendingSave()) return
    await apiClient.delete(`/novel/chapters/${cid}`)
    await loadProjectModules()
  }

  const deleteOutline = async (oid: number) => {
    await apiClient.delete(`/novel/outlines/${oid}`)
    await loadProjectModules()
  }

  return {
    deleteProject,
    deleteChapter,
    deleteOutline,
  }
}

export type StorylineDecisionHandlerDeps = {
  apiClient: any
  loadProductionTasks: any
  loadProjectModules: any
  projectId: any
  setAutoDirectorActionLoadingKey: (value: string) => void
  setTaskCenterOpen: (value: boolean) => void
}

export function createStorylineDecisionHandlers(deps: StorylineDecisionHandlerDeps) {
  const {
    apiClient,
    loadProductionTasks,
    loadProjectModules,
    projectId,
    setAutoDirectorActionLoadingKey,
    setTaskCenterOpen,
  } = deps

  const recordStorylineDiffDecision = async (intent: any) => {
    if (!intent?.decisionKey) return message.warning('缺少剧情线差异决策键')
    try {
      await apiClient.post(`/novel/projects/${projectId}/storyline-diff-decisions`, {
        decision_key: intent.decisionKey,
        decision: intent.recommendedDecision,
        chapter_no: intent.chapterNo,
        entity_id: intent.entityId,
        entity_name: intent.entityName,
        entity_type: intent.entityType,
        risk_type: intent.riskType,
        risk_label: intent.riskLabel,
        summary: intent.summary,
        evidence: intent.evidence,
      })
      await loadProjectModules()
      message.success(`已记录剧情线决策：${intent.recommendedActionLabel || '已处理'}`)
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '剧情线决策记录失败')
    }
  }

  const createStorylineDecisionTasks = async () => {
    setAutoDirectorActionLoadingKey('create_storyline_decision_tasks')
    try {
      const res = await apiClient.post(`/novel/projects/${projectId}/storyline-diff-decisions/repair-queue`)
      const tasks = res.data?.tasks || []
      await loadProjectModules()
      await loadProductionTasks()
      setTaskCenterOpen(true)
      const skipped = Number(res.data?.skipped_existing || 0)
      const ignored = Number(res.data?.skipped_ignored || 0)
      message.success(`已生成剧情线决策任务：${tasks.length} 项${skipped ? `，跳过已有 ${skipped} 项` : ''}${ignored ? `，忽略误判 ${ignored} 项` : ''}`)
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '生成剧情线决策任务失败')
    } finally {
      setAutoDirectorActionLoadingKey('')
    }
  }

  return {
    recordStorylineDiffDecision,
    createStorylineDecisionTasks,
  }
}

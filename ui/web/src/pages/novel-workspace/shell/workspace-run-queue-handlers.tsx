import { message } from 'antd'

export type RunQueueHandlerDeps = {
  activeChapter: any
  apiClient: any
  chapterWordTargetPayload: any
  flushPendingSave: any
  loadProductionTasks: any
  loadProjectModules: any
  navigate: any
  productionMode: any
  projectId: any
  runCommercialTool: any
  selectedChapterIds: any
  selectedModelId: any
  setChapterGroupExecutingId: any
  setChapters: any
  setPipelineLoading: any
  setReleaseRepairExecutingId: any
  setSelectMode: any
  setSelectedChapterIds: any
  setTaskCenterOpen: any
}

export function createRunQueueHandlers(deps: RunQueueHandlerDeps) {
  const activeChapter = deps.activeChapter
  const apiClient = deps.apiClient
  const chapterWordTargetPayload = deps.chapterWordTargetPayload
  const flushPendingSave = deps.flushPendingSave
  const loadProductionTasks = deps.loadProductionTasks
  const loadProjectModules = deps.loadProjectModules
  const navigate = deps.navigate
  const productionMode = deps.productionMode
  const projectId = deps.projectId
  const runCommercialTool = deps.runCommercialTool
  const selectedChapterIds = deps.selectedChapterIds
  const selectedModelId = deps.selectedModelId
  const setChapterGroupExecutingId = deps.setChapterGroupExecutingId
  const setChapters = deps.setChapters
  const setPipelineLoading = deps.setPipelineLoading
  const setReleaseRepairExecutingId = deps.setReleaseRepairExecutingId
  const setSelectMode = deps.setSelectMode
  const setSelectedChapterIds = deps.setSelectedChapterIds
  const setTaskCenterOpen = deps.setTaskCenterOpen

  const openRunQueue = async () => {
    await runCommercialTool('queue', '后台任务队列', async () => {
      const res = await apiClient.get(`/novel/projects/${projectId}/run-queue`)
      return res.data
    })
  }

  const openProductionDesk = async () => {
    navigate(`/novel/workspace/${projectId}/production`)
  }

  const startRunQueueWorker = async () => {
    if (!selectedModelId) return message.warning('请先选择模型')
    await runCommercialTool('queueWorker', '后台任务队列', async () => {
      await apiClient.post(`/novel/projects/${projectId}/run-queue/start-worker`, {
        model_id: selectedModelId,
        max_chapters_per_run: 1,
      })
      const res = await apiClient.get(`/novel/projects/${projectId}/run-queue`)
      setTaskCenterOpen(true)
      return res.data
    })
  }

  const stopRunQueueWorker = async () => {
    await runCommercialTool('queueStop', '后台任务队列', async () => {
      await apiClient.post(`/novel/projects/${projectId}/run-queue/stop-worker`)
      const res = await apiClient.get(`/novel/projects/${projectId}/run-queue`)
      return res.data
    })
  }

  const recoverRunQueue = async () => {
    await runCommercialTool('queueRecover', '恢复后台任务队列', async () => {
      const res = await apiClient.post(`/novel/projects/${projectId}/run-queue/recover`)
      await loadProductionTasks()
      setTaskCenterOpen(true)
      return res.data
    })
  }

  const executeChapterGroupRun = async (run: any) => {
    if (!selectedModelId) return message.warning('请先选择模型')
    setChapterGroupExecutingId(run.id)
    try {
      await apiClient.post(`/novel/projects/${projectId}/chapter-groups/${run.id}/execute`, {
        model_id: selectedModelId,
        max_chapters: 50,
        production_mode: productionMode,
        ...chapterWordTargetPayload(),
      })
      await loadProjectModules()
      await loadProductionTasks()
      message.success('章节群执行完成或已暂停')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '章节群执行失败')
    } finally {
      setChapterGroupExecutingId(null)
    }
  }

  const approveChapterGroupStage = async (run: any, chapter: any) => {
    try {
      await apiClient.post(`/novel/projects/${projectId}/chapter-groups/${run.id}/approve`, {
        chapter_id: chapter.id,
        stage: chapter.approval_stage || run?.output_ref?.last_error?.approval_stage || 'scene_cards',
      })
      await loadProjectModules()
      await loadProductionTasks()
      message.success('已确认，任务可继续执行')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '确认失败')
    }
  }

  const retryChapterGroupStage = async (run: any, chapter: any) => {
    try {
      await apiClient.post(`/novel/projects/${projectId}/chapter-groups/${run.id}/retry-now`, { chapter_id: chapter.id })
      await loadProjectModules()
      await loadProductionTasks()
      message.success('已加入立即重试')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '重试失败')
    }
  }

  const skipChapterGroupStage = async (run: any, chapter: any) => {
    try {
      await apiClient.post(`/novel/projects/${projectId}/chapter-groups/${run.id}/skip-chapter`, {
        chapter_id: chapter.id,
        reason: '用户在任务中心跳过',
      })
      await loadProjectModules()
      await loadProductionTasks()
      message.success(`已跳过第${chapter.chapter_no}章，可继续执行后续章节`)
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '跳过失败')
    }
  }

  const executeReleaseRepairRun = async (run: any) => {
    setReleaseRepairExecutingId(run.id)
    try {
      const res = await apiClient.post(`/novel/projects/${projectId}/release-repair-runs/${run.id}/execute`, {
        max_items: 100,
      })
      await loadProjectModules()
      await loadProductionTasks()
      const audit = res.data?.release_audit
      message.success(audit?.can_release ? '发布批量任务已完成，发布审核已通过' : '发布批量任务已完成，请刷新交付审核查看剩余问题')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '发布批量任务执行失败')
    } finally {
      setReleaseRepairExecutingId(null)
    }
  }

  const startChapterPipeline = async () => {
    if (!activeChapter) return message.warning('请先选择章节')
    if (!selectedModelId) return message.warning('请先选择写作模型')
    if (!await flushPendingSave()) return
    setPipelineLoading(true)
    try {
      const res = await apiClient.post(`/novel/chapters/${activeChapter.id}/generation-pipeline/start`, {
        project_id: projectId,
        model_id: selectedModelId,
        ...chapterWordTargetPayload(),
        generate_scene_cards: true,
      })
      if (res.data?.chapter) {
        setChapters(prev => prev.map(c => c.id === res.data.chapter.id ? res.data.chapter : c))
      }
      await loadProjectModules()
      setTaskCenterOpen(true)
      message.success('流水线已创建，已停在场景卡确认阶段')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '流水线启动失败')
    } finally {
      setPipelineLoading(false)
    }
  }

  const handleRestructure = async (mode: string, targetCount: number, instructions: string) => {
    if (selectedChapterIds.size < 2) {
      message.warning('至少选择 2 章才能进行重组')
      return
    }
    if (!await flushPendingSave()) return
    message.loading({ content: `${mode === 'expand' ? '正在扩展' : '正在合并'}章节...`, key: 'restructure', duration: 0 })

    const res = await apiClient.post('/novel/chapters/restructure', {
      project_id: projectId,
      model_id: selectedModelId,
      chapter_ids: Array.from(selectedChapterIds),
      mode,
      target_count: targetCount,
      instructions: instructions.trim(),
    })

    message.destroy('restructure')
    message.success(res.data?.message || '章节重组完成')

    // Reset selection and reload
    setSelectedChapterIds(new Set())
    setSelectMode(false)
    await loadProjectModules()
  }


  return {
    openRunQueue,
    openProductionDesk,
    startRunQueueWorker,
    stopRunQueueWorker,
    recoverRunQueue,
    executeChapterGroupRun,
    approveChapterGroupStage,
    retryChapterGroupStage,
    skipChapterGroupStage,
    executeReleaseRepairRun,
    startChapterPipeline,
    handleRestructure,
  }
}

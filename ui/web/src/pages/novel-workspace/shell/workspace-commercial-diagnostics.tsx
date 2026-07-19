import React from 'react'
import { message, Modal, Space, Tag } from 'antd'
import {
  renderContinuityAuditContentView,
  renderFirst30RetentionDiagnosisContentView,
  renderLongformCreationDiagnosisContentView,
  renderLongformPressureTestContentView,
  renderLongformProductionTrendsContentView,
  renderMaterialRepairPlanContentView,
  renderMechanicalQaContentView,
  renderMechanicalQaLlmReviewContentView,
  renderModelDiagnosticsContentView,
  renderPropagationDebtContentView,
  renderPropagationDebtLlmPlanContentView,
  renderReaderTrialReviewContentView,
  renderReferenceKnowledgeDiagnosisContentView,
} from './workspace-commercial-result'

export type CommercialDiagnosticsHandlerDeps = {
  activeChapter: any
  activeChapterId: any
  apiClient: any
  chapterHasProse: any
  chapters: any
  characters: any
  createFirst30RetentionRepairQueue: any
  createLongformProductionRepairQueue: any
  createMechanicalQaRepairQueue: any
  flushPendingSave: any
  formatStoryStateSyncFailure: any
  loadProductionTasks: any
  loadProjectModules: any
  openStoryStateEditor: any
  outlines: any
  projectId: any
  reviews: any
  runCommercialTool: any
  selectChapterForWriting: any
  selectTargetChapterForWriting: any
  selectedModelId: any
  setCommercialToolLoading: any
  setContinuityAudit: any
  setContinuityAuditLoading: any
  setRightPanelOpen: any
  setRightPanelTab: any
  setSelectedProject: any
  sortedChapters: any
}

export function createCommercialDiagnosticsHandlers(deps: CommercialDiagnosticsHandlerDeps) {
  const {
    activeChapter,
    activeChapterId,
    apiClient,
    chapterHasProse,
    chapters,
    characters,
    createFirst30RetentionRepairQueue,
    createLongformProductionRepairQueue,
    createMechanicalQaRepairQueue,
    flushPendingSave,
    formatStoryStateSyncFailure,
    loadProductionTasks,
    loadProjectModules,
    openStoryStateEditor,
    outlines,
    projectId,
    reviews,
    runCommercialTool,
    selectChapterForWriting,
    selectTargetChapterForWriting,
    selectedModelId,
    setCommercialToolLoading,
    setContinuityAudit,
    setContinuityAuditLoading,
    setRightPanelOpen,
    setRightPanelTab,
    setSelectedProject,
    sortedChapters,
  } = deps

const runTopicValidation = async () => {
  if (!selectedModelId) return message.warning('请先选择模型')
  await runCommercialTool('topic', '选题验证', async () => {
    const res = await apiClient.post(`/novel/projects/${projectId}/topic-validation`, { model_id: selectedModelId })
    return res.data
  })
}

const runQualityBenchmark = async () => {
  await runCommercialTool('benchmark', '项目质量基准', async () => {
    const res = await apiClient.post(`/novel/projects/${projectId}/benchmark`, { model_id: selectedModelId })
    return res.data
  })
}

const runFirst30RetentionDiagnosis = async () => {
  setCommercialToolLoading('first30Retention')
  try {
    const res = await apiClient.post(`/novel/projects/${projectId}/first30-retention-diagnosis`)
    const report = res.data?.report || {}
    await loadProjectModules()
    await loadProductionTasks()
    setRightPanelOpen(true)
    setRightPanelTab('bookReviews')
    Modal.info({
      title: '前30章留存诊断',
      width: 960,
      content: renderFirst30RetentionDiagnosisContentView(report, {
        onCreateRepairQueue: () => { void createFirst30RetentionRepairQueue() },
        onOpenChapter: (chapterId) => { Modal.destroyAll(); void selectChapterForWriting(chapterId) },
      }),
    })
  } catch (error: any) {
    message.error(error?.response?.data?.error || error?.message || '前30章留存诊断失败')
  } finally {
    setCommercialToolLoading('')
  }
}


const runReaderTrialReview = async () => {
  setCommercialToolLoading('readerTrial')
  try {
    const res = await apiClient.post(`/novel/projects/${projectId}/reader-trial-review`)
    const report = res.data?.report || {}
    await loadProjectModules()
    await loadProductionTasks()
    setRightPanelOpen(true)
    setRightPanelTab('bookReviews')
    Modal.info({
      title: '读者试读复盘',
      width: 920,
      content: renderReaderTrialReviewContentView(report),
    })
  } catch (error: any) {
    message.error(error?.response?.data?.error || error?.message || '读者试读复盘失败')
  } finally {
    setCommercialToolLoading('')
  }
}







const runLongformCreationDiagnosis = async () => {
  setCommercialToolLoading('longformCreationDiagnosis')
  try {
    const res = await apiClient.post(`/novel/projects/${projectId}/longform-creation-diagnosis`)
    const report = res.data?.report || {}
    await loadProjectModules()
    await loadProductionTasks()
    setRightPanelOpen(true)
    setRightPanelTab('bookReviews')
    Modal.info({
      title: '长篇创作诊断',
      width: 920,
      content: renderLongformCreationDiagnosisContentView(report),
    })
  } catch (error: any) {
    message.error(error?.response?.data?.error || error?.message || '长篇创作诊断失败')
  } finally {
    setCommercialToolLoading('')
  }
}

const runLongformPressureTest = async () => {
  setCommercialToolLoading('longformPressure')
  try {
    const res = await apiClient.post(`/novel/projects/${projectId}/longform-pressure-test`)
    const report = res.data?.report || {}
    await loadProjectModules()
    await loadProductionTasks()
    setRightPanelOpen(true)
    setRightPanelTab('bookReviews')
    Modal.info({
      title: '300万字长线压力测试',
      width: 960,
      content: renderLongformPressureTestContentView(report),
    })
  } catch (error: any) {
    message.error(error?.response?.data?.error || error?.message || '300万字长线压力测试失败')
  } finally {
    setCommercialToolLoading('')
  }
}

const openProductionMetrics = async () => {
  await runCommercialTool('metrics', '生成成本与质量仪表盘', async () => {
    const res = await apiClient.get(`/novel/projects/${projectId}/production-metrics`)
    return res.data
  })
}

const openLongformProductionTrends = async () => {
  setCommercialToolLoading('longformTrends')
  try {
    const res = await apiClient.get(`/novel/projects/${projectId}/longform-production-trends`)
    const trends = res.data?.trends || {}
    const summary = trends.summary || {}
    const weakRows = Array.isArray(trends.weak_rows) ? trends.weak_rows : []
    const recommendations = Array.isArray(trends.recommendations) ? trends.recommendations : []
    const failureReasons = Array.isArray(trends.failure_reasons) ? trends.failure_reasons : []
    Modal.info({
      title: '长线生产趋势报表',
      width: 980,
      content: renderLongformProductionTrendsContentView({
        summary,
        weakRows,
        recommendations,
        failureReasons,
        repairLoading: commercialToolLoading === 'longformRepair',
      }, {
        onCreateRepairQueue: () => { void createLongformProductionRepairQueue() },
        onOpenChapter: (chapterId) => { Modal.destroyAll(); void selectChapterForWriting(chapterId) },
      }),
    })
  } catch (error: any) {
    message.error(error?.response?.data?.error || error?.message || '长线生产趋势报表加载失败')
  } finally {
    setCommercialToolLoading('')
  }
}


const openMaterialRepairPlan = async () => {
  setCommercialToolLoading('materialRepair')
  try {
    const res = await apiClient.get(`/novel/projects/${projectId}/material-repair-plan`, {
      params: { start_chapter: activeChapter?.chapter_no || 1, limit: 120, unwritten_only: 1 },
    })
    const data = res.data || {}
    Modal.info({
      title: '材料补齐计划',
      width: 900,
      content: renderMaterialRepairPlanContentView(data, {
        onOpenChapter: (chapterId) => { Modal.destroyAll(); void selectChapterForWriting(chapterId) },
      }),
    })
  } catch (error: any) {
    message.error(error?.response?.data?.error || error?.message || '材料补齐计划加载失败')
  } finally {
    setCommercialToolLoading('')
  }
}

const openContinuityAudit = async () => {
  setCommercialToolLoading('continuityAudit')
  try {
    const res = await apiClient.get(`/novel/projects/${projectId}/continuity-audit`)
    const audit = res.data?.audit || {}
    setContinuityAudit(audit)
    Modal.info({
      title: '全书连续性检查',
      width: 920,
      content: renderContinuityAuditContentView(audit, {
        onOpenChapterNo: (chapterNo) => {
          const chapter = chapters.find(ch => Number(ch.chapter_no) === Number(chapterNo))
          if (chapter) {
            Modal.destroyAll()
            void selectChapterForWriting(chapter.id)
          }
        },
      }),
    })
  } catch (error: any) {
    message.error(error?.response?.data?.error || error?.message || '全书连续性检查失败')
  } finally {
    setCommercialToolLoading('')
  }
}


const syncStoryStateForChapter = async (chapterId?: number) => {
  const targetId = Number(chapterId || 0)
  const targetChapter = targetId
    ? sortedChapters.find(chapter => Number(chapter.id) === targetId)
    : activeChapter
  if (!targetChapter?.id) {
    openStoryStateEditor()
    return message.warning('当前没有可同步的目标章节，已打开人工故事状态校正。')
  }
  if (!selectedModelId) return message.warning('请先选择模型，再同步故事状态。')
  if (!chapterHasProse(targetChapter)) {
    openStoryStateEditor()
    return message.warning('当前章节还没有正文，已打开人工故事状态校正。')
  }
  if (!await selectTargetChapterForWriting({
    targetChapterId: Number(targetChapter.id),
    activeChapterId: activeChapter?.id,
    selectChapterForWriting,
  })) {
    return message.warning('切换到目标章节失败，未能开始状态机同步。')
  }
  if (!await flushPendingSave()) {
    return message.warning('保存当前章节失败，未能开始状态机同步。')
  }

  const messageKey = 'story-state-sync'
  setCommercialToolLoading('storyStateSync')
  message.loading({ content: `正在同步第 ${targetChapter.chapter_no} 章故事状态机...`, key: messageKey, duration: 0 })
  try {
    const res = await apiClient.post(`/novel/chapters/${targetChapter.id}/story-state-sync`, {
      project_id: projectId,
      model_id: selectedModelId,
      source: 'writing_cockpit_state_sync',
    })
    await loadProjectModules()
    await loadProductionTasks()
    const update = res.data?.story_state_update || {}
    if (update?.ok === false || update?.error) {
      message.error({
        content: formatStoryStateSyncFailure(update),
        key: messageKey,
        duration: 6,
      })
      return
    }
    const softCount = (Array.isArray(update?.synced) ? update.synced : [])
      .reduce((sum: number, item: any) => sum + (Array.isArray(item?.soft_hard_failures) ? item.soft_hard_failures.length : 0), 0)
    const syncedTo = update?.last_synced_chapter || update?.last_updated_chapter || targetChapter.chapter_no
    const base = syncedTo ? `故事状态已同步至第 ${syncedTo} 章。` : '故事状态已同步。'
    message.success({
      content: softCount > 0 ? `${base} 另有 ${softCount} 项计划状态仍有缺口，已写入警告。` : base,
      key: messageKey,
      duration: 4,
    })
  } catch (error: any) {
    message.error({
      content: error?.response?.data?.error || error?.message || '故事状态同步失败',
      key: messageKey,
      duration: 5,
    })
  } finally {
    setCommercialToolLoading('')
  }
}

const refreshConsistencyAudit = async () => {
  setContinuityAuditLoading(true)
  try {
    const res = await apiClient.get(`/novel/projects/${projectId}/continuity-audit`)
    setContinuityAudit(res.data?.audit || {})
    message.success('连续性审计已刷新')
  } catch (error: any) {
    message.error(error?.response?.data?.error || error?.message || '连续性审计刷新失败')
  } finally {
    setContinuityAuditLoading(false)
  }
}

const openReferenceKnowledgeDiagnosis = async () => {
  setCommercialToolLoading('referenceDiagnosis')
  try {
    const [coverageRes, fusionRes, assetsRes] = await Promise.all([
      apiClient.get(`/novel/projects/${projectId}/reference-coverage`).catch(() => ({ data: null })),
      apiClient.get(`/novel/projects/${projectId}/reference-fusion`).catch(() => ({ data: null })),
      apiClient.get(`/novel/projects/${projectId}/writing-assets`).catch(() => ({ data: null })),
    ])
    const coverage = coverageRes.data?.coverage || {}
    const fusion = fusionRes.data?.fusion || {}
    const references = fusionRes.data?.references || []
    const assets = assetsRes.data?.assets || []
    Modal.info({
      title: '参考作品知识诊断',
      width: 940,
      content: renderReferenceKnowledgeDiagnosisContentView({
        coverage,
        fusion,
        references,
        assets,
      }),
    })
  } catch (error: any) {
    message.error(error?.response?.data?.error || error?.message || '参考知识诊断失败')
  } finally {
    setCommercialToolLoading('')
  }
}

const runMechanicalQa = async () => {
  setCommercialToolLoading('mechanicalQa')
  try {
    const res = await apiClient.post(`/novel/projects/${projectId}/mechanical-qa/run`)
    const report = res.data?.report || {}
    await loadProjectModules()
    await loadProductionTasks()
    Modal.info({
      title: '机械质检规则引擎',
      width: 920,
      content: renderMechanicalQaContentView(report, {
        onOpenChapter: (chapterId) => { Modal.destroyAll(); void selectChapterForWriting(chapterId) },
        onOpenChapterNo: (chapterNo) => {
          const chapter = chapters.find(ch => Number(ch.chapter_no) === Number(chapterNo))
          if (chapter) {
            Modal.destroyAll()
            void selectChapterForWriting(chapter.id)
          }
        },
        onCreateRepairQueue: () => { void createMechanicalQaRepairQueue() },
      }),
    })
  } catch (error: any) {
    message.error(error?.response?.data?.error || error?.message || '机械质检失败')
  } finally {
    setCommercialToolLoading('')
  }
}

const runMechanicalQaLlmReview = async () => {
  if (!selectedModelId) return message.warning('请先选择模型')
  setCommercialToolLoading('mechanicalQaLlm')
  try {
    const res = await apiClient.post(`/novel/projects/${projectId}/mechanical-qa/llm-review`, {
      model_id: selectedModelId,
    })
    const aiReport = res.data?.ai_report || {}
    const localReport = res.data?.report || {}
    await loadProjectModules()
    await loadProductionTasks()
    Modal.info({
      title: 'AI 复核机械质检',
      width: 960,
      content: renderMechanicalQaLlmReviewContentView(aiReport, localReport),
    })
  } catch (error: any) {
    message.error(error?.response?.data?.error || error?.message || 'AI复核机械质检失败')
  } finally {
    setCommercialToolLoading('')
  }
}


const refreshPropagationDebt = async () => {
  setCommercialToolLoading('propagationDebt')
  try {
    const res = await apiClient.post(`/novel/projects/${projectId}/propagation-debt/refresh`)
    const report = res.data?.report || {}
    setSelectedProject((prev: any) => res.data?.project || prev)
    await loadProjectModules()
    await loadProductionTasks()
    Modal.info({
      title: '传播债务队列',
      width: 920,
      content: renderPropagationDebtContentView(report, {
        onOpenChapterId: (chapterId) => { Modal.destroyAll(); void selectChapterForWriting(chapterId) },
        onOpenChapterNo: (chapterNo) => {
          const chapter = chapters.find(ch => Number(ch.chapter_no) === Number(chapterNo))
          if (chapter) { Modal.destroyAll(); void selectChapterForWriting(chapter.id) }
        },
        onResolveDebt: async (debtId) => {
          try {
            await apiClient.post(`/novel/projects/${projectId}/propagation-debt/${encodeURIComponent(debtId)}/resolve`, { note: '用户在传播债务队列标记解决' })
            message.success('已标记解决')
            Modal.destroyAll()
            await refreshPropagationDebt()
          } catch (error: any) {
            message.error(error?.response?.data?.error || error?.message || '标记解决失败')
          }
        },
      }),
    })
  } catch (error: any) {
    message.error(error?.response?.data?.error || error?.message || '传播债务刷新失败')
  } finally {
    setCommercialToolLoading('')
  }
}

const runPropagationDebtLlmPlan = async () => {
  if (!selectedModelId) return message.warning('请先选择模型')
  setCommercialToolLoading('propagationDebtLlm')
  try {
    const res = await apiClient.post(`/novel/projects/${projectId}/propagation-debt/llm-plan`, {
      model_id: selectedModelId,
    })
    const aiPlan = res.data?.ai_plan || {}
    const report = res.data?.report || {}
    setSelectedProject((prev: any) => res.data?.project || prev)
    await loadProjectModules()
    await loadProductionTasks()
    Modal.info({
      title: 'AI 传播债务修复方案',
      width: 960,
      content: renderPropagationDebtLlmPlanContentView(aiPlan, report),
    })
  } catch (error: any) {
    message.error(error?.response?.data?.error || error?.message || 'AI传播债务方案生成失败')
  } finally {
    setCommercialToolLoading('')
  }
}

const openModelDiagnostics = async () => {
  setCommercialToolLoading('modelDiagnostics')
  try {
    const res = await apiClient.get(`/novel/projects/${projectId}/model-diagnostics`)
    const report = res.data?.report || {}
    Modal.info({
      title: '模型服务诊断（配置与历史记录）',
      width: 960,
      content: renderModelDiagnosticsContentView(report),
    })
  } catch (error: any) {
    message.error(error?.response?.data?.error || error?.message || '模型诊断失败')
  } finally {
    setCommercialToolLoading('')
  }
}

const openGenreTemplates = async () => {
  setCommercialToolLoading('genreTemplates')
  try {
    const res = await apiClient.get('/novel/genre-templates')
    const templates = res.data?.templates || []
    Modal.info({
      title: '类型模板方法库',
      width: 900,
      content: renderGenreTemplatesContentView(templates, {
        onApplyTemplate: async (item) => {
          try {
            const applyRes = await apiClient.post(`/novel/projects/${projectId}/genre-templates/${item.id}/apply`)
            setSelectedProject((prev: any) => applyRes.data?.project || prev)
            await loadProjectModules()
            message.success(`已应用模板：${item.name}`)
          } catch (error: any) {
            message.error(error?.response?.data?.error || error?.message || '模板应用失败')
          }
        },
      }),
    })
  } catch (error: any) {
    message.error(error?.response?.data?.error || error?.message || '类型模板加载失败')
  } finally {
    setCommercialToolLoading('')
  }
}

const createBackupSnapshot = async () => {
  setCommercialToolLoading('backup')
  try {
    const res = await apiClient.post(`/novel/projects/${projectId}/backup-snapshot`)
    const manifest = res.data?.manifest || {}
    await loadProjectModules()
    await loadProductionTasks()
    Modal.success({
      title: '项目备份快照已创建',
      content: (
        <Space direction="vertical" size={8}>
          <Text>快照：{manifest.snapshot_id}</Text>
          <Text type="secondary">指纹：{manifest.text_hash}</Text>
          <Space wrap>
            <Tag bordered={false}>章节 {manifest.counts?.chapters || 0}</Tag>
            <Tag bordered={false}>大纲 {manifest.counts?.outlines || 0}</Tag>
            <Tag bordered={false}>角色 {manifest.counts?.characters || 0}</Tag>
            <Tag bordered={false}>审稿 {manifest.counts?.reviews || 0}</Tag>
          </Space>
        </Space>
      ),
    })
  } catch (error: any) {
    message.error(error?.response?.data?.error || error?.message || '创建备份快照失败')
  } finally {
    setCommercialToolLoading('')
  }
}

  return {
    runTopicValidation,
    runQualityBenchmark,
    runFirst30RetentionDiagnosis,
    runReaderTrialReview,
    runLongformCreationDiagnosis,
    runLongformPressureTest,
    openProductionMetrics,
    openLongformProductionTrends,
    openMaterialRepairPlan,
    openContinuityAudit,
    syncStoryStateForChapter,
    refreshConsistencyAudit,
    openReferenceKnowledgeDiagnosis,
    runMechanicalQa,
    runMechanicalQaLlmReview,
    refreshPropagationDebt,
    runPropagationDebtLlmPlan,
    openModelDiagnostics,
    openGenreTemplates,
    createBackupSnapshot,
  }
}

import React from 'react'
import { message, Modal, List, Space } from 'antd'
import type { TaskCenterActionOptions } from './workspace-types'
import {
  buildRecoveryEvidenceQueueRecheckTask,
} from './workspace-helpers'
import {
  buildDeliveryRiskRevisionClosurePlan,
  buildRepairTaskRevisionPrompt,
} from '../repairTaskRevisionPrompt'
import {
  resolveEditorRevisionChapterId,
} from '../writingCockpitModel'
import {
  chapterHasProse,
} from '../utils'

export type RepairTaskHandlerDeps = {
  activeChapter: any
  apiClient: any
  chapters: any
  createEditorReportForChapter: any
  executeStyleSampleTaskBookRebuild: any
  flushPendingSave: any
  generateCurrentChapterProse: any
  generateLongformRepairAuditSummary: any
  generateSceneCardsForChapter: any
  latestCockpitQualityReport: any
  loadProjectModules: any
  loadProductionTasks: any
  openEditor: any
  outlines: any
  projectId: any
  reviews: any
  runRecords: any
  runRollingPlan: any
  runSimilarityForChapter: any
  selectChapterForWriting: any
  selectedModelId: any
  setActiveChapterId: any
  setChapters: any
  setCommercialToolLoading: any
  setFuture100FocusOutlineIds: any
  setOutlineTreeOpen: any
  setProseQualityLoading: any
  setReviewAnnotationsOpen: any
  setRightPanelOpen: any
  setRightPanelTab: any
  setSelectedProject: any
  setTaskCenterOpen: any
  sortedChapters: any
}

export function createRepairTaskHandlers(deps: RepairTaskHandlerDeps) {
  const activeChapter = deps.activeChapter
  const apiClient = deps.apiClient
  const chapters = deps.chapters
  const createEditorReportForChapter = deps.createEditorReportForChapter
  const executeStyleSampleTaskBookRebuild = deps.executeStyleSampleTaskBookRebuild
  const flushPendingSave = deps.flushPendingSave
  const generateCurrentChapterProse = deps.generateCurrentChapterProse
  const generateLongformRepairAuditSummary = deps.generateLongformRepairAuditSummary
  const generateSceneCardsForChapter = deps.generateSceneCardsForChapter
  const latestCockpitQualityReport = deps.latestCockpitQualityReport
  const loadProjectModules = deps.loadProjectModules
  const loadProductionTasks = deps.loadProductionTasks
  const openEditor = deps.openEditor
  const outlines = deps.outlines
  const projectId = deps.projectId
  const reviews = deps.reviews
  const runRecords = deps.runRecords
  const runRollingPlan = deps.runRollingPlan
  const runSimilarityForChapter = deps.runSimilarityForChapter
  const selectChapterForWriting = deps.selectChapterForWriting
  const selectedModelId = deps.selectedModelId
  const setActiveChapterId = deps.setActiveChapterId
  const setChapters = deps.setChapters
  const setCommercialToolLoading = deps.setCommercialToolLoading
  const setFuture100FocusOutlineIds = deps.setFuture100FocusOutlineIds
  const setOutlineTreeOpen = deps.setOutlineTreeOpen
  const setProseQualityLoading = deps.setProseQualityLoading
  const setReviewAnnotationsOpen = deps.setReviewAnnotationsOpen
  const setRightPanelOpen = deps.setRightPanelOpen
  const setRightPanelTab = deps.setRightPanelTab
  const setSelectedProject = deps.setSelectedProject
  const setTaskCenterOpen = deps.setTaskCenterOpen
  const sortedChapters = deps.sortedChapters

  const locateRepairTaskChapter = async (chapterId: number) => {
    if (await selectChapterForWriting(chapterId)) {
      setTaskCenterOpen(false)
      setRightPanelOpen(true)
      message.success('已定位到章节')
    }
  }

  const openRepairTaskChapterEditor = async (chapterId: number) => {
    if (!await selectChapterForWriting(chapterId)) return
    const chapter = chapters.find(ch => Number(ch.id) === Number(chapterId))
    if (chapter) {
      setTaskCenterOpen(false)
      openEditor('chapter', chapter)
    }
  }

  const startRepairTaskRevision = async (task: any, run?: any, taskIndex = -1, options: TaskCenterActionOptions = {}) => {
    const chapterId = Number(task?.chapter_id || 0)
    if (!chapterId) return message.warning('这个任务没有绑定章节')
    if (!selectedModelId) return message.warning('请先选择模型')
    if (!await selectChapterForWriting(chapterId)) return
    if (!options.keepTaskCenterOpen) setTaskCenterOpen(false)
    await createEditorReportForChapter(chapterId, { sourceTask: task, sourceRun: run, sourceTaskIndex: taskIndex, autoRevision: true })
  }

  const updateRepairTaskStatus = async (run: any, taskIndex: number, status: string, note = '') => {
    try {
      await apiClient.post(`/novel/runs/${run.id}/tasks/${taskIndex}/status`, {
        project_id: projectId,
        status,
        note,
      })
      await loadProjectModules()
      await loadProductionTasks()
      message.success(status === 'resolved' ? '任务已标记为已处理' : status === 'needs_review' ? '任务已标记为需复查' : '任务状态已更新')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '任务状态更新失败')
    }
  }

  const bulkUpdateRepairTaskStatus = async (items: any[], status: string) => {
    try {
      const grouped = new Map<number, { run: any; indices: number[] }>()
      for (const item of items || []) {
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
          status,
          note: status === 'resolved' ? '批量复查确认通过' : '批量状态更新',
        })
      }
      await loadProjectModules()
      await loadProductionTasks()
      message.success(status === 'resolved' ? `已确认通过 ${items.length} 个复查任务` : `已更新 ${items.length} 个任务`)
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '批量更新任务状态失败')
    }
  }


  const resolveRepairQueueTaskChapterId = (task: any) => {
    const chapterId = Number(task?.chapter_id || task?.chapterId || 0)
    if (chapterId) return chapterId
    const chapterNo = Number(task?.chapter_no || task?.chapterNo || 0)
    if (!chapterNo) return 0
    const chapter = sortedChapters.find(item => Number(item.chapter_no ?? item.chapterNo ?? 0) === chapterNo)
    return Number(chapter?.id || 0)
  }

  const executeRecoveryEvidenceGovernanceQueueTask = async (task: any, run?: any, taskIndex = -1, options: TaskCenterActionOptions = {}) => {
    const actionKey = String(task?.action_key || task?.actionKey || '')
    const keepOpenOptions = { ...options, keepTaskCenterOpen: true }
    if (actionKey === 'recheck_single_chapter') {
      const recheckTask = buildRecoveryEvidenceQueueRecheckTask(task, resolveRepairQueueTaskChapterId(task))
      await recheckRepairTaskConvergence(recheckTask, run, taskIndex, keepOpenOptions)
      return
    }
    if (actionKey === 'revision') {
      const recheckTask = buildRecoveryEvidenceQueueRecheckTask(task, resolveRepairQueueTaskChapterId(task))
      const chapterId = Number(recheckTask.chapter_id || 0)
      if (!chapterId) return message.warning('这个治理队列任务没有匹配章节')
      if (!selectedModelId) return message.warning('请先选择模型')
      if (!await selectChapterForWriting(chapterId)) return
      if (!options.keepTaskCenterOpen) setTaskCenterOpen(false)
      await createEditorReportForChapter(chapterId, {
        sourceTask: recheckTask,
        sourceRun: run,
        sourceTaskIndex: taskIndex,
        autoRevision: true,
        skipRevisionConfirm: true,
      })
      return
    }
    if (actionKey === 'deep_repair_single_brief') {
      const chapterId = resolveRepairQueueTaskChapterId(task)
      const chapterNo = Number(task?.chapter_no || task?.chapterNo || 0)
      const targetChapter = chapterId
        ? sortedChapters.find(item => Number(item.id || 0) === chapterId)
        : chapterNo
          ? sortedChapters.find(item => Number(item.chapter_no || 0) === chapterNo)
          : null
      if (targetChapter && !await selectChapterForWriting(Number(targetChapter.id))) return
      await runRollingPlan({
        fromChapter: Number(targetChapter?.chapter_no || chapterNo || activeChapter?.chapter_no || 0) || undefined,
        intent: {
          source: 'recovery_evidence_source_deep_repair',
          action_key: actionKey,
          repair_scope: 'single_chapter_brief',
          chapter_id: Number(targetChapter?.id || chapterId || 0) || undefined,
          chapter_no: Number(targetChapter?.chapter_no || chapterNo || 0) || undefined,
          source_label: task?.source_label || task?.sourceLabel || '',
          failed_evidence: task?.failed_evidence || task?.failedEvidence || task?.recovery_evidence_review?.failed_evidence || [],
          deep_repair_direction: task?.deep_repair_direction || task?.deepRepairDirection || '',
          instruction: '回到单章任务书，把恢复依据写成当前章可见的冲突行动、对白选择、读者回报和章末钩子；不要只补审计说明。',
        },
      })
      if (run?.id && taskIndex >= 0) {
        await updateRepairTaskStatus(run, taskIndex, 'needs_review', '已生成单章任务书深修意图，等待正文继承后复查')
      }
      if (!options.keepTaskCenterOpen) setTaskCenterOpen(false)
      return
    }
    if (actionKey === 'deep_repair_batch_brief') {
      await runRollingPlan({
        intent: {
          source: 'recovery_evidence_source_deep_repair',
          action_key: actionKey,
          repair_scope: 'batch_brief',
          source_label: task?.source_label || task?.sourceLabel || '',
          chapter_nos: task?.chapter_nos || task?.chapterNos || [],
          failed_evidence: task?.failed_evidence || task?.failedEvidence || task?.recovery_evidence_review?.failed_evidence || [],
          deep_repair_direction: task?.deep_repair_direction || task?.deepRepairDirection || '',
          instruction: '复盘批次任务书，把多章恢复依据拆回每章冲突职责、剧情线推进、读者回报落点和章末钩子，再恢复批量连写。',
        },
      })
      if (run?.id && taskIndex >= 0) {
        await updateRepairTaskStatus(run, taskIndex, 'needs_review', '已生成批次任务书深修意图，等待批次复盘审计')
      }
      if (!options.keepTaskCenterOpen) setTaskCenterOpen(false)
      return
    }
    if (actionKey === 'recheck_safe_batch' || actionKey === 'focus_task' || actionKey === 'review_governance_closure') {
      if (!run?.id) return message.warning('这个治理队列没有绑定修复运行')
      await generateLongformRepairAuditSummary(run, { keepTaskCenterOpen: true })
      if (run?.id && taskIndex >= 0) {
        const note = actionKey === 'focus_task'
          ? '已按作者确认处理批次残留，等待恢复依据复盘回填'
          : '已触发恢复依据复盘，等待审计回填'
        await updateRepairTaskStatus(run, taskIndex, 'needs_review', note)
      }
      return
    }
    message.warning('这个治理队列动作暂不支持自动执行')
  }

  const executeTypedRepairTask = async (task: any, run?: any, taskIndex = -1, options: TaskCenterActionOptions = {}) => {
    const taskType = String(task?.task_type || '')
    const chapterId = Number(task?.chapter_id || 0)
    const markNeedsReview = async () => {
      if (run?.id && taskIndex >= 0) {
        await updateRepairTaskStatus(run, taskIndex, 'needs_review', '已执行类型化动作，等待复查验收')
      }
    }
    if (String(task?.issue_type || '') === 'style_sample_task_book_rebuild') {
      await executeStyleSampleTaskBookRebuild(task, run, taskIndex, options)
      return
    }
    if (String(task?.issue_type || '') === 'recovery_evidence_governance_queue') {
      await executeRecoveryEvidenceGovernanceQueueTask(task, run, taskIndex, options)
      return
    }
    if (taskType === 'repair_skeleton') {
      const outlineId = Number(task?.outline_id || 0)
      const outline = outlineId ? outlines.find(item => Number(item.id) === outlineId) : null
      if (!options.keepTaskCenterOpen) setTaskCenterOpen(false)
      if (outline) {
        openEditor('outline', outline)
        message.success('已打开骨架大纲，请补齐目标、冲突、回报和钩子')
      } else {
        setOutlineTreeOpen(true)
        if (outlineId) setFuture100FocusOutlineIds([outlineId])
        message.warning('未找到绑定大纲，已打开大纲树')
      }
      await markNeedsReview()
      return
    }
    if (taskType === 'repair_script_room' || String(task?.source || '') === 'rolling_script_room' || String(task?.issue_type || '') === 'script_room_layer_gap') {
      if (!options.keepTaskCenterOpen) setTaskCenterOpen(false)
      const actionArea = String(task?.action_area || '')
      const actionKey = String(task?.action_key || '')
      if (actionArea === 'assets' || actionKey === 'open_story_assets') {
        openStoryAssetsWorkspace()
      } else if (actionArea === 'planning' && actionKey) {
        handlePlanningAction(actionKey as PlanningActionKey)
      } else if ((actionArea === 'writing' || actionArea === 'quality') && actionKey) {
        handleWritingCockpitAction(actionKey as WritingCockpitActionKey)
      } else {
        setTaskCenterOpen(true)
      }
      await markNeedsReview()
      return
    }
    if (taskType === 'repair_assets') {
      if (!options.keepTaskCenterOpen) setTaskCenterOpen(false)
      if (String(task?.source || '') === 'storyline_diff_decision') openStoryAssetsWorkspace()
      else openStoryAssetsWorkspace('discoveredAssets')
      await markNeedsReview()
      return
    }
    if (taskType === 'chapter_retention_patch') {
      if (!chapterId) return message.warning('这个任务没有绑定章节')
      const issueText = [task?.issue_type, task?.message, task?.action].filter(Boolean).join(' ')
      if (issueText.includes('缺正文') || issueText.includes('生成正文')) {
        if (!selectedModelId) return message.warning('请先选择模型')
        if (!options.keepTaskCenterOpen) setTaskCenterOpen(false)
        await generateCurrentChapterProse({ allowIncomplete: true, forceSceneCards: true, targetChapterId: chapterId })
        await markNeedsReview()
        return
      }
      await startRepairTaskRevision(task, run, taskIndex, options)
      return
    }
    if (!chapterId) return message.warning('这个任务没有绑定章节')
    if (taskType === 'repair_materials') {
      if (!selectedModelId) return message.warning('请先选择模型')
      if (!await selectChapterForWriting(chapterId)) return
      if (!options.keepTaskCenterOpen) setTaskCenterOpen(false)
      await generateSceneCardsForChapter(chapterId, true)
      await markNeedsReview()
      return
    }
    if (taskType === 'repair_quality') {
      await startRepairTaskRevision(task, run, taskIndex, options)
      return
    }
    if (taskType === 'repair_similarity') {
      if (!await selectChapterForWriting(chapterId)) return
      if (!options.keepTaskCenterOpen) setTaskCenterOpen(false)
      await runSimilarityForChapter(chapterId)
      await markNeedsReview()
      return
    }
    if (taskType === 'resolve_failure') {
      await locateRepairTaskChapter(chapterId)
      Modal.info({
        title: '失败处理建议',
        width: 720,
        content: (
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Text>{task.message || '该章节存在生产失败记录。'}</Text>
            <Text type="secondary">{task.action || '先处理失败原因，再重新进入章节群生产。'}</Text>
            {Array.isArray(task.acceptance_criteria) && task.acceptance_criteria.length > 0 && (
              <List size="small" dataSource={task.acceptance_criteria} renderItem={(item: string) => <List.Item>{item}</List.Item>} />
            )}
          </Space>
        ),
      })
      await markNeedsReview()
      return
    }
    await startRepairTaskRevision(task, run, taskIndex, options)
  }

  const refreshActiveProseQuality = async (source = 'manual_refresh', targetChapter: any = activeChapter) => {
    if (!targetChapter) return message.warning('请先选择章节')
    if (!selectedModelId) return message.warning('请先选择模型')
    if (!await flushPendingSave()) return
    setProseQualityLoading(true)
    try {
      const res = await apiClient.post(`/novel/chapters/${targetChapter.id}/prose-quality`, {
        project_id: projectId,
        model_id: selectedModelId,
        source,
      })
      await loadProjectModules()
      setRightPanelOpen(true)
      setRightPanelTab('proseQuality')
      message.success(`当前版本复检完成，评分 ${res.data?.self_check?.score ?? '-'}`)
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '正文复检失败')
    } finally {
      setProseQualityLoading(false)
    }
  }

  const repairActiveDeslopGate = async () => {
    if (!activeChapter) return message.warning('请先选择章节')
    if (!selectedModelId) return message.warning('请先选择模型')
    if (!await flushPendingSave()) return

    setProseQualityLoading(true)
    try {
      let report = latestCockpitQualityReport()
      if (!report) {
        const qualityRes = await apiClient.post(`/novel/chapters/${activeChapter.id}/prose-quality`, {
          project_id: projectId,
          model_id: selectedModelId,
          source: 'deslop_gate_repair',
        })
        report = qualityRes.data?.review || null
      }

      if (!report?.id) {
        message.warning('还没有可用于去AI味修订的正文自检报告。')
        setRightPanelOpen(true)
        setRightPanelTab('proseQuality')
        return
      }

      await applyEditorRevision(report, {
        revisionMode: 'tighten_pacing',
        prompt: [
          '重点修复 story-deslop Gate A-G 去AI味门禁。',
          '逐条处理 fail/warn 项：禁用词/模板表达、句式套路、抽象心理告知、重复描写、无功能环境、万能转折、节奏均匀等。',
          '修订后必须输出 deslop_repair_receipts.changed_evidence，引用修订后正文里的具体句子、动作、对白或语序变化，不能只写“已修复”。',
          '修订完成后自动复检，目标是 deslop_gate_diagnostics 与 deslop_repair_checks 清零或转 pass。',
        ].join('\n'),
        skipConfirm: true,
        targetChapterId: activeChapter.id,
        autoStoryState: true,
        source: 'deslop_gate_repair',
      })
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '去AI味修复失败')
    } finally {
      setProseQualityLoading(false)
    }
  }

  const refreshProseQualityForChapter = async (chapterId: number, source = 'manual_refresh') => {
    const chapter = sortedChapters.find(item => Number(item.id) === Number(chapterId))
      || (Number(activeChapter?.id) === Number(chapterId) ? activeChapter : null)
    if (!chapter?.id) return
    if (Number(activeChapter?.id) !== Number(chapterId)) {
      const saved = await selectChapterForWriting(chapterId)
      if (!saved) return
    }
    await refreshActiveProseQuality(source, chapter)
  }

  const closeRepairTaskAfterRevision = async (
    task: any,
    run: any,
    taskIndex: number,
    revisionResult: any,
    refreshOptions: { projectModules?: boolean; productionTasks?: boolean; signal?: AbortSignal } = {},
  ) => {
    if (!run?.id || taskIndex < 0) return null
    const plan = buildDeliveryRiskRevisionClosurePlan(task, revisionResult || {})
    const editorRevisionRunId = Number(revisionResult?.editor_revision_run_id || 0)
    const durableRevisionReceipt = Number.isInteger(editorRevisionRunId) && editorRevisionRunId > 0
      ? { editor_revision_run_id: editorRevisionRunId }
      : {}
    const requireActiveRequest = () => {
      if (!refreshOptions.signal?.aborted) return
      if (typeof refreshOptions.signal.throwIfAborted === 'function') refreshOptions.signal.throwIfAborted()
      const error = new Error('repair task closure request is stale')
      error.name = 'AbortError'
      throw error
    }
    const post = (url: string, body: Record<string, unknown>) => refreshOptions.signal
      ? apiClient.post(url, body, { signal: refreshOptions.signal })
      : apiClient.post(url, body)
    requireActiveRequest()
    await post(`/novel/runs/${run.id}/tasks/${taskIndex}/status`, {
      project_id: projectId,
      status: plan.taskStatus,
      note: plan.note,
      ...durableRevisionReceipt,
      ...(editorRevisionRunId > 0 && plan.annotationStatus && plan.annotationKey ? {
        annotation_key: plan.annotationKey,
        annotation_status: plan.annotationStatus,
      } : {}),
    })
    requireActiveRequest()
    if (plan.annotationStatus && plan.annotationKey) {
      await post(`/novel/projects/${projectId}/review-annotations/status`, {
        annotation_key: plan.annotationKey,
        status: plan.annotationStatus,
        note: plan.note,
        ...durableRevisionReceipt,
      })
      requireActiveRequest()
    }
    if (refreshOptions.projectModules !== false) {
      requireActiveRequest()
      await loadProjectModules()
      requireActiveRequest()
    }
    if (refreshOptions.productionTasks !== false) {
      requireActiveRequest()
      await loadProductionTasks()
      requireActiveRequest()
    }
    return plan
  }

  const isSingleChapterRecoveryEvidenceRepairTask = (task: any) => {
    if (String(task?.issue_type || '') !== 'recovery_evidence_mismatch') return false
    const source = String(task?.source || '')
    const annotationSource = String(task?.annotation_source || task?.annotationSource || '')
    const annotationCategory = String(task?.annotation_category || task?.annotationCategory || '')
    return source === 'review_annotation_risk'
      || annotationSource === 'governance_recheck_sync'
      || annotationCategory === 'recovery_evidence'
  }

  const recheckRepairTaskConvergence = async (task: any, run: any, taskIndex: number, options: TaskCenterActionOptions = {}) => {
    const chapterId = Number(task?.chapter_id || 0)
    if (!chapterId) return message.warning('这个复查任务没有绑定章节')
    if (!selectedModelId) return message.warning('请先选择模型')
    if (!await selectChapterForWriting(chapterId)) return
    if (!await flushPendingSave()) return
    if (!options.keepTaskCenterOpen) setTaskCenterOpen(false)
    setProseQualityLoading(true)
    try {
      const storylineDecisionRecheckMeta = { source: 'storyline_decision_recheck', storyline_decision_closure: true }
      const singleChapterRecoveryRecheckMeta = { source: 'governance_recheck_sync', storyline_decision_closure: false }
      const recheckMeta = String(task?.source || '') === 'storyline_diff_decision'
        ? storylineDecisionRecheckMeta
        : isSingleChapterRecoveryEvidenceRepairTask(task)
          ? singleChapterRecoveryRecheckMeta
          : { source: 'repair_task_recheck', storyline_decision_closure: false }
      const qualityRes = await apiClient.post(`/novel/chapters/${chapterId}/prose-quality`, {
        project_id: projectId,
        model_id: selectedModelId,
        source: recheckMeta.source,
        source_review_id: task?.review_id || null,
      })
      const storyRes = await apiClient.post(`/novel/chapters/${chapterId}/story-state-sync`, {
        project_id: projectId,
        model_id: selectedModelId,
        source: recheckMeta.source,
        source_review_id: qualityRes.data?.review?.id || task?.review_id || null,
      })
      const closurePlan = await closeRepairTaskAfterRevision(task, run, taskIndex, {
        storyline_decision_closure: recheckMeta.storyline_decision_closure,
        quality_refresh: {
          ok: true,
          score: qualityRes.data?.self_check?.score,
          status: qualityRes.data?.review?.status,
        },
        story_state_update: storyRes.data?.story_state_update,
        delivery_risk_convergence: storyRes.data?.delivery_risk_convergence,
      })
      setRightPanelOpen(true)
      setRightPanelTab('proseQuality')
      const recheckLabel = recheckMeta.source === 'governance_recheck_sync' ? '单章治理复查' : '复检收敛'
      if (closurePlan?.taskStatus === 'resolved') {
        message.success(`${recheckLabel}完成，评分 ${qualityRes.data?.self_check?.score ?? '-'}，风险已清零，任务已关闭`)
      } else {
        message.warning(`${recheckLabel}完成，评分 ${qualityRes.data?.self_check?.score ?? '-'}，仍需复查`)
      }
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '复检收敛失败')
    } finally {
      setProseQualityLoading(false)
    }
  }

  const applyEditorRevision = async (report: any, options: { revisionMode?: string; prompt?: string; skipConfirm?: boolean; targetChapterId?: number; autoStoryState?: boolean; source?: string; sourceTask?: any; sourceRun?: any; sourceTaskIndex?: number } = {}) => {
    if (!selectedModelId) return message.warning('请先选择模型')
    const isSelfCheckRevision = report?.review_type === 'prose_quality'
    const isDeliveryRiskRevision = [
      'chapter_core_drift',
      'reader_expectation_sync',
      'reader_retention_sync',
      'chapter_attraction_review',
      'story_drive_sync',
      'character_arc_sync',
      'style_sample_sync',
      'reader_payoff_sync',
      'innovation_sync',
      'storyline_sync',
      'readability_review',
    ].includes(String(report?.review_type || ''))
    const revisionLabels: Record<string, string> = {
      from_report: isSelfCheckRevision ? '按正文自检生成修订稿' : isDeliveryRiskRevision ? '按交稿风险生成修订稿' : '按编辑报告生成修订稿',
      expand_action: '补动作/战斗细节',
      cut_description: '压缩环境描写',
      tighten_pacing: '提升事件密度',
      add_consequence: '补行动后果',
      restore_hook: '强化章末钩子',
    }
    const revisionMode = options.revisionMode || 'from_report'
    const customPrompt = String(options.prompt || '').trim()
    const runRevision = async () => {
      try {
        const sourceRunId = Number(options.sourceRun?.id)
        const sourceTaskIndex = Number(options.sourceTaskIndex)
        const repairTaskLink = options.sourceTask
          && Number.isInteger(sourceRunId)
          && sourceRunId > 0
          && Number.isInteger(sourceTaskIndex)
          && sourceTaskIndex >= 0
          ? {
              run_id: sourceRunId,
              task_index: sourceTaskIndex,
              task: options.sourceTask,
            }
          : undefined
        const res = await apiClient.post(`/novel/reviews/${report.id}/apply-revision`, {
          project_id: projectId,
          chapter_id: resolveEditorRevisionChapterId(report, activeChapter?.id, options.targetChapterId),
          model_id: selectedModelId,
          revision_mode: revisionMode,
          prompt: customPrompt,
          source: options.source || undefined,
          auto_quality_check: true,
          auto_story_state: options.autoStoryState !== false,
          ...(repairTaskLink ? { repair_task_link: repairTaskLink } : {}),
        })
        const runId = Number(res.data?.run_id)
        if (res.status !== 202 || !Number.isInteger(runId) || runId < 1 || res.data?.status !== 'queued') {
          throw new Error('invalid editor revision creation response')
        }
        const created = {
          run_id: runId,
          status: 'queued' as const,
          chapter_id: Number(res.data?.chapter_id) || 0,
          status_url: String(res.data?.status_url || ''),
        }
        await loadProductionTasks()
        message.success('单章修订任务已创建')
        return created
      } catch (error: any) {
        message.error(error?.response?.data?.error || error?.message || '修订失败')
        return null
      }
    }
    if (options.skipConfirm) {
      return await runRevision()
    }
    const baseContent = isSelfCheckRevision
      ? '系统会根据这份正文质检的修订指令重写当前章节，并保存为新的章节版本。'
      : isDeliveryRiskRevision
        ? '系统会根据这条交稿风险和当前章节的完整风险清单生成修订补丁，并保存为新的章节版本。'
        : '系统会根据这份编辑报告重写当前章节，并保存为新的章节版本。'
    const customContent = customPrompt
      ? `会优先执行你的自定义修订指令：${customPrompt.slice(0, 120)}${customPrompt.length > 120 ? '…' : ''}；报告必修项仍会一并覆盖。`
      : ''
    Modal.confirm({
      title: customPrompt
        ? `${revisionLabels[revisionMode] || revisionLabels.from_report}（含自定义指令）`
        : (revisionLabels[revisionMode] || revisionLabels.from_report),
      content: [baseContent, customContent].filter(Boolean).join('\n'),
      okText: customPrompt
        ? '按自定义+报告修订'
        : (isSelfCheckRevision ? '按自检修订' : isDeliveryRiskRevision ? '按风险修订' : '生成修订稿'),
      onOk: runRevision,
    })
    return null
  }

  const ohStoryCoreErrorCode = (error: any) => String(error?.response?.data?.code || error?.code || '')

  const runOhStoryCoreAction = async (action: 'review' | 'deslop') => {
    const chapterId = Number(activeChapter?.id || 0)
    if (!chapterId) return message.warning('请先选择章节')
    if (!projectId) return message.warning('请先选择项目')
    if (!await flushPendingSave()) return
    const label = action === 'review' ? 'oh-story 审稿' : 'oh-story 去AI'
    setProseQualityLoading(true)
    try {
      const postAction = () => apiClient.post(`/novel/oh-story/core/${action}`, {
        project_id: projectId,
        chapter_id: chapterId,
      })
      try {
        await postAction()
      } catch (error: any) {
        if (ohStoryCoreErrorCode(error) !== 'OH_STORY_CORE_NOT_INSTALLED') throw error
        message.info('正在安装 oh-story 核心套件…')
        await apiClient.post('/novel/oh-story/core/install')
        await postAction()
      }
      await loadProjectModules()
      message.success(`${label}完成`)
    } catch (error: any) {
      if (ohStoryCoreErrorCode(error) === 'OH_STORY_CORE_NOT_INSTALLED') {
        message.error('先安装 oh-story 核心套件')
        return
      }
      message.error(error?.response?.data?.error || error?.message || `${label}失败`)
    } finally {
      setProseQualityLoading(false)
    }
  }

  const ohStoryReview = () => runOhStoryCoreAction('review')
  const ohStoryDeslop = () => runOhStoryCoreAction('deslop')

  return {
    locateRepairTaskChapter,
    openRepairTaskChapterEditor,
    startRepairTaskRevision,
    updateRepairTaskStatus,
    bulkUpdateRepairTaskStatus,
    resolveRepairQueueTaskChapterId,
    executeRecoveryEvidenceGovernanceQueueTask,
    executeTypedRepairTask,
    refreshActiveProseQuality,
    repairActiveDeslopGate,
    refreshProseQualityForChapter,
    closeRepairTaskAfterRevision,
    isSingleChapterRecoveryEvidenceRepairTask,
    recheckRepairTaskConvergence,
    applyEditorRevision,
    ohStoryReview,
    ohStoryDeslop,
  }
}

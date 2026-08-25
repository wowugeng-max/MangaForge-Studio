import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  message,
} from 'antd'
import type { EditorView } from '@codemirror/view'
import {
  useNavigate,
  useParams,
} from 'react-router-dom'
import apiClient from '../../../api/client'
import {
  selectTargetChapterForWriting,
} from '../writingCockpitModel'
import {
  useChapterAutosave,
} from '../useChapterAutosave'
import { useChapterWriteJob } from './use-chapter-write-job'
import { useChapterRewriteJob } from './use-chapter-rewrite-job'
import { useProjectContinueJob } from './use-project-continue-job'
import { firstEmptyChapterNoAfter } from '../chapter-workflow-presenter'
import {
  useChapterVersions,
} from '../useChapterVersions'
import {
  useNovelWorkspaceData,
} from '../useNovelWorkspaceData'
import {
  useNovelProjectWorkspaceUiState,
} from '../useNovelProjectWorkspaceUiState'
import {
  normalizeWritingSkillCatalog,
  resolveWritingSkillsEnabled,
} from '../writingSkillsModel'
import {
  useReferenceWorkflow,
} from '../useReferenceWorkflow'
import {
  useWorkspaceTasks,
} from '../useWorkspaceTasks'
import {
  editorRevisionTerminalMessage,
  isActiveEditorRevisionTask,
  isEditorRevisionTask,
  type EditorRevisionTask,
} from '../editorRevisionTasks'
import {
  chapterHasProse,
} from '../utils'
import {
  filterReviewsByType,
  resolveActiveChapterOwnedData,
  resolveActiveMemorySummary,
} from './workspace-derived-state'
import {
  formatStoryStateSyncFailure,
} from './workspace-helpers'
import {
  productionModeOptions,
} from './workspace-types'
import {
  bindNovelWorkspaceCoreHandlers,
} from './workspace-view-bind-core-handlers'
import {
  useNovelWorkspaceChapterLoads,
} from './use-workspace-chapter-loads'
import {
  useNovelWorkspaceDomainModels,
} from './use-workspace-domain-models'

type AnyRecord = Record<string, any>

const ACTIVE_CHAPTER_SOURCE_REVISION_STATUSES = new Set(['queued', 'running', 'cancel_requested'])

export function resolveChapterSourceLocallyBusy(input: {
  projectId: number
  localTaskProjectId: number
  sourceAuthorityLoading: boolean
  chapterInvocationPending: boolean
  generatingProse: boolean
  stepProseLoading: boolean
  proseQualityLoading: boolean
  editorReportLoading: boolean
  commercialToolLoading: string
  editorRevisionTasksProjectId?: number | null
  editorRevisionTasks: unknown[]
}) {
  const activeEditorRevision = Number(input.editorRevisionTasksProjectId) === Number(input.projectId)
    && (Array.isArray(input.editorRevisionTasks) ? input.editorRevisionTasks : []).some((task: any) => (
      task?.run_type === 'editor_revision'
        && ACTIVE_CHAPTER_SOURCE_REVISION_STATUSES.has(String(task?.status || ''))
    ))
  const localTaskBusy = Number(input.localTaskProjectId) === Number(input.projectId)
    && Boolean(
      input.generatingProse
        || input.stepProseLoading
        || input.proseQualityLoading
        || input.editorReportLoading
        || input.commercialToolLoading === 'storyStateSync',
    )
  return input.sourceAuthorityLoading || input.chapterInvocationPending || localTaskBusy || activeEditorRevision
}

export type EditorRevisionReconciliationState = {
  projectId: number
  controller: AbortController
  completedKeys: Set<string>
  inFlightKeys: Set<string>
  moduleReloadedKeys: Set<string>
  notifiedKeys: Set<string>
  linkedTaskClosedKeys: Set<string>
  observedRunIds: Set<number>
  baselineEstablished: boolean
}

export function createEditorRevisionReconciliationState(projectId: number): EditorRevisionReconciliationState {
  return {
    projectId,
    controller: new AbortController(),
    completedKeys: new Set(),
    inFlightKeys: new Set(),
    moduleReloadedKeys: new Set(),
    notifiedKeys: new Set(),
    linkedTaskClosedKeys: new Set(),
    observedRunIds: new Set(),
    baselineEstablished: false,
  }
}

export function invalidateEditorRevisionReconciliationState(state: EditorRevisionReconciliationState) {
  state.controller.abort()
}

function editorRevisionReconciliationKey(projectId: number, task: EditorRevisionTask) {
  return `${projectId}:${task.id}:${task.updated_at}`
}

function linkedRepairTask(productionTasks: any, task: EditorRevisionTask) {
  const link = task.repair_task_link
  if (!link) return null
  const runs = [
    ...(Array.isArray(productionTasks?.tasks) ? productionTasks.tasks : []),
    ...(Array.isArray(productionTasks?.active) ? productionTasks.active : []),
  ]
  const run = runs.find(item => Number(item?.id) === link.run_id)
  const repairTasks = Array.isArray(run?.payload?.tasks) ? run.payload.tasks : []
  const sourceTask = repairTasks[link.task_index]
  return run && sourceTask ? { run, task: sourceTask, taskIndex: link.task_index } : null
}

function publicDeliveryRiskConvergence(task: EditorRevisionTask): Record<string, unknown> {
  const summary = task.phases?.record_continuity_warning?.summary
  const convergence = summary?.delivery_risk_convergence
  return convergence && typeof convergence === 'object' && !Array.isArray(convergence)
    ? convergence as Record<string, unknown>
    : {}
}

function repairClosureResult(task: EditorRevisionTask) {
  const quality = task.quality || null
  return {
    editor_revision_run_id: task.id,
    quality_refresh: quality
      ? {
          ...quality,
          ok: quality.passed === true && quality.needs_revision !== true,
        }
      : { ok: false, error: 'revision quality summary is unavailable' },
    story_state_update: task.story_state || null,
    delivery_risk_convergence: publicDeliveryRiskConvergence(task),
    warnings: task.warnings,
  }
}

function markAcknowledgedKey(
  state: EditorRevisionReconciliationState,
  projectId: number,
  task: EditorRevisionTask,
) {
  const key = editorRevisionReconciliationKey(projectId, task)
  state.completedKeys.add(key)
  state.moduleReloadedKeys.add(key)
  state.notifiedKeys.add(key)
  state.linkedTaskClosedKeys.add(key)
}

export async function reconcileEditorRevisionTasks({
  projectId,
  taskProjectId,
  tasks,
  productionTasks,
  state,
  activeChapterId,
  loadProjectModules,
  setRightPanelOpen,
  setRightPanelTab,
  closeRepairTaskAfterRevision,
  acknowledgeLinkedTaskClosure,
  notifyTerminal,
  isCurrent,
}: {
  projectId: number
  taskProjectId?: number | null
  tasks: EditorRevisionTask[]
  productionTasks: any
  state: EditorRevisionReconciliationState
  activeChapterId: number | (() => number)
  loadProjectModules: () => Promise<unknown>
  setRightPanelOpen: (open: boolean) => void
  setRightPanelTab: (tab: string) => void
  closeRepairTaskAfterRevision: (
    task: any,
    run: any,
    taskIndex: number,
    result: any,
    options: { signal: AbortSignal },
  ) => Promise<unknown>
  acknowledgeLinkedTaskClosure: (task: EditorRevisionTask, signal: AbortSignal) => Promise<EditorRevisionTask>
  notifyTerminal: (terminal: NonNullable<ReturnType<typeof editorRevisionTerminalMessage>>, task: EditorRevisionTask) => void
  isCurrent?: () => boolean
}) {
  const signal = state.controller.signal
  const snapshotProjectId = taskProjectId ?? state.projectId
  const reconciliationIsCurrent = () => Boolean(projectId)
    && state.projectId === projectId
    && snapshotProjectId === projectId
    && !signal.aborted
    && (isCurrent?.() ?? true)
  if (!reconciliationIsCurrent()) return
  if (!state.baselineEstablished) {
    state.baselineEstablished = true
    for (const task of tasks) {
      if (isActiveEditorRevisionTask(task)) {
        state.observedRunIds.add(task.id)
        continue
      }
      const pendingLinkedClosure = Boolean(task.repair_task_link)
        && task.linked_task_closure?.status === 'pending'
      if (pendingLinkedClosure) continue
      const key = editorRevisionReconciliationKey(projectId, task)
      if (task.linked_task_closure?.status === 'completed') markAcknowledgedKey(state, projectId, task)
      else state.completedKeys.add(key)
    }
  }
  for (const task of tasks) {
    if (!reconciliationIsCurrent()) return
    if (isActiveEditorRevisionTask(task)) {
      state.observedRunIds.add(task.id)
      continue
    }
    const key = editorRevisionReconciliationKey(projectId, task)
    if (task.linked_task_closure?.status === 'completed') {
      markAcknowledgedKey(state, projectId, task)
      continue
    }
    if (state.completedKeys.has(key) || state.inFlightKeys.has(key)) continue
    state.inFlightKeys.add(key)
    try {
      if (task.prose_persisted && !state.moduleReloadedKeys.has(key)) {
        await loadProjectModules()
        if (!reconciliationIsCurrent()) return
        state.moduleReloadedKeys.add(key)
        const currentActiveChapterId = typeof activeChapterId === 'function'
          ? Number(activeChapterId())
          : Number(activeChapterId)
        if (task.chapter_id === currentActiveChapterId) {
          if (!reconciliationIsCurrent()) return
          setRightPanelOpen(true)
          if (!reconciliationIsCurrent()) return
          setRightPanelTab('proseQuality')
        }
      }

      if (!state.notifiedKeys.has(key)) {
        if (!reconciliationIsCurrent()) return
        const terminal = editorRevisionTerminalMessage(task)
        if (terminal) notifyTerminal(terminal, task)
        if (!reconciliationIsCurrent()) return
        state.notifiedKeys.add(key)
      }

      if (!task.prose_persisted) {
        if (!reconciliationIsCurrent()) return
        state.completedKeys.add(key)
        continue
      }
      if (!task.repair_task_link || task.linked_task_closure?.status === 'completed') {
        if (!reconciliationIsCurrent()) return
        state.completedKeys.add(key)
        continue
      }
      if (task.linked_task_closure?.status !== 'pending') {
        if (!reconciliationIsCurrent()) return
        state.completedKeys.add(key)
        continue
      }

      if (!reconciliationIsCurrent()) return
      const linked = linkedRepairTask(productionTasks, task)
      if (!linked) continue
      if (!state.linkedTaskClosedKeys.has(key)) {
        await closeRepairTaskAfterRevision(
          linked.task,
          linked.run,
          linked.taskIndex,
          repairClosureResult(task),
          { signal },
        )
        if (!reconciliationIsCurrent()) return
        state.linkedTaskClosedKeys.add(key)
      }
      if (!reconciliationIsCurrent()) return
      const acknowledged = await acknowledgeLinkedTaskClosure(task, signal)
      if (!reconciliationIsCurrent()) return
      state.completedKeys.add(key)
      if (isEditorRevisionTask(acknowledged)) markAcknowledgedKey(state, projectId, acknowledged)
    } catch {
      // Keep unfinished reconciliation stages retryable on the next task refresh.
    } finally {
      state.inFlightKeys.delete(key)
    }
  }
}

export function useNovelWorkspaceBaseModel() {
  const navigate = useNavigate()
  const { id } = useParams()
  const projectId = Number(id)

  const ui = useNovelProjectWorkspaceUiState()
  const {
    stepOutlineLoading, setStepOutlineLoading,
    stepProseLoading, setStepProseLoading,
    stepRepairLoading, setStepRepairLoading,
    proseProgress, setProseProgress,
    proseBatchStatus, setProseBatchStatus,
    planProgress, setPlanProgress,
    planning, setPlanning,
    executingAgents, setExecutingAgents,
    generatingProse, setGeneratingProse,
    generatingSceneCards, setGeneratingSceneCards,
    diagnosticsLoading, setDiagnosticsLoading,
    pipelineLoading, setPipelineLoading,
    incubatingOriginal, setIncubatingOriginal,
    dashboardLoading, setDashboardLoading,
    editorReportLoading, setEditorReportLoading,
    proseQualityLoading, setProseQualityLoading,
    bookReviewLoading, setBookReviewLoading,
    writingBibleOpen, setWritingBibleOpen,
    writingBibleGenerating, setWritingBibleGenerating,
    styleSampleCandidateLoading, setStyleSampleCandidateLoading,
    styleSampleEffectivenessLoading, setStyleSampleEffectivenessLoading,
    styleSamplePatchLoadingKey, setStyleSamplePatchLoadingKey,
    styleSampleEffectiveness, setStyleSampleEffectiveness,
    storyStateOpen, setStoryStateOpen,
    commercialToolsOpen, setCommercialToolsOpen,
    creativeCommandOpen, setCreativeCommandOpen,
    creativeCommandText, setCreativeCommandText,
    creativeCommandPlan, setCreativeCommandPlan,
    creativeAssistantOpen, setCreativeAssistantOpen,
    creativeAssistantMode, setCreativeAssistantMode,
    creativeAssistantLoading, setCreativeAssistantLoading,
    creativeAssistantResult, setCreativeAssistantResult,
    creativeAssistantError, setCreativeAssistantError,
    creativeAssistantSelectedText, setCreativeAssistantSelectedText,
    backupImportOpen, setBackupImportOpen,
    backupImportText, setBackupImportText,
    chapterGroupExecutingId, setChapterGroupExecutingId,
    releaseRepairExecutingId, setReleaseRepairExecutingId,
    commercialToolLoading, setCommercialToolLoading,
    productionMode, setProductionMode,
    unattendedTargetChapter, setUnattendedTargetChapter,
    chapterWordTargetMode, setChapterWordTargetMode,
    chapterTargetWordCount, setChapterTargetWordCount,
    writingSkillsEnabled, setWritingSkillsEnabled,
    writingSkillsCatalog, setWritingSkillsCatalog,
    fictionHumanizerMode, setFictionHumanizerMode,
    activeChapterDiagnostics, setActiveChapterDiagnostics,
    diagnosticsRequestRef,
    activeChapterContextPackage, setActiveChapterContextPackage,
    contextPackageLoading, setContextPackageLoading,
    contextPackageRequestRef,
    commercialReadiness, setCommercialReadiness,
    future100Draft, setFuture100Draft,
    future100SelectedNos, setFuture100SelectedNos,
    future100ApplyLoading, setFuture100ApplyLoading,
    future100FocusOutlineIds, setFuture100FocusOutlineIds,
    projectSettings, setProjectSettings,
    memoryPalaceProjects, setMemoryPalaceProjects,
    chapterWordTargetPayload,
    styleSampleEffectivenessItems,
    outlinePanelOpen, setOutlinePanelOpen,
    referenceConfigOpen, setReferenceConfigOpen,
    referenceEngineeringOpen, setReferenceEngineeringOpen,
    creativeCardsOpen, setCreativeCardsOpen,
    consistencyGraphOpen, setConsistencyGraphOpen,
    qualityBenchmarkOpen, setQualityBenchmarkOpen,
    exportDeliveryOpen, setExportDeliveryOpen,
    reviewAnnotationsOpen, setReviewAnnotationsOpen,
    agentAuditOpen, setAgentAuditOpen,
    continuityAudit, setContinuityAudit,
    continuityAuditLoading, setContinuityAuditLoading,
    chapterDrawerOpen, setChapterDrawerOpen,
    outlineTreeOpen, setOutlineTreeOpen,
    taskCenterOpen, setTaskCenterOpen,
    taskCenterRecoveryFocus, setTaskCenterRecoveryFocus,
    selectedChapterIds, setSelectedChapterIds,
    selectMode, setSelectMode,
    restructurePanelOpen, setRestructurePanelOpen,
    chapterSearch, setChapterSearch,
    chapterStatusFilter, setChapterStatusFilter,
    chapterSortMode, setChapterSortMode,
    streamingChapterId, setStreamingChapterId,
    streamingText, setStreamingText,
    streamingProgress, setStreamingProgress,
    streamingPercent, setStreamingPercent,
    generationPipeline, setGenerationPipeline,
    streamingEndRef,
    proseBatchCancelRef,
    editorKind, setEditorKind,
    editorItem, setEditorItem,
    editorForm,
    writingBibleForm,
    storyStateForm,
    approvalPolicyForm,
    agentConfigForm,
    rightPanelOpen, setRightPanelOpen,
    rightPanelTab, setRightPanelTab,
    workspaceArea, setWorkspaceArea,
    writingShellMode, setWritingShellMode,
    directoryCollapsed, setDirectoryCollapsed,
    storyAssetsFocusDiscoveredToken, setStoryAssetsFocusDiscoveredToken,
    autoDirectorActionLoadingKey, setAutoDirectorActionLoadingKey,
    shellMode,
    isImmersiveShell,
    showGlobalWritingGuidance,
    directoryShellClassName,
    setShellMode,
    handleDirectoryCollapsedChange,
  } = ui

  const proseEditorRef = useRef<EditorView | null>(null)

  const {
    loading,
    selectedProject,
    setSelectedProject,
    worldbuilding,
    characters,
    outlines,
    chapters,
    setChapters,
    runRecords,
    reviews,
    agentExecution,
    setAgentExecution,
    pipeline,
    models,
    chapterGenerationSourceAuthority,
    getChapterGenerationSourceAuthority,
    setChapterGenerationSourceAuthority,
    chapterSourcePendingState,
    chapterInvocationPending,
    claimChapterInvocation,
    chapterInvocationOwnerIsActive,
    releaseChapterInvocation,
    getChapterSourceMutationPending,
    setChapterSourceMutationPending,
    beginChapterSourceOperation,
    assertChapterSourceOperationCurrent,
    selectedModelId,
    setSelectedModelId,
    activeChapterId,
    setActiveChapterId,
    activeChapter,
    loadProjectModules,
    chapterTreeData,
    proseChapters,
    referenceSummary,
    referenceReports,
    isEmptyProject,
    sortedChapters,
    filteredChapters,
  } = useNovelWorkspaceData({
    projectId,
    chapterSearch,
    chapterStatusFilter,
    chapterSortMode,
  })
  useEffect(() => {
    let active = true
    apiClient.get('/novel/writing-skills/catalog')
      .then(response => { if (active) setWritingSkillsCatalog(normalizeWritingSkillCatalog(response.data)) })
      .catch(() => { /* keep current catalog; initial state is already builtins */ })
    return () => { active = false }
  }, [selectedProject?.id, setWritingSkillsCatalog])
  const writingSkillsProjectIdRef = useRef<unknown>(undefined)
  useEffect(() => {
    const resolved = resolveWritingSkillsEnabled({ project: selectedProject, catalog: writingSkillsCatalog })
    const projectChanged = writingSkillsProjectIdRef.current !== selectedProject?.id
    writingSkillsProjectIdRef.current = selectedProject?.id
    if (projectChanged) {
      setWritingSkillsEnabled(resolved.enabled)
      setFictionHumanizerMode(resolved.fiction_humanizer_mode)
      return
    }
    setWritingSkillsEnabled(current => {
      const merged = { ...resolved.enabled }
      for (const id of Object.keys(current)) {
        if (id in resolved.enabled) merged[id] = current[id]
      }
      return merged
    })
  }, [
    selectedProject?.id,
    selectedProject?.reference_config?.writing_skills,
    writingSkillsCatalog,
    setFictionHumanizerMode,
    setWritingSkillsEnabled,
  ])
  const activeChapterIdRef = useRef(Number(activeChapterId || activeChapter?.id || 0))
  activeChapterIdRef.current = Number(activeChapterId || activeChapter?.id || 0)
  const currentProjectIdRef = useRef(projectId)
  currentProjectIdRef.current = projectId
  const editorRevisionReconciliationRef = useRef<EditorRevisionReconciliationState | null>(null)
  if (!editorRevisionReconciliationRef.current || editorRevisionReconciliationRef.current.projectId !== projectId) {
    if (editorRevisionReconciliationRef.current) {
      invalidateEditorRevisionReconciliationState(editorRevisionReconciliationRef.current)
    }
    editorRevisionReconciliationRef.current = createEditorRevisionReconciliationState(projectId)
  }
  useEffect(() => {
    if (editorRevisionReconciliationRef.current?.controller.signal.aborted) {
      editorRevisionReconciliationRef.current = createEditorRevisionReconciliationState(projectId)
    }
    const mountedState = editorRevisionReconciliationRef.current
    return () => {
      if (mountedState) invalidateEditorRevisionReconciliationState(mountedState)
    }
  }, [projectId])

  const activeChapterIdNumber = Number(activeChapter?.id || 0)
  const activeChapterUpdatedAt = activeChapter?.updated_at || null
  const activeChapterDiagnosticsData = resolveActiveChapterOwnedData(activeChapterDiagnostics, activeChapterIdNumber, activeChapterUpdatedAt)
  const activeContextPackageData = resolveActiveChapterOwnedData(activeChapterContextPackage, activeChapterIdNumber, activeChapterUpdatedAt)
  const modelOptions = useMemo(() => models.map((model: any) => {
    const modelName = String(model.display_name || model.model_name || '未命名模型')
    const providerName = String(model.provider || '未知厂商')
    const fullLabel = `${modelName} · ${providerName}`
    return {
      value: model.id,
      label: (
        <span className="novel-model-option" title={fullLabel}>
          <span className="novel-model-option-name">{modelName}</span>
          <span className="novel-model-option-provider">· {providerName}</span>
        </span>
      ),
    }
  }), [models])
  const activeMemorySummary = useMemo(
    () => resolveActiveMemorySummary(memoryPalaceProjects, projectId),
    [memoryPalaceProjects, projectId],
  )

  useEffect(() => {
    if (!projectId) return
    if (workspaceArea !== 'autoCreation' && workspaceArea !== 'storyPlanning' && workspaceArea !== 'storyAssets') return
    let canceled = false
    apiClient.get(`/novel/projects/${projectId}/settings`)
      .then(res => {
        if (canceled) return
        setProjectSettings(Array.isArray(res.data?.items) ? res.data.items : [])
      })
      .catch(() => {
        if (!canceled) setProjectSettings([])
      })
    return () => {
      canceled = true
    }
  }, [projectId, reviews.length, workspaceArea])

  useEffect(() => {
    if (!projectId) return
    let canceled = false
    apiClient.get('/novel/memory-palace/projects')
      .then(res => {
        if (canceled) return
        setMemoryPalaceProjects(Array.isArray(res.data?.projects) ? res.data.projects : [])
      })
      .catch(() => {
        if (!canceled) setMemoryPalaceProjects([])
      })
    return () => {
      canceled = true
    }
  }, [projectId, runRecords.length, reviews.length, sortedChapters.length])

  const proseQualityReports = useMemo(() => filterReviewsByType(reviews, 'prose_quality'), [reviews])
  const ohStoryReviews = useMemo(() => filterReviewsByType(reviews, 'oh_story_review'), [reviews])
  const editorReports = useMemo(() => filterReviewsByType(reviews, 'editor_report'), [reviews])
  const editorRevisionReports = useMemo(() => filterReviewsByType(reviews, 'editor_revision'), [reviews])
  const bookReviews = useMemo(() => filterReviewsByType(reviews, 'book_review'), [reviews])

  const cancelStepGenerateProse = () => {
    if (!stepProseLoading) return
    proseBatchCancelRef.current = true
    setProseBatchStatus((prev: any) => ({
      ...(prev || {}),
      canceled: true,
      lastError: '已请求停止，当前章节完成后停止后续生成',
    }))
    message.info('已请求停止批量生成，当前章节完成后会停止后续章节')
  }

  // ── auto-save state ──
  const {
    saveStatus,
    scheduleSave,
    flushPendingSave,
    selectChapter,
  } = useChapterAutosave({
    activeChapterId,
    resetKey: projectId,
    setActiveChapterId,
    setChapters,
  })

  const writeJob = useChapterWriteJob({
    apiClient,
    projectId: Number(projectId || 0),
    modelId: Number(selectedModelId || 0),
    flushPendingSave,
    loadProjectModules: async () => {
      await loadProjectModules()
    },
    chapterWordTargetPayload,
  })

  const rewriteJob = useChapterRewriteJob({
    apiClient,
    projectId: Number(projectId || 0),
    modelId: Number(selectedModelId || 0),
    flushPendingSave,
    loadProjectModules: async () => {
      await loadProjectModules()
    },
    chapterWordTargetPayload,
  })

  const continueJob = useProjectContinueJob({
    apiClient,
    projectId: Number(projectId || 0),
    modelId: Number(selectedModelId || 0),
    flushPendingSave,
    loadProjectModules: async () => {
      await loadProjectModules()
    },
    chapterWordTargetPayload,
    isAuthorWriteBusy: () => writeJob.state.phase === 'running'
      || rewriteJob.state.phase === 'running'
      || rewriteJob.state.phase === 'awaiting_selection',
  })

  const writeJobWasRunningRef = useRef(false)
  useEffect(() => {
    if (writeJob.state.phase === 'running') {
      writeJobWasRunningRef.current = true
      setGeneratingProse(true)
      setStreamingProgress(writeJob.state.hint || '正在写本章…')
      return
    }
    if (!writeJobWasRunningRef.current) return
    writeJobWasRunningRef.current = false
    setGeneratingProse(false)
    setStreamingChapterId(null)
    setStreamingPercent(0)
    setStreamingProgress(writeJob.state.phase === 'failed' ? '生成失败' : '')
  }, [writeJob.state, setGeneratingProse, setStreamingChapterId, setStreamingPercent, setStreamingProgress])

  const rewriteJobWasRunningRef = useRef(false)
  useEffect(() => {
    if (rewriteJob.state.phase === 'running') {
      rewriteJobWasRunningRef.current = true
      setGeneratingProse(true)
      setStreamingProgress(rewriteJob.state.hint || '正在写本章…')
      return
    }
    if (!rewriteJobWasRunningRef.current) return
    rewriteJobWasRunningRef.current = false
    setGeneratingProse(false)
    if (rewriteJob.state.phase === 'awaiting_selection') return
    setStreamingChapterId(null)
    setStreamingPercent(0)
    setStreamingProgress(rewriteJob.state.phase === 'failed' ? '生成失败' : '')
  }, [rewriteJob.state, setGeneratingProse, setStreamingChapterId, setStreamingPercent, setStreamingProgress])

  const continueJobWasRunningRef = useRef(false)
  useEffect(() => {
    if (continueJob.state.phase === 'running') {
      continueJobWasRunningRef.current = true
      setGeneratingProse(true)
      if (activeChapter?.id) setStreamingChapterId(activeChapter.id)
      setStreamingProgress(continueJob.state.hint || '正在续写…')
      return
    }
    if (!continueJobWasRunningRef.current) return
    continueJobWasRunningRef.current = false
    setGeneratingProse(false)
    setStreamingChapterId(null)
    setStreamingPercent(0)
    setStreamingProgress(continueJob.state.phase === 'failed' ? '生成失败' : '')
  }, [continueJob.state, activeChapter?.id, setGeneratingProse, setStreamingChapterId, setStreamingPercent, setStreamingProgress])

  const rewriteSelection = rewriteJob.state.phase === 'awaiting_selection'
    ? {
        chapterId: rewriteJob.state.chapterId,
        preview: rewriteJob.state.preview,
        truncated: rewriteJob.state.truncated,
        onCommit: rewriteJob.commit,
        onCancel: rewriteJob.cancel,
      }
    : null

  const onWriteContinue = () => {
    if (!activeChapter) {
      message.warning('请先选择章节')
      return
    }
    const from = firstEmptyChapterNoAfter(sortedChapters, Number(activeChapter.chapter_no || 0))
    if (from == null) {
      message.warning('后面没有空章')
      return
    }
    void continueJob.start({ fromChapterNo: from, count: 2 })
  }

  const onCancelContinue = () => {
    void continueJob.cancel()
  }

  const selectChapterForWriting = async (chapterId: number) => {
    const saved = await selectChapter(chapterId)
    if (saved) setWorkspaceArea('chapterWriting')
    return saved
  }

  const openStoryAssetsWorkspace = (focus?: 'discoveredAssets') => {
    setWorkspaceArea('storyAssets')
    if (focus === 'discoveredAssets') {
      setStoryAssetsFocusDiscoveredToken(prev => prev + 1)
    }
  }

  const {
    activeTasks,
    activeKnowledgeJobCount,
    productionTasks,
    productionTasksLoading,
    loadProductionTasks,
    editorRevisionTasks,
    editorRevisionTasksProjectId,
    cancelEditorRevision,
    retryEditorRevision,
    loadEditorRevisionDiagnostics,
    knowledgeIngestJobs,
    knowledgeJobsLoading,
    loadKnowledgeIngestJobs,
    pauseKnowledgeIngestJob,
    resumeKnowledgeIngestJob,
    cancelKnowledgeIngestJob,
  } = useWorkspaceTasks({
    projectId,
    taskCenterOpen,
    selectedModelId,
    stepOutlineLoading,
    stepProseLoading,
    stepRepairLoading,
    proseProgress,
    proseBatchStatus,
    planning,
    planProgress,
    executingAgents,
    generatingProse,
    streamingProgress,
    streamingPercent,
    activeChapter,
    onCancelProseBatch: cancelStepGenerateProse,
  })
  const rawChapterSourceLocalTaskBusy = Boolean(
    generatingProse
      || stepProseLoading
      || proseQualityLoading
      || editorReportLoading
      || commercialToolLoading === 'storyStateSync',
  )
  const chapterSourceLocalTaskProjectIdRef = useRef(projectId)
  if (!rawChapterSourceLocalTaskBusy) chapterSourceLocalTaskProjectIdRef.current = projectId
  const chapterSourceLocallyBusy = resolveChapterSourceLocallyBusy({
    projectId,
    localTaskProjectId: chapterSourceLocalTaskProjectIdRef.current,
    sourceAuthorityLoading: loading,
    chapterInvocationPending,
    generatingProse,
    stepProseLoading,
    proseQualityLoading,
    editorReportLoading,
    commercialToolLoading,
    editorRevisionTasksProjectId,
    editorRevisionTasks,
  })

  useEffect(() => {
    if (!projectId || workspaceArea !== 'storyPlanning') return
    void loadProductionTasks()
  }, [projectId, workspaceArea, loadProductionTasks])

  const {
    planningWorkspaceModel,
    writingCockpitModel,
    autoCreationDirectorModel,
    serialPipelineModel,
    recentFatigueRollingPlanIntent,
    autoDirectorBusy,
    findReviewById,
    latestCockpitEditorReport,
    latestCockpitQualityReport,
  } = useNovelWorkspaceDomainModels({
    selectedProject,
    outlines,
    sortedChapters,
    activeChapter,
    activeChapterDiagnosticsData,
    commercialReadiness,
    reviews,
    projectSettings,
    productionTasks,
    activeContextPackageData,
    activeTasks,
    runRecords,
    activeMemorySummary,
    selectedModelId,
    styleSampleEffectiveness,
    pipeline,
    projectId,
    setStyleSampleEffectiveness,
    stepProseLoading,
    generatingProse,
    generatingSceneCards,
    diagnosticsLoading,
    contextPackageLoading,
    editorReportLoading,
    proseQualityLoading,
    commercialToolLoading,
    setAutoDirectorActionLoadingKey,
  })

  const {
    loadActiveChapterContextPackage,
  } = useNovelWorkspaceChapterLoads({
    activeChapter,
    projectId,
    selectedProject,
    chapters,
    outlines,
    characters,
    runRecords,
    reviews,
    diagnosticsRequestRef,
    contextPackageRequestRef,
    setActiveChapterDiagnostics,
    setActiveChapterContextPackage,
    setContextPackageLoading,
    setCommercialReadiness,
  })

  // ── diff toggle ──
  const [showOnlyDiff, setShowOnlyDiff] = useState(true)

  /* ── selected chapters (resolved to objects) ────────────────────── */
  const selectedChaptersList = useMemo(() =>
    chapters.filter(ch => selectedChapterIds.has(ch.id)),
    [chapters, selectedChapterIds],
  )

  const {
    chapterVersions,
    chapterVersionsLoading,
    chapterVersionDetail,
    rollingBackVersionId,
    setChapterVersionDetail,
    rollbackChapterVersion,
  } = useChapterVersions({
    activeChapter,
    flushPendingSave,
    reloadProject: loadProjectModules,
  })

  const { confirmReferenceReady } = useReferenceWorkflow({
    projectId,
    referenceSummary,
    onNeedConfig: () => setReferenceConfigOpen(true),
  })

  const coreHandlers = bindNovelWorkspaceCoreHandlers({
    activeChapter,
    activeChapterId,
    agentConfigForm,
    apiClient,
    approvalPolicyForm,
    autoCreationDirectorModel,
    backupImportText,
    getChapterGenerationSourceAuthority,
    getChapterSourceMutationPending,
    claimChapterInvocation,
    chapterInvocationOwnerIsActive,
    releaseChapterInvocation,
    beginChapterSourceOperation,
    assertChapterSourceOperationCurrent,
    chapterHasProse,
    chapterWordTargetPayload,
    chapters,
    characters,
    commercialToolLoading,
    confirmReferenceReady,
    creativeAssistantSelectedText,
    creativeCommandText,
    editorForm,
    editorItem,
    editorKind,
    flushPendingSave,
    formatStoryStateSyncFailure,
    future100Draft,
    future100SelectedNos,
    latestCockpitQualityReport,
    loadProductionTasks,
    loadProjectModules,
    navigate,
    openStoryAssetsWorkspace,
    activeContextPackageData,
    outlines,
    productionMode,
    projectId,
    proseBatchCancelRef,
    reviews,
    rollbackChapterVersion,
    runRecords,
    selectChapterForWriting,
    selectTargetChapterForWriting,
    selectedChapterIds,
    selectedModelId,
    selectedProject,
    setActiveChapterId,
    setAgentExecution,
    setAutoDirectorActionLoadingKey,
    setBackupImportOpen,
    setBackupImportText,
    setChapterGroupExecutingId,
    setChapterVersionDetail,
    setChapters,
    setCommercialReadiness,
    setCommercialToolLoading,
    setContinuityAudit,
    setContinuityAuditLoading,
    setCreativeAssistantError,
    setCreativeAssistantLoading,
    setCreativeAssistantOpen,
    setCreativeAssistantResult,
    setCreativeAssistantSelectedText,
    setCreativeCommandPlan,
    setDashboardLoading,
    setDiagnosticsLoading,
    setEditorItem,
    setEditorKind,
    setEditorReportLoading,
    setExecutingAgents,
    setFuture100ApplyLoading,
    setFuture100Draft,
    setFuture100FocusOutlineIds,
    setFuture100SelectedNos,
    setGeneratingProse,
    setGeneratingSceneCards,
    setGenerationPipeline,
    setIncubatingOriginal,
    setOutlinePanelOpen,
    setOutlineTreeOpen,
    setPipelineLoading,
    setPlanProgress,
    setPlanning,
    setProseBatchStatus,
    setProseProgress,
    setProseQualityLoading,
    setReleaseRepairExecutingId,
    setReviewAnnotationsOpen,
    setRightPanelOpen,
    setRightPanelTab,
    setSelectMode,
    setSelectedChapterIds,
    setSelectedProject,
    setStepOutlineLoading,
    setStepProseLoading,
    setStreamingChapterId,
    setStreamingPercent,
    setStreamingProgress,
    setStreamingText,
    setTaskCenterOpen,
    setBookReviewLoading,
    setStoryStateOpen,
    setStyleSampleCandidateLoading,
    setStyleSampleEffectiveness,
    setStyleSampleEffectivenessLoading,
    setStyleSamplePatchLoadingKey,
    setWorkspaceArea,
    setWritingBibleGenerating,
    setWritingBibleOpen,
    storyStateForm,
    writingBibleForm,
    sortedChapters,
    startKernelWriteChapter: writeJob.start,
    cancelKernelWriteChapter: writeJob.cancel,
    startKernelRewriteChapter: rewriteJob.start,
    cancelKernelRewriteChapter: rewriteJob.cancel,
    unattendedTargetChapter,
    worldbuilding,

  })
  const {
    applyEditorRevision,
    createDeliveryRiskRepairQueue,
    createEditorReport,
    createEditorReportForChapter,
    createFirst30RetentionRepairQueue,
    createReaderTrialRepairQueue,
    createRecoveryEvidenceGovernanceQueue,
    createSafeBatchRiskRepairQueue,
    createScriptRoomRepairQueue,
    createStyleSampleBatchRepairQueue,
    extractStyleSampleCandidates,
    fillDefaultStyleSampleBank,
    generateCurrentChapterProse,
    generateSceneCardsForActiveChapter,
    generateSceneCardsForChapter,
    generateWritingBibleEditor,
    openChapterQualityCard,
    openContinuityAudit,
    openGenerationDiagnostics,
    openLongformProductionTrends,
    openStoryStateEditor,
    openWritingBibleEditor,
    previewStyleSampleAdjustmentBatch,
    previewStyleSampleAdjustmentPatch,
    refreshActiveProseQuality,
    repairContextAndGenerateCurrentChapter,
    reviewStyleSampleAdjustmentPatch,
    runBookReview,
    runRollingPlan,
    saveStoryStateEditor,
    saveWritingBibleEditor,
    stepGenerateProse,
    syncStoryStateForChapter,
    undoStyleSampleAdjustmentPatch,
  } = coreHandlers

  useEffect(() => {
    const reconciliationState = editorRevisionReconciliationRef.current
    if (!reconciliationState || editorRevisionTasksProjectId !== projectId) return
    void reconcileEditorRevisionTasks({
      projectId,
      taskProjectId: editorRevisionTasksProjectId,
      tasks: editorRevisionTasks,
      productionTasks,
      state: reconciliationState,
      activeChapterId: () => activeChapterIdRef.current,
      loadProjectModules,
      setRightPanelOpen,
      setRightPanelTab,
      closeRepairTaskAfterRevision: (task, run, taskIndex, result, options) => (
        coreHandlers.closeRepairTaskAfterRevision(
          task,
          run,
          taskIndex,
          result,
          { projectModules: false, signal: options.signal },
        )
      ),
      acknowledgeLinkedTaskClosure: async (task, signal) => {
        const res = await apiClient.post(`/novel/editor-revisions/${task.id}/linked-task-closure`, {
          project_id: projectId,
        }, { signal })
        if (signal.aborted) throw new DOMException('editor revision reconciliation is stale', 'AbortError')
        const acknowledged = res.data?.run
        if (!isEditorRevisionTask(acknowledged)) throw new Error('invalid linked task closure acknowledgement')
        await loadProductionTasks()
        if (signal.aborted) throw new DOMException('editor revision reconciliation is stale', 'AbortError')
        return acknowledged
      },
      notifyTerminal: terminal => {
        if (terminal.type === 'success') message.success(terminal.text)
        else if (terminal.type === 'warning') message.warning(terminal.text)
        else message.error(terminal.text)
      },
      isCurrent: () => editorRevisionReconciliationRef.current === reconciliationState
        && currentProjectIdRef.current === projectId,
    })
  }, [
    coreHandlers,
    editorRevisionTasks,
    editorRevisionTasksProjectId,
    loadProductionTasks,
    loadProjectModules,
    productionTasks,
    projectId,
    setRightPanelOpen,
    setRightPanelTab,
  ])

  /* ── streaming scroll ──────────────────────────────────────────── */
  useEffect(() => {
    if (streamingChapterId) streamingEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [streamingText, streamingChapterId])

  /* ── render ────────────────────────────────────────────────────── */
  if (loading && !selectedProject) {
    return {
      status: 'loading' as const,
    }
  }

  return {
    status: 'base' as const,
    activeChapter,
    activeChapterDiagnosticsData,
    activeChapterId,
    activeContextPackageData,
    activeKnowledgeJobCount,
    activeTasks,
    agentAuditOpen,
    agentExecution,
    applyEditorRevision,
    autoCreationDirectorModel,
    autoDirectorActionLoadingKey,
    backupImportOpen,
    backupImportText,
    bookReviewLoading,
    bookReviews,
    cancelKnowledgeIngestJob,
    chapterDrawerOpen,
    chapterGroupExecutingId,
    chapterGenerationSourceAuthority,
    chapterInvocationPending,
    chapterSourceLocallyBusy,
    chapterSearch,
    chapterSortMode,
    chapterStatusFilter,
    chapterTargetWordCount,
    writingSkillsEnabled,
    writingSkillsCatalog,
    fictionHumanizerMode,
    chapterTreeData,
    chapterVersionDetail,
    chapterVersions,
    chapterVersionsLoading,
    chapterWordTargetMode,
    chapters,
    characters,
    commercialReadiness,
    commercialToolLoading,
    commercialToolsOpen,
    consistencyGraphOpen,
    contextPackage: activeContextPackageData,
    contextPackageLoading,
    continuityAudit,
    continuityAuditLoading,
    coreHandlers,
    createDeliveryRiskRepairQueue,
    createEditorReport,
    createEditorReportForChapter,
    createFirst30RetentionRepairQueue,
    createReaderTrialRepairQueue,
    createRecoveryEvidenceGovernanceQueue,
    createSafeBatchRiskRepairQueue,
    createScriptRoomRepairQueue,
    createStyleSampleBatchRepairQueue,
    creativeAssistantError,
    creativeAssistantLoading,
    creativeAssistantMode,
    creativeAssistantOpen,
    creativeAssistantResult,
    creativeAssistantSelectedText,
    creativeCardsOpen,
    creativeCommandOpen,
    creativeCommandPlan,
    creativeCommandText,
    dashboardLoading,
    diagnosticsLoading,
    directoryCollapsed,
    directoryShellClassName,
    editorForm,
    editorKind,
    editorReportLoading,
    editorReports,
    editorRevisionTasks,
    editorRevisionTasksProjectId,
    cancelEditorRevision,
    retryEditorRevision,
    loadEditorRevisionDiagnostics,
    editorRevisionReports,
    exportDeliveryOpen,
    extractStyleSampleCandidates,
    fillDefaultStyleSampleBank,
    filteredChapters,
    flushPendingSave,
    future100ApplyLoading,
    future100Draft,
    future100SelectedNos,
    future100FocusOutlineIds,
    generateCurrentChapterProse,
    generateSceneCardsForActiveChapter,
    generateSceneCardsForChapter,
    generateWritingBibleEditor,
    generatingProse,
    rewriteSelection,
    onWriteContinue,
    onCancelContinue,
    continueJob,
    generatingSceneCards,
    generationPipeline,
    handleDirectoryCollapsedChange,
    id,
    incubatingOriginal,
    isEmptyProject,
    isImmersiveShell,
    knowledgeIngestJobs,
    knowledgeJobsLoading,
    loadKnowledgeIngestJobs,
    loadProductionTasks,
    loading,
    loadProjectModules,
    modelOptions,
    navigate,
    openChapterQualityCard,
    openContinuityAudit,
    openGenerationDiagnostics,
    openLongformProductionTrends,
    openStoryAssetsWorkspace,
    openStoryStateEditor,
    openWritingBibleEditor,
    outlinePanelOpen,
    outlineTreeOpen,
    outlines,
    pauseKnowledgeIngestJob,
    pipelineLoading,
    planning,
    planningWorkspaceModel,
    previewStyleSampleAdjustmentBatch,
    previewStyleSampleAdjustmentPatch,
    productionMode,
    productionModeOptions,
    productionTasks,
    productionTasksLoading,
    projectId,
    projectSettings,
    proseChapters,
    proseEditorRef,
    proseProgress,
    proseQualityLoading,
    proseQualityReports,
    ohStoryReviews,
    qualityBenchmarkOpen,
    recentFatigueRollingPlanIntent,
    referenceConfigOpen,
    referenceEngineeringOpen,
    referenceReports,
    referenceSummary,
    refreshActiveProseQuality,
    releaseRepairExecutingId,
    repairContextAndGenerateCurrentChapter,
    restructurePanelOpen,
    resumeKnowledgeIngestJob,
    reviewAnnotationsOpen,
    reviewStyleSampleAdjustmentPatch,
    reviews,
    rightPanelOpen,
    rightPanelTab,
    rollbackChapterVersion,
    rollingBackVersionId,
    runBookReview,
    runRecords,
    runRollingPlan,
    saveStatus,
    saveStoryStateEditor,
    saveWritingBibleEditor,
    scheduleSave,
    selectChapterForWriting,
    selectMode,
    selectedChapterIds,
    selectedChaptersList,
    selectedModelId,
    selectedProject,
    serialPipelineModel,
    setAgentAuditOpen,
    setAgentExecution,
    setAutoDirectorActionLoadingKey,
    setBackupImportOpen,
    setBackupImportText,
    setChapterDrawerOpen,
    setChapterSearch,
    setChapterSortMode,
    setChapterStatusFilter,
    setChapterTargetWordCount,
    setChapterVersionDetail,
    setChapterWordTargetMode,
    setWritingSkillsEnabled,
    setWritingSkillsCatalog,
    setFictionHumanizerMode,
    setChapters,
    setCommercialToolsOpen,
    setConsistencyGraphOpen,
    setCreativeAssistantMode,
    setCreativeAssistantOpen,
    setCreativeCardsOpen,
    setCreativeCommandOpen,
    setCreativeCommandText,
    setEditorItem,
    setEditorKind,
    setExportDeliveryOpen,
    setFuture100Draft,
    setFuture100FocusOutlineIds,
    setFuture100SelectedNos,
    setOutlinePanelOpen,
    setOutlineTreeOpen,
    setProductionMode,
    setQualityBenchmarkOpen,
    setReferenceConfigOpen,
    setReferenceEngineeringOpen,
    setRestructurePanelOpen,
    setReviewAnnotationsOpen,
    setRightPanelOpen,
    setRightPanelTab,
    setSelectMode,
    setSelectedChapterIds,
    setChapterGenerationSourceAuthority,
    chapterSourcePendingState,
    setChapterSourceMutationPending,
    setSelectedModelId,
    setSelectedProject,
    setShellMode,
    setShowOnlyDiff,
    setStoryStateOpen,
    setTaskCenterOpen,
    setTaskCenterRecoveryFocus,
    setUnattendedTargetChapter,
    setWorkspaceArea,
    setWritingBibleOpen,
    showGlobalWritingGuidance,
    showOnlyDiff,
    sortedChapters,
    stepGenerateProse,
    stepProseLoading,
    beginChapterSourceOperation,
    assertChapterSourceOperationCurrent,
    claimChapterInvocation,
    chapterInvocationOwnerIsActive,
    releaseChapterInvocation,
    storyAssetsFocusDiscoveredToken,
    storyStateForm,
    storyStateOpen,
    streamingChapterId,
    streamingEndRef,
    streamingPercent,
    streamingProgress,
    streamingText,
    styleSampleCandidateLoading,
    styleSampleEffectiveness,
    styleSampleEffectivenessItems,
    styleSampleEffectivenessLoading,
    styleSamplePatchLoadingKey,
    syncStoryStateForChapter,
    taskCenterOpen,
    taskCenterRecoveryFocus,
    unattendedTargetChapter,
    undoStyleSampleAdjustmentPatch,
    workspaceArea,
    worldbuilding,
    writingBibleForm,
    writingBibleGenerating,
    writingBibleOpen,
    latestCockpitEditorReport,
    loadActiveChapterContextPackage,
    refreshProseQualityForChapter: coreHandlers.refreshProseQualityForChapter,
    openChapterQualityCardForChapter: coreHandlers.openChapterQualityCardForChapter,
    openMaterialRepairPlan: coreHandlers.openMaterialRepairPlan,
    writingCockpitModel,
  }
}
